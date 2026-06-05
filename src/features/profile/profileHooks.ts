import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";
import type { Database } from "../../shared/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .upsert({
          id: userData.user.id,
          email: userData.user.email ?? "",
          display_name: userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? null,
          avatar_url: userData.user.user_metadata?.avatar_url ?? null
        }, { onConflict: "id" })
        .select()
        .single();
      if (createError) throw createError;
      return created as Profile;
    }
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: { display_name: string; bio: string | null; avatar_url?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: userData.user.id,
          email: userData.user.email ?? "",
          display_name: profile.display_name.trim() || null,
          bio: profile.bio?.trim() || null,
          avatar_url: profile.avatar_url ?? null
        }, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile"], profile);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });
}
