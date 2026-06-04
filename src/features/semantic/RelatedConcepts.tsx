import { useRelatedNodes } from "./semanticHooks";

export function RelatedConcepts({ nodeId }: { nodeId: string }) {
  const { data = [], isLoading, error } = useRelatedNodes(nodeId);
  return (
    <section className="rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold">Related Concepts</h2>
      {isLoading ? <p className="mt-3 text-sm text-zinc-500">Finding similar concepts...</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error.message}</p> : null}
      {!isLoading && !error && data.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No related concepts yet.</p> : null}
      <div className="mt-3 space-y-2">
        {data.slice(0, 10).map((node) => (
          <div key={node.node_id} className="rounded border border-vault-line px-3 py-2 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-medium">{node.title}</p>
              <span className="text-xs text-vault-accent">{Math.round(node.score * 100)}%</span>
            </div>
            <p className="text-xs text-zinc-500">{node.type}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
