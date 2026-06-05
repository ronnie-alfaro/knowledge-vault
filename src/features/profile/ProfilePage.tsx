import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { supabase } from "../../shared/lib/supabase";
import { useProfile, useUpdateProfile } from "./profileHooks";

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  async function uploadAvatar(file: File) {
    setStatusMessage("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const path = `${userData.user.id}/avatar-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setStatusMessage("Avatar ready. Save profile to keep it.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatusMessage("");
    await updateProfile.mutateAsync({ display_name: displayName, bio, avatar_url: avatarUrl });
    setStatusMessage("Profile saved");
  }

  if (isLoading) return <p>Loading profile...</p>;

  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <form className="mt-6 space-y-5 rounded border border-vault-line bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" onSubmit={submit}>
        <div className="flex items-center gap-4">
          <img className="h-20 w-20 rounded object-cover" src={avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.email}`} alt="" />
          <label className="text-sm font-medium">Avatar<input className="mt-2 block text-sm" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} /></label>
        </div>
        <label className="block text-sm font-medium">Display name<input className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
        <label className="block text-sm font-medium">Bio<textarea className="mt-1 min-h-28 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={bio} onChange={(e) => setBio(e.target.value)} /></label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={updateProfile.isPending}>{updateProfile.isPending ? "Saving..." : "Save profile"}</Button>
          {statusMessage ? <span className="text-sm font-medium text-vault-accent">{statusMessage}</span> : null}
        </div>
      </form>
    </section>
  );
}
