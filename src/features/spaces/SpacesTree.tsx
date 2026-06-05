import { ChevronRight, Folder, Inbox, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { getErrorMessage } from "../../shared/lib/errors";
import { cn } from "../../shared/lib/utils";
import type { Space } from "../../shared/lib/database.types";
import { useCreateSpace, useSpaces } from "./spaceHooks";

type SpaceNode = Space & { children: SpaceNode[] };

export function SpacesTree() {
  const [searchParams] = useSearchParams();
  const activeSpaceId = searchParams.get("space");
  const { data: spaces = [], isLoading } = useSpaces();
  const createSpace = useCreateSpace();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const tree = useMemo(() => buildTree(spaces), [spaces]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return;
    try {
      await createSpace.mutateAsync({ name });
      setName("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not create space."));
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Spaces</h2>
        <Folder size={14} className="text-zinc-500" />
      </div>
      <div className="space-y-1">
        {isLoading ? <p className="px-2 text-xs text-zinc-500">Loading spaces...</p> : null}
        {tree.map((space) => <SpaceTreeItem key={space.id} space={space} activeSpaceId={activeSpaceId} depth={0} />)}
        {!isLoading && tree.length === 0 ? <p className="px-2 text-xs text-zinc-500">No spaces yet.</p> : null}
      </div>
      <form className="flex gap-1 px-2 pt-2" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-2 py-1 text-xs dark:border-zinc-800"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New space"
        />
        <Button size="icon" variant="ghost" title="Create space" disabled={createSpace.isPending}>
          <Plus size={14} />
        </Button>
      </form>
      {error ? <p className="px-2 text-xs text-red-600">{error}</p> : null}
    </section>
  );
}

function SpaceTreeItem({ space, activeSpaceId, depth }: { space: SpaceNode; activeSpaceId: string | null; depth: number }) {
  const Icon = space.icon === "inbox" ? Inbox : Folder;
  const active = activeSpaceId === space.id;
  return (
    <div>
      <Link
        to={`/notes?space=${space.id}`}
        className={cn(
          "flex items-center gap-2 rounded px-2 py-1.5 text-sm transition",
          active ? "bg-vault-accent text-white" : "text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {space.children.length > 0 ? <ChevronRight size={13} className="shrink-0" /> : <span className="w-[13px]" />}
        <Icon size={15} className="shrink-0" style={{ color: active ? "currentColor" : space.color }} />
        <span className="truncate">{space.name}</span>
      </Link>
      {space.children.map((child) => <SpaceTreeItem key={child.id} space={child} activeSpaceId={activeSpaceId} depth={depth + 1} />)}
    </div>
  );
}

function buildTree(spaces: Space[]) {
  const nodes = new Map<string, SpaceNode>();
  spaces.forEach((space) => nodes.set(space.id, { ...space, children: [] }));

  const roots: SpaceNode[] = [];
  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items: SpaceNode[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}
