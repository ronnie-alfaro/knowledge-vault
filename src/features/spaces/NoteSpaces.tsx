import { Folder, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../shared/components/Button";
import { getErrorMessage } from "../../shared/lib/errors";
import { useAddNoteToSpace, useCreateSpace, useRemoveNoteFromSpace, useSpaces, useSpacesForNote } from "./spaceHooks";

export function NoteSpaces({ noteId }: { noteId: string }) {
  const { data: links = [], isLoading } = useSpacesForNote(noteId);
  const { data: spaces = [] } = useSpaces();
  const createSpace = useCreateSpace();
  const addSpace = useAddNoteToSpace(noteId);
  const removeSpace = useRemoveNoteFromSpace(noteId);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [newSpaceName, setNewSpaceName] = useState("");
  const [error, setError] = useState("");
  const linkedSpaceIds = new Set(links.map((link) => link.space_id));
  const availableSpaces = spaces.filter((space) => !linkedSpaceIds.has(space.id));

  async function linkSelected() {
    setError("");
    if (!selectedSpaceId) return;
    try {
      await addSpace.mutateAsync({ note_id: noteId, space_id: selectedSpaceId });
      setSelectedSpaceId("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not add space."));
    }
  }

  async function createAndLink() {
    setError("");
    if (!newSpaceName.trim()) return;
    try {
      const space = await createSpace.mutateAsync({ name: newSpaceName });
      await addSpace.mutateAsync({ note_id: noteId, space_id: space.id });
      setNewSpaceName("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not create space."));
    }
  }

  return (
    <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <Folder size={16} className="text-vault-accent" />
        <h2 className="font-semibold">Spaces</h2>
      </div>
      {isLoading ? <p className="mt-3 text-sm text-zinc-500">Loading spaces...</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <button
            key={link.space_id}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-white"
            style={{ background: link.spaces?.color ?? "#0f766e" }}
            onClick={() => removeSpace.mutate({ note_id: noteId, space_id: link.space_id })}
            title="Remove from space"
          >
            {link.spaces?.name ?? "Deleted space"} <X size={12} />
          </button>
        ))}
        {!isLoading && links.length === 0 ? <p className="text-sm text-zinc-500">No spaces assigned.</p> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <select className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={selectedSpaceId} onChange={(event) => setSelectedSpaceId(event.target.value)}>
          <option value="">Add to space</option>
          {availableSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
        </select>
        <Button size="sm" variant="secondary" onClick={linkSelected} disabled={addSpace.isPending}>Add</Button>
      </div>
      <div className="mt-2 flex gap-2">
        <input className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={newSpaceName} onChange={(event) => setNewSpaceName(event.target.value)} placeholder="New space" />
        <Button size="sm" variant="secondary" onClick={createAndLink} disabled={createSpace.isPending || addSpace.isPending}><Plus size={15} /> Create</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
