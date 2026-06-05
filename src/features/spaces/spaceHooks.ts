import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";
import type { Space } from "../../shared/lib/database.types";

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getSpaces() {
  await requireUserId();
  const { data, error } = await supabase.from("spaces").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data as Space[];
}

export async function ensureInboxSpace() {
  const userId = await requireUserId();
  const { data: existing, error: existingError } = await supabase
    .from("spaces")
    .select("*")
    .eq("user_id", userId)
    .is("parent_id", null)
    .ilike("name", "Inbox")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing as Space;

  const { data, error } = await supabase
    .from("spaces")
    .insert({ user_id: userId, name: "Inbox", icon: "inbox", color: "#0f766e", sort_order: 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Space;
}

export async function createSpace(input: { name: string; parent_id?: string | null; color?: string; icon?: string }) {
  await requireUserId();
  const name = input.name.trim();
  if (!name) throw new Error("Space name is required");
  const { data, error } = await supabase.rpc("create_space", {
    space_name: name,
    parent_space_id: input.parent_id ?? null,
    space_color: input.color ?? "#0f766e",
    space_icon: input.icon ?? "folder"
  });
  if (error) throw error;
  return data as Space;
}

export async function getSpacesForNote(noteId: string) {
  await requireUserId();
  const { data, error } = await supabase
    .from("note_spaces")
    .select("*, spaces(*)")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Array<{ note_id: string; space_id: string; user_id: string; created_at: string; spaces: Space | null }>;
}

export async function addNoteToSpace(input: { note_id: string; space_id: string }) {
  const userId = await requireUserId();
  const { error } = await supabase.from("note_spaces").insert({ ...input, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function removeNoteFromSpace(input: { note_id: string; space_id: string }) {
  await requireUserId();
  const { error } = await supabase.from("note_spaces").delete().eq("note_id", input.note_id).eq("space_id", input.space_id);
  if (error) throw error;
}

export function useSpaces() {
  return useQuery({ queryKey: ["spaces"], queryFn: getSpaces });
}

export function useSpacesForNote(noteId?: string) {
  return useQuery({ queryKey: ["note-spaces", noteId], enabled: Boolean(noteId), queryFn: () => getSpacesForNote(noteId!) });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSpace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces"] })
  });
}

export function useAddNoteToSpace(noteId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addNoteToSpace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-spaces", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    }
  });
}

export function useRemoveNoteFromSpace(noteId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeNoteFromSpace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-spaces", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    }
  });
}
