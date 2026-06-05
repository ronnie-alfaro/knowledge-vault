import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";
import type { Note } from "../../shared/lib/database.types";
import { ensureInboxSpace } from "../spaces/spaceHooks";
import { reportEmbeddingError, upsertNoteEmbedding } from "../semantic/semanticServices";

export function useNotes(params: { query?: string; tagId?: string; spaceId?: string; archived?: boolean }) {
  return useQuery({
    queryKey: ["notes", params],
    queryFn: async () => {
      if (params.query || params.tagId || params.spaceId) {
        const { data, error } = await supabase.rpc("search_notes", {
          search_query: params.query ?? "",
          tag_filter: params.tagId ?? null,
          space_filter: params.spaceId ?? null,
          include_archived: params.archived ?? false
        });
        if (error) throw error;
        return data;
      }
      const request = supabase.from("notes").select("*").eq("archived", params.archived ?? false).order("updated_at", { ascending: false });
      const { data, error } = await request;
      if (error) throw error;
      return data as Note[];
    }
  });
}

export function useNote(noteId?: string) {
  return useQuery({
    queryKey: ["note", noteId],
    enabled: Boolean(noteId),
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*, note_tags(tag_id, tags(*)), note_ai_metadata(*)").eq("id", noteId!).single();
      if (error) throw error;
      return data;
    }
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { title?: string; content?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const title = input?.title?.trim() || "Untitled note";
      const content = input?.content?.trim() || "<p></p>";
      const { data, error } = await supabase.from("notes").insert({ title, content, user_id: userData.user.id }).select().single();
      if (error) throw error;
      const inbox = await ensureInboxSpace();
      await supabase.from("note_spaces").insert({ note_id: data.id, space_id: inbox.id, user_id: userData.user.id });
      await supabase.from("activity_events").insert({ user_id: userData.user.id, event_type: "note.created", subject_id: data.id, subject_title: data.title });
      upsertNoteEmbedding(data).catch(reportEmbeddingError);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] })
  });
}

export function useUpdateNote(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Note, "title" | "content" | "favorite" | "archived">>) => {
      const { error } = await supabase.from("notes").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", noteId);
      if (error) throw error;
      if (patch.title !== undefined || patch.content !== undefined) {
        const { data, error: fetchError } = await supabase.from("notes").select("id,title,content").eq("id", noteId).single();
        if (fetchError) throw fetchError;
        upsertNoteEmbedding(data).catch(reportEmbeddingError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] })
  });
}
