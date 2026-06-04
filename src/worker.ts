export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      return Response.json({
        supabaseUrl: env.SUPABASE_URL,
        supabaseAnonKey: env.SUPABASE_ANON_KEY,
        appUrl: env.APP_URL ?? url.origin
      });
    }

    return env.ASSETS.fetch(request);
  }
};
