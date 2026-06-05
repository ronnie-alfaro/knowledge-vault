import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";
import type { LlmProvider } from "../../shared/lib/database.types";

export type LlmSettings = {
  provider: LlmProvider;
  model: string | null;
  api_key_preview: string | null;
  has_api_key: boolean;
  updated_at: string;
};

export function useLlmSettings() {
  return useQuery({
    queryKey: ["llm-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_llm_settings");
      if (error) throw error;
      return (data?.[0] ?? null) as LlmSettings | null;
    },
    retry: false
  });
}

export function useSaveLlmSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: { provider: LlmProvider; model: string; apiKey: string }) => {
      const { data, error } = await supabase.rpc("save_llm_settings", {
        selected_provider: settings.provider,
        selected_model: settings.model.trim() || null,
        api_key: settings.apiKey.trim() || null
      });
      if (error) throw error;
      return (data?.[0] ?? null) as LlmSettings | null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["llm-settings"] })
  });
}

export function useClearLlmApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("clear_llm_api_key");
      if (error) throw error;
      return (data?.[0] ?? null) as LlmSettings | null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["llm-settings"] })
  });
}
