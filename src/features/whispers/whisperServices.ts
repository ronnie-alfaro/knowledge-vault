import { env } from "../../shared/lib/env";
import { supabase } from "../../shared/lib/supabase";

export type WhisperResult = {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  concepts: Array<{ title: string; type: string; description: string }>;
  relations: Array<{ title: string; relation_type: string; reason: string }>;
};

export async function processWhisper(whisper: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in again before using Whisper Notes.");

  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/process_whisper`, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ whisper })
  });

  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload.error ?? "Could not process whisper.");
  return payload as WhisperResult;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Partial<WhisperResult> & { error?: string };
  } catch {
    return { error: text };
  }
}
