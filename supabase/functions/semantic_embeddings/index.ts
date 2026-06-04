import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const EMBEDDING_MODEL = "text-embedding-3-small";

type SourceType = "note" | "node";

type RequestBody =
  | { action: "generateEmbedding"; text: string }
  | { action: "upsertEmbedding"; source_type: SourceType; source_id: string; content: string }
  | { action: "findSimilarNotes"; note_id: string; limit?: number }
  | { action: "findSimilarNodes"; node_id: string; limit?: number }
  | { action: "semanticSearch"; query: string; limit?: number }
  | { action: "getSuggestedConnections"; threshold?: number; limit?: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const body = await req.json() as RequestBody;
    switch (body.action) {
      case "upsertEmbedding":
        return json(await upsertEmbedding(supabase, body.source_type, body.source_id, body.content));
      case "generateEmbedding":
        return json({ embedding: await generateEmbedding(body.text) });
      case "findSimilarNotes":
        return json(await rpc(supabase, "match_similar_notes", { target_note_id: body.note_id, match_count: body.limit ?? 10 }));
      case "findSimilarNodes":
        return json(await rpc(supabase, "match_similar_nodes", { target_node_id: body.node_id, match_count: body.limit ?? 10 }));
      case "semanticSearch":
        return json(await semanticSearch(supabase, body.query, body.limit ?? 20));
      case "getSuggestedConnections":
        return json(await rpc(supabase, "suggested_node_connections", { similarity_threshold: body.threshold ?? 0.85, match_count: body.limit ?? 30 }));
      default:
        return json({ error: "Unsupported action" }, 400);
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});

async function upsertEmbedding(supabase: ReturnType<typeof createClient>, sourceType: SourceType, sourceId: string, content: string) {
  const normalized = normalizeContent(content);
  const contentHash = await sha256(normalized);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not authenticated");

  const { data: existing, error: existingError } = await supabase
    .from("content_embeddings")
    .select("id, content_hash")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.content_hash === contentHash) return { skipped: true, source_type: sourceType, source_id: sourceId };

  await assertSourceOwnership(supabase, sourceType, sourceId);
  const embedding = await generateEmbedding(normalized);
  const { data, error } = await supabase
    .from("content_embeddings")
    .upsert({
      user_id: userData.user.id,
      source_type: sourceType,
      source_id: sourceId,
      content: normalized,
      content_hash: contentHash,
      embedding: vectorLiteral(embedding),
      embedding_model: EMBEDDING_MODEL,
      updated_at: new Date().toISOString()
    }, { onConflict: "source_type,source_id" })
    .select("id, source_type, source_id, content_hash, embedding_model, updated_at")
    .single();
  if (error) throw error;
  return { skipped: false, embedding: data };
}

async function semanticSearch(supabase: ReturnType<typeof createClient>, query: string, limit: number) {
  const embedding = await generateEmbedding(query);
  return rpc(supabase, "semantic_search_content", { query_embedding: vectorLiteral(embedding), match_count: limit });
}

async function rpc(supabase: ReturnType<typeof createClient>, name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function assertSourceOwnership(supabase: ReturnType<typeof createClient>, sourceType: SourceType, sourceId: string) {
  const table = sourceType === "note" ? "notes" : "knowledge_nodes";
  const { data, error } = await supabase.from(table).select("id").eq("id", sourceId).single();
  if (error || !data) throw error ?? new Error("Source not found");
}

export async function generateEmbedding(text: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text })
  });
  if (!response.ok) throw new Error(`OpenAI embeddings request failed: ${await response.text()}`);
  const data = await response.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

function normalizeContent(content: string) {
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 24_000);
}

function vectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
