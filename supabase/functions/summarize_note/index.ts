import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SummaryResult = { summary: string; keywords: string[]; suggested_tags: string[] };
type Provider = { summarize(content: string): Promise<SummaryResult> };

class LocalHeuristicProvider implements Provider {
  async summarize(content: string): Promise<SummaryResult> {
    const words = content.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
    const frequencies = new Map<string, number>();
    for (const word of words) frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    const keywords = [...frequencies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
    const sentences = content.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
    return {
      summary: sentences.slice(0, 3).join(" ") || content.slice(0, 280),
      keywords,
      suggested_tags: keywords.slice(0, 5)
    };
  }
}

function getProvider(): Provider {
  return new LocalHeuristicProvider();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const { note_id, content } = await req.json();
    if (!note_id || typeof content !== "string") throw new Error("note_id and content are required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: note, error: noteError } = await supabase.from("notes").select("id").eq("id", note_id).single();
    if (noteError || !note) throw noteError ?? new Error("Note not found");

    const result = await getProvider().summarize(content);
    const { error } = await supabase.from("note_ai_metadata").upsert({
      note_id,
      summary: result.summary,
      keywords: result.keywords,
      suggested_tags: result.suggested_tags,
      generated_at: new Date().toISOString()
    });
    if (error) throw error;

    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
