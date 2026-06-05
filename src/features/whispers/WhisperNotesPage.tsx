import { Check, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { getErrorMessage } from "../../shared/lib/errors";
import { useCreateNote } from "../notes/noteHooks";
import { useGenerateWhisperSuggestions } from "./whisperHooks";
import type { WhisperSuggestion } from "./whisperServices";

export function WhisperNotesPage() {
  const navigate = useNavigate();
  const generate = useGenerateWhisperSuggestions();
  const createNote = useCreateNote();
  const [suggestions, setSuggestions] = useState<WhisperSuggestion[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function generateWhispers() {
    setError("");
    setStatus("");
    try {
      const next = await generate.mutateAsync();
      setSuggestions(next);
      setStatus(next.length ? `${next.length} whisper notes found` : "No whisper notes found yet");
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate whisper notes."));
    }
  }

  async function createWhisper(suggestion: WhisperSuggestion) {
    setError("");
    setStatus("");
    try {
      const note = await createNote.mutateAsync({ title: suggestion.title, content: suggestion.content });
      setSuggestions((items) => items.filter((item) => item.id !== suggestion.id));
      navigate(`/notes/${note.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create note."));
    }
  }

  function forgetWhisper(id: string) {
    setSuggestions((items) => items.filter((item) => item.id !== id));
    setStatus("Whisper forgotten");
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <WandSparkles className="text-vault-accent" size={26} />
          <div>
            <h1 className="text-3xl font-semibold">Whisper Notes</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Let the vault suggest notes from connections, gaps, and patterns in your existing knowledge.</p>
          </div>
        </div>
        <Button onClick={() => void generateWhispers()} disabled={generate.isPending}>
          <Sparkles size={16} /> {generate.isPending ? "Listening..." : "Generate whispers"}
        </Button>
      </div>

      <div className="mt-4 min-h-6">
        {status ? <p className="text-sm font-medium text-vault-accent">{status}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {!generate.isPending && suggestions.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState title="No whispers yet" description="Generate suggestions after you have a few notes, concepts, or graph connections in the vault." />
          </div>
        ) : null}

        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{suggestion.title}</h2>
                {suggestion.summary ? <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{suggestion.summary}</p> : null}
              </div>
            </div>

            {suggestion.reason ? (
              <div className="mt-4 rounded bg-vault-accent/10 p-3 text-sm text-vault-accent">
                {suggestion.reason}
              </div>
            ) : null}

            {suggestion.sources.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Sources</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestion.sources.map((source) => <span key={source} className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">{source}</span>)}
                </div>
              </div>
            ) : null}

            {suggestion.tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestion.tags.map((tag) => <span key={tag} className="rounded bg-vault-accent/10 px-2 py-1 text-xs text-vault-accent">{tag}</span>)}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void createWhisper(suggestion)} disabled={createNote.isPending}><Check size={15} /> Create</Button>
              <Button size="sm" variant="secondary" onClick={() => forgetWhisper(suggestion.id)}><Trash2 size={15} /> Forget</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
