import { supabase } from "../../shared/lib/supabase";
import { stripHtml } from "../../shared/lib/utils";
import type { RelatedNode, RelatedNote, SemanticSearchResult, SuggestedConnection } from "./semanticTypes";

type SourceType = "note" | "node";

async function invokeSemantic<T>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("semantic_embeddings", { body });
  if (error) {
    const context = "context" in error ? error.context : undefined;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string; message?: string };
        throw new Error(payload.error ?? payload.message ?? error.message);
      } catch {
        throw error;
      }
    }
    throw error;
  }
  return data as T;
}

export async function generateEmbedding(text: string) {
  return invokeSemantic<{ embedding: number[] }>({ action: "generateEmbedding", text });
}

export async function upsertEmbedding(input: { source_type: SourceType; source_id: string; content: string }) {
  return invokeSemantic<{ skipped: boolean }>({ action: "upsertEmbedding", ...input });
}

export async function upsertNoteEmbedding(note: { id: string; title: string; content: string }) {
  const content = `${note.title}\n\n${stripHtml(note.content)}`;
  if (!content.trim()) return;
  return upsertEmbedding({ source_type: "note", source_id: note.id, content });
}

export async function upsertNodeEmbedding(node: { id: string; title: string; type: string; description: string | null }) {
  const content = `${node.title}\n${node.type}\n${node.description ?? ""}`;
  if (!content.trim()) return;
  return upsertEmbedding({ source_type: "node", source_id: node.id, content });
}

export async function findSimilarNotes(noteId: string, limit = 10) {
  return invokeSemantic<RelatedNote[]>({ action: "findSimilarNotes", note_id: noteId, limit });
}

export async function findSimilarNodes(nodeId: string, limit = 10) {
  return invokeSemantic<RelatedNode[]>({ action: "findSimilarNodes", node_id: nodeId, limit });
}

export async function semanticSearch(query: string, limit = 20) {
  return invokeSemantic<SemanticSearchResult[]>({ action: "semanticSearch", query, limit });
}

export async function getSuggestedConnections(threshold = 0.85, limit = 30) {
  return invokeSemantic<SuggestedConnection[]>({ action: "getSuggestedConnections", threshold, limit });
}

export function reportEmbeddingError(error: unknown) {
  console.warn("Embedding sync failed", error);
}
