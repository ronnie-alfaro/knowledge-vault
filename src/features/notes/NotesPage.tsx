import { Archive, FilePlus2, Star } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { stripHtml } from "../../shared/lib/utils";
import { useCreateNote, useNotes } from "./noteHooks";
import { useTags } from "../tags/tagHooks";
import type { Note } from "../../shared/lib/database.types";

export function NotesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tagId, setTagId] = useState("");
  const [archived, setArchived] = useState(false);
  const { data: notes = [], isLoading } = useNotes({ query, tagId: tagId || undefined, archived });
  const { data: tags = [] } = useTags();
  const createNote = useCreateNote();

  async function create() {
    const note = await createNote.mutateAsync();
    navigate(`/notes/${note.id}`);
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold">Notes</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Write, search, archive, favorite, and connect your knowledge.</p>
        </div>
        <Button onClick={create} disabled={createNote.isPending}><FilePlus2 size={16} /> New note</Button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input className="rounded border border-vault-line bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900" placeholder="Search title, content, tags" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rounded border border-vault-line bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900" value={tagId} onChange={(e) => setTagId(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
        <Button variant={archived ? "primary" : "secondary"} onClick={() => setArchived((value) => !value)}><Archive size={16} /> Archived</Button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? <p>Loading notes...</p> : null}
        {!isLoading && notes.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No notes yet" description="Create the first note in this vault or adjust your filters." action={<Button onClick={create}>Create note</Button>} /></div> : null}
        {notes.map((note: Note) => (
          <Link key={note.id} to={`/notes/${note.id}`} className="rounded border border-vault-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-lg font-semibold">{note.title}</h2>
              {note.favorite ? <Star className="shrink-0 fill-amber-400 text-amber-500" size={18} /> : null}
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{stripHtml(note.content)}</p>
            <p className="mt-4 text-xs text-zinc-500">Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
