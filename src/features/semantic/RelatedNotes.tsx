import { Link } from "react-router-dom";
import { stripHtml } from "../../shared/lib/utils";
import { useRelatedNotes } from "./semanticHooks";

export function RelatedNotes({ noteId }: { noteId: string }) {
  const { data = [], isLoading, error } = useRelatedNotes(noteId);
  return (
    <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold">Related Notes</h2>
      {isLoading ? <p className="mt-3 text-sm text-zinc-500">Finding similar notes...</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error.message}</p> : null}
      {!isLoading && !error && data.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No related notes yet.</p> : null}
      <div className="mt-3 space-y-2">
        {data.slice(0, 10).map((note) => (
          <Link key={note.note_id} to={`/notes/${note.note_id}`} className="block rounded border border-vault-line px-3 py-2 text-sm hover:bg-black/5 dark:border-zinc-800 dark:hover:bg-white/10">
            <span className="flex items-center justify-between gap-3">
              <span className="truncate font-medium">{note.title}</span>
              <span className="shrink-0 text-xs text-vault-accent">{Math.round(note.score * 100)}%</span>
            </span>
            <span className="mt-1 block line-clamp-2 text-xs text-zinc-500">{stripHtml(note.content)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
