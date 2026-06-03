import { Archive, BrainCircuit, Copy, Share2, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nanoid } from "nanoid";
import { Button } from "../../shared/components/Button";
import { env } from "../../shared/lib/env";
import { supabase } from "../../shared/lib/supabase";
import { stripHtml } from "../../shared/lib/utils";
import { useAssignTag, useCreateTag, useRemoveTag, useTags } from "../tags/tagHooks";
import { useDeleteNote, useNote, useUpdateNote } from "./noteHooks";
import { RichTextEditor } from "./RichTextEditor";

export function NoteDetailPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { data: note, isLoading } = useNote(noteId);
  const { data: tags = [] } = useTags();
  const updateNote = useUpdateNote(noteId!);
  const deleteNote = useDeleteNote();
  const createTag = useCreateTag();
  const assignTag = useAssignTag(noteId!);
  const removeTag = useRemoveTag(noteId!);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newTag, setNewTag] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const assigned = useMemo(() => new Set(note?.note_tags?.map((row: { tag_id: string }) => row.tag_id) ?? []), [note]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  useEffect(() => {
    if (!noteId) return;
    const channel = supabase.channel(`note-live-${noteId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` }, (payload) => {
        const next = payload.new as { title: string; content: string };
        setTitle(next.title);
        setContent(next.content);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [noteId]);

  async function save() {
    await updateNote.mutateAsync({ title, content });
  }

  async function createAndAssignTag() {
    if (!newTag.trim()) return;
    await createTag.mutateAsync(newTag.trim());
    setNewTag("");
  }

  async function createShareLink() {
    const token = nanoid(32);
    const { error } = await supabase.from("shared_notes").insert({ note_id: noteId!, share_token: token });
    if (error) throw error;
    setShareUrl(`${env.VITE_APP_URL ?? location.origin}/share/${token}`);
  }

  async function summarize() {
    const { data, error } = await supabase.functions.invoke("summarize_note", { body: { note_id: noteId, content: stripHtml(content) } });
    if (error) throw error;
    return data;
  }

  if (isLoading) return <p>Loading note...</p>;
  if (!note) return <p>Note not found.</p>;

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div>
        <input className="w-full bg-transparent text-4xl font-semibold outline-none" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} />
        <div className="mt-5"><RichTextEditor value={content} onChange={setContent} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={save} disabled={updateNote.isPending}>Save</Button>
          <Button variant="secondary" onClick={() => updateNote.mutate({ favorite: !note.favorite })}><Star size={16} /> {note.favorite ? "Unfavorite" : "Favorite"}</Button>
          <Button variant="secondary" onClick={() => updateNote.mutate({ archived: !note.archived })}><Archive size={16} /> {note.archived ? "Restore" : "Archive"}</Button>
          <Button variant="danger" onClick={async () => { await deleteNote.mutateAsync(note.id); navigate("/notes"); }}><Trash2 size={16} /> Delete</Button>
        </div>
      </div>
      <aside className="space-y-4">
        <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button key={tag.id} className="rounded px-2 py-1 text-xs text-white" style={{ background: tag.color }} onClick={() => assigned.has(tag.id) ? removeTag.mutate(tag.id) : assignTag.mutate(tag.id)}>
                {assigned.has(tag.id) ? "✓ " : ""}{tag.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" />
            <Button size="sm" variant="secondary" onClick={createAndAssignTag}>Add</Button>
          </div>
        </section>
        <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Sharing</h2>
          <Button className="mt-3 w-full" variant="secondary" onClick={createShareLink}><Share2 size={16} /> Public link</Button>
          {shareUrl ? <button className="mt-3 flex w-full items-center gap-2 rounded bg-zinc-100 p-2 text-left text-xs dark:bg-zinc-800" onClick={() => navigator.clipboard.writeText(shareUrl)}><Copy size={14} /> {shareUrl}</button> : null}
        </section>
        <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">AI metadata</h2>
          {note.note_ai_metadata ? <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{note.note_ai_metadata.summary}</p> : null}
          <Button className="mt-3 w-full" variant="secondary" onClick={summarize}><BrainCircuit size={16} /> Summarize</Button>
        </section>
      </aside>
    </section>
  );
}
