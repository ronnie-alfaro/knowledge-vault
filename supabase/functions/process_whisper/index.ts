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
  reason: string;
  sources: string[];
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

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data, error } = await serviceClient.rpc("get_llm_runtime_config", { target_user_id: userData.user.id });
    if (error) throw error;

    const config = (data?.[0] ?? null) as RuntimeConfig | null;
    if (!config?.api_key) return json({ error: "Configure an LLM provider before using Whisper Notes." }, 400);

    const context = await loadVaultContext(serviceClient, userData.user.id);
    if (context.notes.length < 2) return json({ error: "Create at least two notes before generating Whisper Notes." }, 400);

    const suggestions = await generateWhisperSuggestions(config, context);
    return json({ suggestions });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});

async function loadVaultContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("id,title,content,updated_at,favorite")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (notesError) throw notesError;

  const { data: nodes, error: nodesError } = await supabase
    .from("knowledge_nodes")
    .select("id,title,type,description")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (nodesError) throw nodesError;

  const { data: relations, error: relationsError } = await supabase
    .from("node_relations")
    .select("relation_type,description,source_node_id,target_node_id")
    .eq("user_id", userId)
    .limit(40);
  if (relationsError) throw relationsError;

  const nodeTitles = new Map((nodes ?? []).map((node) => [node.id, node.title]));

  return {
    notes: (notes ?? []).map((note) => ({
      title: note.title,
      preview: stripHtml(note.content).slice(0, 900),
      updated_at: note.updated_at,
      favorite: note.favorite
    })),
    nodes: (nodes ?? []).map((node) => ({ title: node.title, type: node.type, description: node.description })),
    relations: (relations ?? []).map((relation) => ({
      source: nodeTitles.get(relation.source_node_id) ?? relation.source_node_id,
      target: nodeTitles.get(relation.target_node_id) ?? relation.target_node_id,
      relation_type: relation.relation_type,
      description: relation.description
    }))
  };
}

async function generateWhisperSuggestions(config: RuntimeConfig, context: Awaited<ReturnType<typeof loadVaultContext>>) {
  const prompt = buildPrompt(context);
  const text = await complete(config, prompt);
  return normalizeSuggestions(parseJson(text));
}

function buildPrompt(context: Awaited<ReturnType<typeof loadVaultContext>>) {
  return `You are Knowledge Vault's Whisper Notes processor.
The user wants "Whisper Notes": short, useful note ideas that emerge from patterns, gaps, and connections inside their existing vault.

Analyze the user's recent notes, knowledge nodes, and graph relations.
Suggest 4 to 6 possible new notes the user may want to create.
Each suggestion should feel specific to the vault, not generic.

Return only valid JSON with this shape:
{
  "suggestions": [
    {
      "title": "note title",
      "summary": "why this note is worth creating",
      "reason": "which existing notes/concepts made this suggestion appear",
      "content": "starter note body in simple HTML using p, ul, li, strong only",
      "tags": ["short-tag"],
      "sources": ["existing note or concept title"]
    }
  ]
}

Recent notes:
${JSON.stringify(context.notes)}

Knowledge nodes:
${JSON.stringify(context.nodes)}

Graph relations:
${JSON.stringify(context.relations)}`;
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

function normalizeSuggestions(value: { suggestions?: Array<Partial<WhisperResult>> }) {
  const suggestions = Array.isArray(value.suggestions) ? value.suggestions : [];
  return suggestions.slice(0, 8).map((suggestion, index) => ({
    id: `${Date.now()}-${index}`,
    title: stringOr(suggestion.title, "Untitled whisper").slice(0, 120),
    content: sanitizeHtml(stringOr(suggestion.content, "<p>Start this note from the suggested connection.</p>")),
    summary: stringOr(suggestion.summary, "").slice(0, 280),
    reason: stringOr(suggestion.reason, "").slice(0, 360),
    tags: arrayOfStrings(suggestion.tags).slice(0, 8),
    sources: arrayOfStrings(suggestion.sources).slice(0, 6)
  }));
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

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
