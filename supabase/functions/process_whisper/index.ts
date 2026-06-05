import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type LlmProvider = "openai" | "anthropic" | "gemini";

type RuntimeConfig = {
  provider: LlmProvider;
  model: string | null;
  api_key: string;
};

type WhisperResult = {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  concepts: Array<{ title: string; type: string; description: string }>;
  relations: Array<{ title: string; reason: string; relation_type: string }>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("Not authenticated");

    const { whisper } = await req.json() as { whisper?: string };
    const rawThought = whisper?.trim();
    if (!rawThought) throw new Error("Whisper text is required");

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data, error } = await serviceClient.rpc("get_llm_runtime_config", { target_user_id: userData.user.id });
    if (error) throw error;

    const config = (data?.[0] ?? null) as RuntimeConfig | null;
    if (!config?.api_key) return json({ error: "Configure an LLM provider before using Whisper Notes." }, 400);

    const result = await processWhisper(config, rawThought);
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});

async function processWhisper(config: RuntimeConfig, whisper: string) {
  const prompt = buildPrompt(whisper);
  const text = await complete(config, prompt);
  return normalizeResult(parseJson(text), whisper);
}

function buildPrompt(whisper: string) {
  return `You are Knowledge Vault's Whisper Notes processor.
Turn a raw captured thought into a useful personal knowledge note.
Return only valid JSON with this shape:
{
  "title": "short useful title",
  "content": "clean note body in simple HTML using p, ul, li, strong only",
  "summary": "one sentence summary",
  "tags": ["short-tag"],
  "concepts": [{"title":"Concept name","type":"concept|idea|question|project|person|book|article|place|event","description":"short description"}],
  "relations": [{"title":"possible related note or concept","relation_type":"related_to|supports|contradicts|expands|asks|answers","reason":"why it may connect"}]
}

Raw whisper:
${whisper}`;
}

async function complete(config: RuntimeConfig, prompt: string) {
  switch (config.provider) {
    case "openai":
      return completeOpenAI(config.api_key, config.model || "gpt-4.1-mini", prompt);
    case "anthropic":
      return completeAnthropic(config.api_key, config.model || "claude-3-5-haiku-latest", prompt);
    case "gemini":
      return completeGemini(config.api_key, config.model || "models/gemini-1.5-pro", prompt);
    default:
      throw new Error("Unsupported provider");
  }
}

async function completeOpenAI(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 900
    })
  });
  await assertOk(response, "OpenAI");
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  return data.output_text ?? data.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("\n") ?? "";
}

async function completeAnthropic(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: "user", content: prompt }] })
  });
  await assertOk(response, "Anthropic");
  const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
  return data.content?.map((item) => item.text ?? "").join("\n") ?? "";
}

async function completeGemini(apiKey: string, model: string, prompt: string) {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 900, responseMimeType: "application/json" }
    })
  });
  await assertOk(response, "Gemini");
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("LLM did not return valid JSON");
  }
}

function normalizeResult(value: Partial<WhisperResult>, fallback: string): WhisperResult {
  return {
    title: stringOr(value.title, "Untitled whisper").slice(0, 120),
    content: sanitizeHtml(stringOr(value.content, `<p>${escapeHtml(fallback)}</p>`)),
    summary: stringOr(value.summary, "").slice(0, 280),
    tags: arrayOfStrings(value.tags).slice(0, 8),
    concepts: Array.isArray(value.concepts) ? value.concepts.slice(0, 6).map((concept) => ({
      title: stringOr(concept?.title, "Untitled concept").slice(0, 80),
      type: stringOr(concept?.type, "concept").slice(0, 32),
      description: stringOr(concept?.description, "").slice(0, 220)
    })) : [],
    relations: Array.isArray(value.relations) ? value.relations.slice(0, 6).map((relation) => ({
      title: stringOr(relation?.title, "Related idea").slice(0, 100),
      relation_type: stringOr(relation?.relation_type, "related_to").slice(0, 32),
      reason: stringOr(relation?.reason, "").slice(0, 220)
    })) : []
  };
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sanitizeHtml(html: string) {
  return html
    .replace(/<(?!\/?(p|ul|li|strong|em|br)\b)[^>]*>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function assertOk(response: Response, provider: string) {
  if (response.ok) return;
  const text = await response.text();
  throw new Error(`${provider} request failed (${response.status}): ${summarizeProviderError(text)}`);
}

function summarizeProviderError(text: string) {
  if (!text) return "No response body";
  try {
    const data = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof data.error === "string") return data.error;
    return data.error?.message ?? data.message ?? text.slice(0, 240);
  } catch {
    return text.slice(0, 240);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
