import { GitBranch, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { knowledgeNodeTypes, relationTypes, type KnowledgeNode, type KnowledgeNodeType, type NodeRelation, type RelationType } from "../../shared/lib/database.types";
import { useCreateNodeRelation, useKnowledgeNodes, useNodeRelations, useNoteLinksForNode, useRelationsForNode } from "./knowledgeHooks";

export function KnowledgeGraphPage() {
  const [type, setType] = useState<KnowledgeNodeType | "">("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("related_to");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const { data: nodes = [], isLoading, error: nodesError } = useKnowledgeNodes(type);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const activeNodeId = selectedNode?.id;
  const { data: relations = [], isLoading: relationsLoading } = useRelationsForNode(activeNodeId);
  const { data: allNodes = nodes } = useKnowledgeNodes();
  const { data: graphRelations = [] } = useNodeRelations();
  const createRelation = useCreateNodeRelation(activeNodeId);
  const incoming = useMemo(() => relations.filter((relation) => relation.target_node_id === activeNodeId), [activeNodeId, relations]);
  const outgoing = useMemo(() => relations.filter((relation) => relation.source_node_id === activeNodeId), [activeNodeId, relations]);

  async function create() {
    setError("");
    if (!activeNodeId || !targetNodeId) {
      setError("Choose a target node.");
      return;
    }
    try {
      await createRelation.mutateAsync({ source_node_id: activeNodeId, target_node_id: targetNodeId, relation_type: relationType, description });
      setTargetNodeId("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create relation.");
    }
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold">Knowledge Graph</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Browse nodes, linked notes, and explicit relationships.</p>
        </div>
        <select className="rounded border border-vault-line bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" value={type} onChange={(e) => setType(e.target.value as KnowledgeNodeType | "")}>
          <option value="">All types</option>
          {knowledgeNodeTypes.map((nodeType) => <option key={nodeType} value={nodeType}>{nodeType}</option>)}
        </select>
      </div>
      {nodesError ? <p className="mt-4 text-sm text-red-600">{nodesError.message}</p> : null}
      <KnowledgeGraphCanvas nodes={nodes} relations={graphRelations} selectedNodeId={activeNodeId} onSelectNode={setSelectedNodeId} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="rounded border border-vault-line bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading ? <p className="p-3 text-sm text-zinc-500">Loading nodes...</p> : null}
          <div className="space-y-2">
            {nodes.map((node) => (
              <button key={node.id} className={`w-full rounded px-3 py-2 text-left text-sm ${node.id === activeNodeId ? "bg-vault-accent text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`} onClick={() => setSelectedNodeId(node.id)}>
                <span className="block truncate font-medium">{node.title}</span>
                <span className={`text-xs ${node.id === activeNodeId ? "text-white/75" : "text-zinc-500"}`}>{node.type}</span>
              </button>
            ))}
          </div>
          {!isLoading && nodes.length === 0 ? <p className="p-3 text-sm text-zinc-500">No nodes found.</p> : null}
        </aside>
        <div className="space-y-4">
          {selectedNode ? (
            <>
              <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedNode.title}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{selectedNode.type}</p>
                  </div>
                  <GitBranch className="text-vault-accent" size={22} />
                </div>
                <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">{selectedNode.description || "No description yet."}</p>
              </section>
              <NodeNotes nodeId={selectedNode.id} />
              <section className="grid gap-4 md:grid-cols-2">
                <RelationList title="Outgoing" relations={outgoing} nodes={allNodes} empty={relationsLoading ? "Loading..." : "No outgoing relations."} />
                <RelationList title="Incoming" relations={incoming} nodes={allNodes} empty={relationsLoading ? "Loading..." : "No incoming relations."} />
              </section>
              <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="font-semibold">Create Relation</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px]">
                  <select className="rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={targetNodeId} onChange={(e) => setTargetNodeId(e.target.value)}>
                    <option value="">Target node</option>
                    {allNodes.filter((node) => node.id !== selectedNode.id).map((node) => <option key={node.id} value={node.id}>{node.title} ({node.type})</option>)}
                  </select>
                  <select className="rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={relationType} onChange={(e) => setRelationType(e.target.value as RelationType)}>
                    {relationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <input className="mt-2 w-full rounded border border-vault-line bg-transparent px-3 py-2 text-sm dark:border-zinc-700" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                <Button className="mt-3" size="sm" variant="secondary" onClick={create} disabled={createRelation.isPending}><Plus size={15} /> Add relation</Button>
                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function KnowledgeGraphCanvas({ nodes, relations, selectedNodeId, onSelectNode }: { nodes: KnowledgeNode[]; relations: NodeRelation[]; selectedNodeId?: string; onSelectNode: (nodeId: string) => void }) {
  const visibleNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const visibleRelations = useMemo(() => relations.filter((relation) => visibleNodeIds.has(relation.source_node_id) && visibleNodeIds.has(relation.target_node_id)), [relations, visibleNodeIds]);
  const degreeByNode = useMemo(() => {
    const counts = new Map<string, number>();
    visibleRelations.forEach((relation) => {
      counts.set(relation.source_node_id, (counts.get(relation.source_node_id) ?? 0) + 1);
      counts.set(relation.target_node_id, (counts.get(relation.target_node_id) ?? 0) + 1);
    });
    return counts;
  }, [visibleRelations]);
  const positions = useMemo(() => {
    const center = { x: 450, y: 235 };
    if (nodes.length === 1) return new Map([[nodes[0].id, center]]);
    const radius = nodes.length > 8 ? 175 : 145;
    return new Map(nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
      return [node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }];
    }));
  }, [nodes]);

  const selectedRelations = useMemo(() => new Set(
    visibleRelations
      .filter((relation) => relation.source_node_id === selectedNodeId || relation.target_node_id === selectedNodeId)
      .map((relation) => relation.id)
  ), [selectedNodeId, visibleRelations]);

  if (nodes.length === 0) return null;

  return (
    <section className="mt-6 rounded border border-vault-line bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="font-semibold">Visual Graph</h2>
        <p className="text-xs text-zinc-500">{nodes.length} nodes · {visibleRelations.length} relations</p>
      </div>
      <div className="overflow-hidden rounded border border-vault-line bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <svg className="h-[340px] w-full md:h-[460px]" viewBox="0 0 900 470" role="img" aria-label="Knowledge graph visualization">
          <defs>
            <marker id="relation-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" className="fill-zinc-400 dark:fill-zinc-500" />
            </marker>
          </defs>
          {visibleRelations.map((relation) => {
            const source = positions.get(relation.source_node_id);
            const target = positions.get(relation.target_node_id);
            if (!source || !target) return null;
            const isActive = selectedRelations.has(relation.id);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            return (
              <g key={relation.id} className={isActive ? "opacity-100" : "opacity-45"}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} markerEnd="url(#relation-arrow)" className={isActive ? "stroke-vault-accent" : "stroke-zinc-400 dark:stroke-zinc-600"} strokeWidth={isActive ? 2.6 : 1.5} />
                <text x={midX} y={midY - 6} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">{relation.relation_type}</text>
              </g>
            );
          })}
          {nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const degree = degreeByNode.get(node.id) ?? 0;
            const isSelected = node.id === selectedNodeId;
            const isConnected = selectedNodeId ? visibleRelations.some((relation) => selectedRelations.has(relation.id) && (relation.source_node_id === node.id || relation.target_node_id === node.id)) : true;
            const radius = Math.min(34, 22 + degree * 3);
            return (
              <g key={node.id} className={`cursor-pointer ${isConnected || isSelected ? "opacity-100" : "opacity-35"}`} onClick={() => onSelectNode(node.id)}>
                <circle cx={position.x} cy={position.y} r={radius + 5} className={isSelected ? "fill-teal-100 dark:fill-teal-950" : "fill-white dark:fill-zinc-900"} />
                <circle cx={position.x} cy={position.y} r={radius} className={isSelected ? "fill-vault-accent stroke-teal-900" : "fill-white stroke-vault-accent dark:fill-zinc-900"} strokeWidth={isSelected ? 3 : 2} />
                <text x={position.x} y={position.y - 2} textAnchor="middle" className={isSelected ? "fill-white text-[12px] font-semibold" : "fill-vault-ink text-[12px] font-semibold dark:fill-zinc-100"}>{truncateNodeTitle(node.title)}</text>
                <text x={position.x} y={position.y + 13} textAnchor="middle" className={isSelected ? "fill-white/80 text-[10px]" : "fill-zinc-500 text-[10px]"}>{node.type}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function truncateNodeTitle(title: string) {
  return title.length > 16 ? `${title.slice(0, 15)}...` : title;
}

function NodeNotes({ nodeId }: { nodeId: string }) {
  const { data: links = [], isLoading } = useNoteLinksForNode(nodeId);
  return (
    <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold">Linked Notes</h2>
      {isLoading ? <p className="mt-3 text-sm text-zinc-500">Loading notes...</p> : null}
      {!isLoading && links.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No linked notes.</p> : null}
      <div className="mt-3 space-y-2">
        {links.map((link) => (
          <Link key={link.id} to={`/notes/${link.note_id}`} className="block rounded border border-vault-line px-3 py-2 text-sm hover:bg-black/5 dark:border-zinc-800 dark:hover:bg-white/10">
            <span className="block font-medium">{link.note?.title ?? `Note ${link.note_id.slice(0, 8)}`}</span>
            <span className="text-xs text-zinc-500">{link.link_type ?? "mentions"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelationList({ title, relations, nodes, empty }: { title: string; relations: Array<{ id: string; source_node_id: string; target_node_id: string; relation_type: string; description: string | null }>; nodes: Array<{ id: string; title: string }>; empty: string }) {
  const nodeTitle = (nodeId: string) => nodes.find((node) => node.id === nodeId)?.title ?? nodeId.slice(0, 8);
  return (
    <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold">{title}</h2>
      {relations.length === 0 ? <p className="mt-3 text-sm text-zinc-500">{empty}</p> : null}
      <div className="mt-3 space-y-2">
        {relations.map((relation) => (
          <div key={relation.id} className="rounded border border-vault-line px-3 py-2 text-sm dark:border-zinc-800">
            <p className="font-medium">{nodeTitle(relation.source_node_id)} to {nodeTitle(relation.target_node_id)}</p>
            <p className="text-xs text-zinc-500">{relation.relation_type}</p>
            {relation.description ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{relation.description}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
