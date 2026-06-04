export type RelatedNote = {
  note_id: string;
  title: string;
  content: string;
  updated_at: string;
  score: number;
};

export type RelatedNode = {
  node_id: string;
  title: string;
  type: string;
  description: string | null;
  score: number;
};

export type SemanticSearchResult = {
  source_type: "note" | "node";
  source_id: string;
  title: string;
  preview: string | null;
  score: number;
};

export type SuggestedConnection = {
  source_node_id: string;
  source_title: string;
  target_node_id: string;
  target_title: string;
  score: number;
  suggested_relation: "related_to" | "similar_to";
};
