import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type LlmProvider = "openai" | "anthropic" | "gemini";

type RuntimeConfig = {
  provider: LlmProvider;
  model: string | null;
  api_key: string;
};

type RequestBody = {
  action?: "check" | "listModels";
};

type LlmModel = {
  id: string;
  label: string;
  description?: string;
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
    if (!config?.api_key) return json({ online: false, status: "missing_key", message: "Check LLM Config: API key is missing." }, 400);

    const body = await readBody(req);
    if (body.action === "listModels") {
      return json({ provider: config.provider, models: await listProviderModels(config) });
    }

    const result = await checkProvider(config);
    return json({ online: true, status: "online", message: "LLM Online", provider: config.provider, model: result.model });
  } catch (error) {
    return json({ online: false, status: "offline", message: `Check LLM Config: ${error instanceof Error ? error.message : "Unexpected error"}` }, 400);
  }
});

async function readBody(req: Request): Promise<RequestBody> {
  try {
    return await req.json() as RequestBody;
  } catch {
    return {};
  }
}

async function checkProvider(config: RuntimeConfig) {
  switch (config.provider) {
    case "openai":
      return checkOpenAI(config.api_key, config.model || "gpt-4.1-mini");
    case "anthropic":
      return checkAnthropic(config.api_key, config.model || "claude-3-5-haiku-latest");
    case "gemini":
      return checkGemini(config.api_key, config.model || "gemini-1.5-flash");
    default:
      throw new Error("Unsupported provider");
  }
}

async function checkOpenAI(apiKey: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: "Reply with ok.", max_output_tokens: 8 })
  });
  await assertOk(response, "OpenAI");
  return { model };
}

async function checkAnthropic(apiKey: string, model: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "Reply with ok." }] })
  });
  await assertOk(response, "Anthropic");
  return { model };
}

async function checkGemini(apiKey: string, model: string) {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with ok." }] }], generationConfig: { maxOutputTokens: 8 } })
  });
  await assertOk(response, "Gemini");
  return { model };
}

async function listProviderModels(config: RuntimeConfig): Promise<LlmModel[]> {
  switch (config.provider) {
    case "openai":
      return listOpenAIModels(config.api_key);
    case "anthropic":
      return listAnthropicModels(config.api_key);
    case "gemini":
      return listGeminiModels(config.api_key);
    default:
      throw new Error("Unsupported provider");
  }
}

async function listOpenAIModels(apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  await assertOk(response, "OpenAI models");
  const data = await response.json() as { data: Array<{ id: string }> };
  return data.data
    .map((model) => model.id)
    .filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id))
    .sort()
    .map((id) => ({ id, label: id }));
}

async function listAnthropicModels(apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
  });
  await assertOk(response, "Anthropic models");
  const data = await response.json() as { data?: Array<{ id: string; display_name?: string }> };
  return (data.data ?? [])
    .map((model) => ({ id: model.id, label: model.display_name ?? model.id }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function listGeminiModels(apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  await assertOk(response, "Gemini models");
  const data = await response.json() as {
    models?: Array<{ name: string; displayName?: string; description?: string; supportedGenerationMethods?: string[] }>;
  };
  return (data.models ?? [])
    .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model) => ({
      id: model.name,
      label: model.displayName ? `${model.displayName} (${model.name})` : model.name,
      description: model.description
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function assertOk(response: Response, provider: string) {
  if (response.ok) return;
  const text = await response.text();
  throw new Error(`${provider} check failed (${response.status}): ${summarizeProviderError(text)}`);
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
