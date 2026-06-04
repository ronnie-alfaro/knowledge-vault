import { Link2, Plus, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "../../shared/components/Button";
import { knowledgeNodeTypes, type KnowledgeNodeType } from "../../shared/lib/database.types";
import { useCreateKnowledgeNode, useKnowledgeNodes, useLinkNodeToNote, useNodesForNote, useUnlinkNodeFromNote } from "./knowledgeHooks";

export function NoteKnowledgeNodes({ noteId }: { noteId: string }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<KnowledgeNodeType>("concept");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [error, setError] = useState("");
  const { data: links = [], isLoading } = useNodesForNote(noteId);
  const { data: nodes = [] } = useKnowledgeNodes();
  const createNode = useCreateKnowledgeNode();
  const linkNode = useLinkNodeToNote(noteId);
  const unlinkNode = useUnlinkNodeFromNote(noteId);
  const linkedNodeIds = new Set(links.map((link) => link.node_id));
  const availableNodes = nodes.filter((node) => !linkedNodeIds.has(node.id));

  async function create() {
    setError("");
    if (!title.trim()) {
      setError("Node title is required.");
      return;
    }
    try {
      const node = await createNode.mutateAsync({ title, type, source_note_id: noteId });
      await linkNode.mutateAsync({ node_id: node.id, note_id: noteId, link_type: "mentions" });
      setTitle("");
      setType("concept");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create node.");
    }
  }

  async function linkExisting() {
    setError("");
    if (!selectedNodeId) {
      setError("Choose a node to link.");
      return;
    }
    try {
      await linkNode.mutateAsync({ node_id: selectedNodeId, note_id: noteId, link_type: "mentions" });
      setSelectedNodeId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link node.");
    }
  }

  return (
    <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold">Knowledge Nodes</h2>
      {isLoading ? <p className="mt-3 text-sm text-zinc-500">Loading nodes...</p> : null}
      <div className="mt-3 space-y-2">
        {links.map((link) => (
          <div key={link.id} className="flex items-center justify-between gap-2 rounded border border-vault-line px-3 py-2 text-sm dark:border-zinc-800">
            <div className="min-w-0">
              <p className="truncate font-medium">{link.knowledge_nodes?.title ?? "Deleted node"}</p>
              <p className="text-xs text-zinc-500">{link.knowledge_nodes?.type ?? "unknown"} · {link.link_type ?? "mentions"}</p>
            </div>
            <Button size="icon" variant="ghost" title="Remove link" onClick={() => unlinkNode.mutate(link.id)} disabled={unlinkNode.isPending}>
              <Unlink size={15} />
            </Button>
          </div>
        ))}
        {!isLoading && links.length === 0 ? <p className="text-sm text-zinc-500">No linked nodes yet.</p> : null}
      </div>
      <div className="mt-4 space-y-2">
        <input className="w-full rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New node title" />
        <div className="flex gap-2">
          <select className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={type} onChange={(e) => setType(e.target.value as KnowledgeNodeType)}>
            {knowledgeNodeTypes.map((nodeType) => <option key={nodeType} value={nodeType}>{nodeType}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={create} disabled={createNode.isPending || linkNode.isPending}><Plus size={15} /> Create</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <select className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)}>
          <option value="">Link existing node</option>
          {availableNodes.map((node) => <option key={node.id} value={node.id}>{node.title} ({node.type})</option>)}
        </select>
        <Button size="sm" variant="secondary" onClick={linkExisting} disabled={linkNode.isPending}><Link2 size={15} /> Link</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
