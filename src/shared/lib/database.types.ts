export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; display_name: string | null; avatar_url: string | null; bio: string | null; created_at: string };
        Insert: { id: string; email: string; display_name?: string | null; avatar_url?: string | null; bio?: string | null; created_at?: string };
        Update: { email?: string; display_name?: string | null; avatar_url?: string | null; bio?: string | null };
      };
      notes: {
        Row: { id: string; title: string; content: string; created_at: string; updated_at: string; user_id: string; favorite: boolean; archived: boolean; search_vector: unknown | null };
        Insert: { id?: string; title: string; content?: string; user_id: string; favorite?: boolean; archived?: boolean };
        Update: { title?: string; content?: string; favorite?: boolean; archived?: boolean; updated_at?: string };
      };
      tags: {
        Row: { id: string; name: string; color: string; user_id: string; created_at: string };
        Insert: { id?: string; name: string; color?: string; user_id: string };
        Update: { name?: string; color?: string };
      };
      note_tags: {
        Row: { note_id: string; tag_id: string };
        Insert: { note_id: string; tag_id: string };
        Update: never;
      };
      attachments: {
        Row: { id: string; file_name: string; storage_path: string; file_size: number; mime_type: string | null; uploaded_by: string; created_at: string };
        Insert: { id?: string; file_name: string; storage_path: string; file_size: number; mime_type?: string | null; uploaded_by: string };
        Update: never;
      };
      shared_notes: {
        Row: { id: string; note_id: string; share_token: string; expires_at: string | null; created_at: string };
        Insert: { id?: string; note_id: string; share_token: string; expires_at?: string | null };
        Update: { expires_at?: string | null };
      };
      note_ai_metadata: {
        Row: { note_id: string; summary: string; keywords: string[]; suggested_tags: string[]; generated_at: string };
        Insert: { note_id: string; summary: string; keywords: string[]; suggested_tags: string[]; generated_at?: string };
        Update: { summary?: string; keywords?: string[]; suggested_tags?: string[]; generated_at?: string };
      };
      activity_events: {
        Row: { id: string; user_id: string; event_type: string; subject_id: string | null; subject_title: string | null; created_at: string };
        Insert: { id?: string; user_id: string; event_type: string; subject_id?: string | null; subject_title?: string | null };
        Update: never;
      };
    };
    Views: {
      dashboard_stats: { Row: { user_id: string; total_notes: number; total_tags: number; total_files: number } };
    };
    Functions: {
      search_notes: {
        Args: { search_query: string; tag_filter?: string | null; include_archived?: boolean };
        Returns: Array<{ id: string; title: string; content: string; updated_at: string; favorite: boolean; archived: boolean; rank: number }>;
      };
      get_shared_note: {
        Args: { token: string };
        Returns: Array<{ id: string; title: string; content: string; updated_at: string; owner_name: string | null }>;
      };
    };
  };
};

export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
