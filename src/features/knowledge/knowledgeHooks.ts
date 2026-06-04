import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";
import type { KnowledgeNode, KnowledgeNodeType, NodeNoteLink, NodeRelation, Note, RelationType } from "../../shared/lib/database.types";
import { reportEmbeddingError, upsertNodeEmbedding } from "../semantic/semanticServices";

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function createKnowledgeNode(input: { title: string; type: KnowledgeNodeType; description?: string | null; source_note_id?: string | null }) {
  const userId = await requireUserId();
  const title = input.title.trim();
  if (!title) throw new Error("Node title is required");
  const { data, error } = await supabase
    .from("knowledge_nodes")
    .insert({ title, type: input.type, description: input.description?.trim() || null, source_note_id: input.source_note_id ?? null, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  upsertNodeEmbedding(data as KnowledgeNode).catch(reportEmbeddingError);
  return data as KnowledgeNode;
}

export async function updateKnowledgeNode(nodeId: string, patch: Partial<Pick<KnowledgeNode, "title" | "type" | "description" | "metadata">>) {
  await requireUserId();
  const next = { ...patch, title: patch.title?.trim(), updated_at: new Date().toISOString() };
  if (next.title !== undefined && !next.title) throw new Error("Node title is required");
  const { data, error } = await supabase.from("knowledge_nodes").update(next).eq("id", nodeId).select().single();
  if (error) throw error;
  upsertNodeEmbedding(data as KnowledgeNode).catch(reportEmbeddingError);
  return data as KnowledgeNode;
}

export async function deleteKnowledgeNode(nodeId: string) {
  await requireUserId();
  const { error } = await supabase.from("knowledge_nodes").delete().eq("id", nodeId);
  if (error) throw error;
}

export async function getKnowledgeNodes(type?: KnowledgeNodeType | "") {
  await requireUserId();
  let request = supabase.from("knowledge_nodes").select("*").order("updated_at", { ascending: false });
  if (type) request = request.eq("type", type);
  const { data, error } = await request;
  if (error) throw error;
  return data as KnowledgeNode[];
}

export async function getKnowledgeNodeById(nodeId: string) {
  await requireUserId();
  const { data, error } = await supabase.from("knowledge_nodes").select("*").eq("id", nodeId).single();
  if (error) throw error;
  return data as KnowledgeNode;
}

export async function createNodeRelation(input: { source_node_id: string; target_node_id: string; relation_type: RelationType; strength?: number; description?: string | null }) {
  const userId = await requireUserId();
  if (!input.source_node_id || !input.target_node_id) throw new Error("Source and target nodes are required");
  if (input.source_node_id === input.target_node_id) throw new Error("Choose two different nodes");
  const { data, error } = await supabase
    .from("node_relations")
    .insert({ ...input, description: input.description?.trim() || null, strength: input.strength ?? 1, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as NodeRelation;
}

export async function deleteNodeRelation(relationId: string) {
  await requireUserId();
  const { error } = await supabase.from("node_relations").delete().eq("id", relationId);
  if (error) throw error;
}

export async function getRelationsForNode(nodeId: string) {
  await requireUserId();
  const { data, error } = await supabase.from("node_relations").select("*").or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`).order("created_at", { ascending: false });
  if (error) throw error;
  return data as NodeRelation[];
}

export async function getNodeRelations() {
  await requireUserId();
  const { data, error } = await supabase.from("node_relations").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as NodeRelation[];
}

export async function linkNodeToNote(input: { node_id: string; note_id: string; link_type?: string }) {
  const userId = await requireUserId();
  if (!input.node_id || !input.note_id) throw new Error("Node and note are required");
  const { data, error } = await supabase
    .from("node_note_links")
    .insert({ node_id: input.node_id, note_id: input.note_id, link_type: input.link_type ?? "mentions", user_id: userId })
    .select()
    .single();
  if (error && error.code !== "23505") throw error;
  return data as NodeNoteLink | null;
}

export async function unlinkNodeFromNote(linkId: string) {
  await requireUserId();
  const { error } = await supabase.from("node_note_links").delete().eq("id", linkId);
  if (error) throw error;
}

export async function getNodesForNote(noteId: string) {
  await requireUserId();
  const { data, error } = await supabase
    .from("node_note_links")
    .select("*, knowledge_nodes(*)")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Array<NodeNoteLink & { knowledge_nodes: KnowledgeNode | null }>;
}

export async function getNoteLinksForNode(nodeId: string) {
  await requireUserId();
  const { data, error } = await supabase
    .from("node_note_links")
    .select("*")
    .eq("node_id", nodeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as NodeNoteLink[];
}

export async function getLinkedNotesForNode(nodeId: string) {
  const links = await getNoteLinksForNode(nodeId);
  if (links.length === 0) return [];
  const { data, error } = await supabase.from("notes").select("id,title,updated_at").in("id", links.map((link) => link.note_id));
  if (error) throw error;
  const notesById = new Map((data as Pick<Note, "id" | "title" | "updated_at">[]).map((note) => [note.id, note]));
  return links.map((link) => ({ ...link, note: notesById.get(link.note_id) ?? null }));
}

export function useKnowledgeNodes(type?: KnowledgeNodeType | "") {
  return useQuery({ queryKey: ["knowledge-nodes", type ?? ""], queryFn: () => getKnowledgeNodes(type) });
}

export function useKnowledgeNode(nodeId?: string) {
  return useQuery({ queryKey: ["knowledge-node", nodeId], enabled: Boolean(nodeId), queryFn: () => getKnowledgeNodeById(nodeId!) });
}

export function useRelationsForNode(nodeId?: string) {
  return useQuery({ queryKey: ["node-relations", nodeId], enabled: Boolean(nodeId), queryFn: () => getRelationsForNode(nodeId!) });
}

export function useNodeRelations() {
  return useQuery({ queryKey: ["node-relations"], queryFn: getNodeRelations });
}

export function useNodesForNote(noteId?: string) {
  return useQuery({ queryKey: ["note-nodes", noteId], enabled: Boolean(noteId), queryFn: () => getNodesForNote(noteId!) });
}

export function useNoteLinksForNode(nodeId?: string) {
  return useQuery({ queryKey: ["node-note-links", nodeId], enabled: Boolean(nodeId), queryFn: () => getLinkedNotesForNode(nodeId!) });
}

export function useCreateKnowledgeNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKnowledgeNode,
    onSuccess: (_node, input) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-nodes"] });
      if (input.source_note_id) queryClient.invalidateQueries({ queryKey: ["note-nodes", input.source_note_id] });
    }
  });
}

export function useLinkNodeToNote(noteId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkNodeToNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-nodes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["node-note-links"] });
    }
  });
}

export function useUnlinkNodeFromNote(noteId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlinkNodeFromNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-nodes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["node-note-links"] });
    }
  });
}

export function useCreateNodeRelation(selectedNodeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNodeRelation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["node-relations"] });
      queryClient.invalidateQueries({ queryKey: ["node-relations", selectedNodeId] });
    }
  });
}
