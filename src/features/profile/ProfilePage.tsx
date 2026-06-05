import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import type { LlmProvider } from "../../shared/lib/database.types";
import { getErrorMessage } from "../../shared/lib/errors";
import { supabase } from "../../shared/lib/supabase";
import { useCheckLlmConfig, useClearLlmApiKey, useLlmSettings, useSaveLlmSettings } from "./llmSettingsHooks";
import { useProfile, useUpdateProfile } from "./profileHooks";

const providerOptions: Array<{ value: LlmProvider; label: string; placeholder: string }> = [
  { value: "openai", label: "OpenAI", placeholder: "gpt-4.1-mini" },
  { value: "anthropic", label: "Anthropic", placeholder: "claude-3-5-sonnet-latest" },
  { value: "gemini", label: "Gemini", placeholder: "gemini-1.5-pro" }
];

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const { data: llmSettings, error: llmSettingsError } = useLlmSettings();
  const updateProfile = useUpdateProfile();
  const saveLlmSettings = useSaveLlmSettings();
  const clearLlmKey = useClearLlmApiKey();
  const checkLlmConfig = useCheckLlmConfig();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [llmStatusMessage, setLlmStatusMessage] = useState("");
  const [llmError, setLlmError] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (llmSettings) {
      setProvider(llmSettings.provider);
      setModel(llmSettings.model ?? "");
    }
  }, [llmSettings]);

  async function uploadAvatar(file: File) {
    setStatusMessage("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const path = `${userData.user.id}/avatar-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      setStatusMessage("Avatar ready. Save profile to keep it.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Could not upload avatar."));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatusMessage("");
    try {
      const savedProfile = await updateProfile.mutateAsync({ display_name: displayName, bio, avatar_url: avatarUrl });
      setDisplayName(savedProfile.display_name ?? "");
      setBio(savedProfile.bio ?? "");
      setAvatarUrl(savedProfile.avatar_url);
      setStatusMessage("Profile saved");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Could not save profile."));
    }
  }

  async function saveAiSettings(event: FormEvent) {
    event.preventDefault();
    setLlmStatusMessage("");
    setLlmError("");
    try {
      await saveLlmSettings.mutateAsync({ provider, model, apiKey });
      setApiKey("");
      const check = await checkLlmConfig.mutateAsync();
      setLlmStatusMessage(check.online ? `LLM Online (${check.provider}, ${check.model})` : "Check LLM Config");
    } catch (error) {
      setLlmError(getErrorMessage(error, "Could not save LLM settings."));
    }
  }

  async function checkAiSettings() {
    setLlmStatusMessage("");
    setLlmError("");
    try {
      const check = await checkLlmConfig.mutateAsync();
      setLlmStatusMessage(check.online ? `LLM Online (${check.provider}, ${check.model})` : "Check LLM Config");
    } catch (error) {
      setLlmError(getErrorMessage(error, "Check LLM Config"));
    }
  }

  async function clearAiKey() {
    setLlmStatusMessage("");
    setLlmError("");
    try {
      await clearLlmKey.mutateAsync();
      setApiKey("");
      setLlmStatusMessage("API key removed");
    } catch (error) {
      setLlmError(getErrorMessage(error, "Could not remove API key."));
    }
  }

  if (isLoading) return <p>Loading profile...</p>;

  return (
    <section className="max-w-3xl space-y-6">
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
      <form className="space-y-5 rounded border border-vault-line bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" onSubmit={saveAiSettings}>
        <div>
          <h2 className="text-lg font-semibold">LLM Settings</h2>
          <p className="mt-1 text-sm text-zinc-500">Choose the provider for future AI features. Stored keys are encrypted and never shown again.</p>
        </div>
        <label className="block text-sm font-medium">
          Provider
          <select className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={provider} onChange={(event) => setProvider(event.target.value as LlmProvider)}>
            {providerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Default model
          <input
            className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={providerOptions.find((option) => option.value === provider)?.placeholder}
          />
        </label>
        <label className="block text-sm font-medium">
          API key
          <input
            className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={llmSettings?.has_api_key ? "Leave blank to keep existing key" : "Paste API key"}
            type="password"
            autoComplete="new-password"
          />
        </label>
        {llmSettings?.has_api_key ? <p className="text-sm text-zinc-500">Saved key: <span className="font-medium text-zinc-700 dark:text-zinc-300">{llmSettings.api_key_preview}</span></p> : null}
        {llmSettingsError ? <p className="text-sm text-red-600">{getErrorMessage(llmSettingsError, "LLM settings are not ready yet.")}</p> : null}
        {llmError ? <p className="text-sm text-red-600">{llmError}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={saveLlmSettings.isPending}>{saveLlmSettings.isPending ? "Saving..." : "Save LLM settings"}</Button>
          <Button type="button" variant="secondary" disabled={checkLlmConfig.isPending || (!llmSettings?.has_api_key && !apiKey.trim())} onClick={() => void checkAiSettings()}>{checkLlmConfig.isPending ? "Checking..." : "Check LLM Config"}</Button>
          <Button type="button" variant="secondary" disabled={!llmSettings?.has_api_key || clearLlmKey.isPending} onClick={() => void clearAiKey()}>Remove key</Button>
          {llmStatusMessage ? <span className="text-sm font-medium text-vault-accent">{llmStatusMessage}</span> : null}
        </div>
      </form>
    </section>
  );
}
