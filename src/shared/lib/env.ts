import { z } from "zod";

const viteEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_URL: z.string().url().optional()
});

const workerConfigSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  appUrl: z.string().url().optional()
});

export type AppEnv = z.infer<typeof viteEnvSchema>;

let runtimeEnv: AppEnv | null = null;

export async function initEnv() {
  const viteEnv = viteEnvSchema.safeParse(import.meta.env);
  if (viteEnv.success) {
    runtimeEnv = viteEnv.data;
    return runtimeEnv;
  }

  const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Could not load runtime configuration.");

  const workerConfig = workerConfigSchema.parse(await response.json());
  runtimeEnv = {
    VITE_SUPABASE_URL: workerConfig.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: workerConfig.supabaseAnonKey,
    VITE_APP_URL: workerConfig.appUrl
  };
  return runtimeEnv;
}

function getEnv() {
  if (!runtimeEnv) throw new Error("Runtime configuration has not loaded yet.");
  return runtimeEnv;
}

export const env = new Proxy({} as AppEnv, {
  get(_target, property: keyof AppEnv) {
    return getEnv()[property];
  }
});
