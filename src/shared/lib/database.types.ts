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
      spaces: {
        Row: { id: string; user_id: string; name: string; parent_id: string | null; icon: string; color: string; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; parent_id?: string | null; icon?: string; color?: string; sort_order?: number; created_at?: string; updated_at?: string };
        Update: { name?: string; parent_id?: string | null; icon?: string; color?: string; sort_order?: number; updated_at?: string };
      };
      note_spaces: {
        Row: { note_id: string; space_id: string; user_id: string; created_at: string };
        Insert: { note_id: string; space_id: string; user_id: string; created_at?: string };
        Update: never;
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
      content_embeddings: {
        Row: { id: string; user_id: string; source_type: "note" | "node"; source_id: string; content: string; content_hash: string; embedding: unknown | null; embedding_model: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; source_type: "note" | "node"; source_id: string; content: string; content_hash: string; embedding?: unknown | null; embedding_model: string; created_at?: string; updated_at?: string };
        Update: { content?: string; content_hash?: string; embedding?: unknown | null; embedding_model?: string; updated_at?: string };
      };
      knowledge_nodes: {
        Row: { id: string; user_id: string; title: string; type: string; description: string | null; source_note_id: string | null; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title: string; type: string; description?: string | null; source_note_id?: string | null; metadata?: Json; created_at?: string; updated_at?: string };
        Update: { title?: string; type?: string; description?: string | null; source_note_id?: string | null; metadata?: Json; updated_at?: string };
      };
      node_relations: {
        Row: { id: string; user_id: string; source_node_id: string; target_node_id: string; relation_type: string; strength: number | null; description: string | null; created_at: string };
        Insert: { id?: string; user_id: string; source_node_id: string; target_node_id: string; relation_type: string; strength?: number | null; description?: string | null; created_at?: string };
        Update: { relation_type?: string; strength?: number | null; description?: string | null };
      };
      node_note_links: {
        Row: { id: string; user_id: string; node_id: string; note_id: string; link_type: string | null; created_at: string };
        Insert: { id?: string; user_id: string; node_id: string; note_id: string; link_type?: string | null; created_at?: string };
        Update: { link_type?: string | null };
      };
      activity_events: {
        Row: { id: string; user_id: string; event_type: string; subject_id: string | null; subject_title: string | null; created_at: string };
        Insert: { id?: string; user_id: string; event_type: string; subject_id?: string | null; subject_title?: string | null };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Array<{ total_notes: number; total_tags: number; total_files: number }>;
      };
      get_llm_settings: {
        Args: Record<string, never>;
        Returns: Array<{ provider: "openai" | "anthropic" | "gemini"; model: string | null; api_key_preview: string | null; has_api_key: boolean; updated_at: string }>;
      };
      save_llm_settings: {
        Args: { selected_provider: "openai" | "anthropic" | "gemini"; api_key?: string | null; selected_model?: string | null };
        Returns: Array<{ provider: "openai" | "anthropic" | "gemini"; model: string | null; api_key_preview: string | null; has_api_key: boolean; updated_at: string }>;
      };
      clear_llm_api_key: {
        Args: Record<string, never>;
        Returns: Array<{ provider: "openai" | "anthropic" | "gemini"; model: string | null; api_key_preview: string | null; has_api_key: boolean; updated_at: string }>;
      };
      create_space: {
        Args: { space_name: string; parent_space_id?: string | null; space_color?: string | null; space_icon?: string | null };
        Returns: Space;
      };
      match_similar_notes: {
        Args: { target_note_id: string; match_count?: number };
        Returns: Array<{ note_id: string; title: string; content: string; updated_at: string; score: number }>;
      };
      match_similar_nodes: {
        Args: { target_node_id: string; match_count?: number };
        Returns: Array<{ node_id: string; title: string; type: string; description: string | null; score: number }>;
      };
      semantic_search_content: {
        Args: { query_embedding: unknown; match_count?: number };
        Returns: Array<{ source_type: "note" | "node"; source_id: string; title: string; preview: string | null; score: number }>;
      };
      suggested_node_connections: {
        Args: { similarity_threshold?: number; match_count?: number };
        Returns: Array<{ source_node_id: string; source_title: string; target_node_id: string; target_title: string; score: number; suggested_relation: "related_to" | "similar_to" }>;
      };
      search_notes: {
        Args: { search_query: string; tag_filter?: string | null; include_archived?: boolean; space_filter?: string | null };
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
export type Space = Database["public"]["Tables"]["spaces"]["Row"];
export type NoteSpace = Database["public"]["Tables"]["note_spaces"]["Row"];
export type ContentEmbedding = Database["public"]["Tables"]["content_embeddings"]["Row"];
export type KnowledgeNode = Database["public"]["Tables"]["knowledge_nodes"]["Row"];
export type NodeRelation = Database["public"]["Tables"]["node_relations"]["Row"];
export type NodeNoteLink = Database["public"]["Tables"]["node_note_links"]["Row"];
export type LlmProvider = "openai" | "anthropic" | "gemini";

export const knowledgeNodeTypes = ["note", "concept", "person", "project", "question", "book", "article", "place", "event", "idea"] as const;
export type KnowledgeNodeType = (typeof knowledgeNodeTypes)[number];

export const relationTypes = ["related_to", "inspired_by", "contradicts", "supports", "part_of", "mentions", "expands", "answers", "asks", "similar_to"] as const;
export type RelationType = (typeof relationTypes)[number];
