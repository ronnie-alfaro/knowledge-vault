import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "../../shared/lib/env";
import { supabase } from "../../shared/lib/supabase";
import type { LlmProvider } from "../../shared/lib/database.types";

type LlmCheckResult = {
  online: boolean;
  status: string;
  message: string;
  provider?: LlmProvider;
  model?: string;
};

export type LlmModel = {
  id: string;
  label: string;
  description?: string;
};

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

export function useCheckLlmConfig() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again before checking LLM config.");

      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/check_llm_config`, {
        method: "POST",
        headers: {
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "check" })
      });

      const payload = await parseResponse(response);
      if (!response.ok) throw new Error(payload.message ?? "Check LLM Config");
      return payload;
    }
  });
}

export function useLlmModels() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again before loading models.");

      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/check_llm_config`, {
        method: "POST",
        headers: {
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "listModels" })
      });

      const payload = await parseModelsResponse(response);
      if (!response.ok) throw new Error(payload.message ?? "Could not load models.");
      return payload;
    }
  });
}

async function parseResponse(response: Response): Promise<LlmCheckResult> {
  const text = await response.text();
  if (!text) return { online: false, status: "offline", message: "" };
  try {
    return JSON.parse(text) as LlmCheckResult;
  } catch {
    return { online: false, status: "offline", message: text };
  }
}

async function parseModelsResponse(response: Response): Promise<{ provider?: LlmProvider; models: LlmModel[]; message?: string }> {
  const text = await response.text();
  if (!text) return { models: [] };
  try {
    return JSON.parse(text) as { provider?: LlmProvider; models: LlmModel[]; message?: string };
  } catch {
    return { models: [], message: text };
  }
}
