import { useQuery } from "@tanstack/react-query";
import { findSimilarNodes, findSimilarNotes, getSuggestedConnections, semanticSearch } from "./semanticServices";

export function useRelatedNotes(noteId?: string) {
  return useQuery({ queryKey: ["related-notes", noteId], enabled: Boolean(noteId), queryFn: () => findSimilarNotes(noteId!) });
}

export function useRelatedNodes(nodeId?: string) {
  return useQuery({ queryKey: ["related-nodes", nodeId], enabled: Boolean(nodeId), queryFn: () => findSimilarNodes(nodeId!) });
}

export function useSuggestedConnections(threshold: number) {
  return useQuery({ queryKey: ["suggested-connections", threshold], queryFn: () => getSuggestedConnections(threshold) });
}

export function useSemanticSearch(query: string) {
  return useQuery({
    queryKey: ["semantic-search", query],
    enabled: query.trim().length > 0,
    queryFn: () => semanticSearch(query.trim())
  });
}
