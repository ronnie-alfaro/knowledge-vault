import type { User } from "@supabase/supabase-js";

export function isAnonymousUser(user?: User | null) {
  if (!user) return false;
  return Boolean((user as User & { is_anonymous?: boolean }).is_anonymous || user.app_metadata?.provider === "anonymous");
}

export function isAnonymousProfileEmail(email?: string | null) {
  return Boolean(email?.endsWith("@knowledge-vault.local") || email?.startsWith("anonymous-"));
}
