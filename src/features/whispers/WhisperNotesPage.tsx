import { Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { getErrorMessage } from "../../shared/lib/errors";
import { useCreateNote } from "../notes/noteHooks";
import { useProcessWhisper } from "./whisperHooks";
import type { WhisperResult } from "./whisperServices";

const starter = "Capture a raw idea, question, meeting thought, article takeaway, or loose connection...";

export function WhisperNotesPage() {
  const navigate = useNavigate();
  const process = useProcessWhisper();
  const createNote = useCreateNote();
  const [whisper, setWhisper] = useState("");
  const [result, setResult] = useState<WhisperResult | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function processThought() {
    setError("");
    setStatus("");
    if (!whisper.trim()) return;
    try {
      const next = await process.mutateAsync(whisper);
      setResult(next);
      setTitle(next.title);
      setContent(next.content);
      setStatus("Whisper processed. Review before creating the note.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not process whisper."));
    }
  }

  async function createFromWhisper() {
    setError("");
    setStatus("");
    try {
      const note = await createNote.mutateAsync({ title, content });
      navigate(`/notes/${note.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create note."));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div>
        <div className="flex items-center gap-3">
          <WandSparkles className="text-vault-accent" size={26} />
          <div>
            <h1 className="text-3xl font-semibold">Whisper Notes</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Turn rough thoughts into structured notes you can review and keep.</p>
          </div>
        </div>

        <section className="mt-6 rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-sm font-medium">
            Raw whisper
            <textarea
              className="mt-2 min-h-48 w-full rounded border border-vault-line bg-transparent px-3 py-2 leading-7 dark:border-zinc-700"
              value={whisper}
              onChange={(event) => setWhisper(event.target.value)}
              placeholder={starter}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => void processThought()} disabled={process.isPending || whisper.trim().length === 0}>
              <Sparkles size={16} /> {process.isPending ? "Processing..." : "Process Whisper"}
            </Button>
            {status ? <span className="text-sm font-medium text-vault-accent">{status}</span> : null}
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        {result ? (
          <section className="mt-6 rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Draft Note</h2>
            <label className="mt-4 block text-sm font-medium">
              Title
              <input className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Content
              <textarea className="mt-1 min-h-72 w-full rounded border border-vault-line bg-transparent px-3 py-2 leading-7 dark:border-zinc-700" value={content} onChange={(event) => setContent(event.target.value)} />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => void createFromWhisper()} disabled={createNote.isPending || !title.trim()}>
                {createNote.isPending ? "Creating..." : "Create note"}
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Whisper Output</h2>
          {!result ? <p className="mt-2 text-sm text-zinc-500">Suggestions appear after processing a whisper.</p> : null}
          {result?.summary ? <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{result.summary}</p> : null}
          {result?.tags.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Suggested Tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.tags.map((tag) => <span key={tag} className="rounded bg-vault-accent/10 px-2 py-1 text-xs text-vault-accent">{tag}</span>)}
              </div>
            </div>
          ) : null}
        </section>

        {result?.concepts.length ? (
          <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Possible Concepts</h2>
            <div className="mt-3 space-y-3">
              {result.concepts.map((concept) => (
                <div key={`${concept.type}-${concept.title}`} className="text-sm">
                  <p className="font-medium">{concept.title}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{concept.type}</p>
                  <p className="mt-1 text-xs text-zinc-500">{concept.description}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {result?.relations.length ? (
          <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Possible Relations</h2>
            <div className="mt-3 space-y-3">
              {result.relations.map((relation) => (
                <div key={`${relation.relation_type}-${relation.title}`} className="text-sm">
                  <p className="font-medium">{relation.title}</p>
                  <p className="text-xs text-vault-accent">{relation.relation_type}</p>
                  <p className="mt-1 text-xs text-zinc-500">{relation.reason}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </section>
  );
}
