import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../shared/components/Button";
import { useSemanticSearch, useSuggestedConnections } from "./semanticHooks";

export function KnowledgeInsightsPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [threshold, setThreshold] = useState(0.85);
  const search = useSemanticSearch(submittedQuery);
  const suggestions = useSuggestedConnections(threshold);
  const canSearch = query.trim().length > 0;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) return;
    if (nextQuery === submittedQuery) {
      void search.refetch();
      return;
    }
    setSubmittedQuery(nextQuery);
  }

  return (
    <section>
      <div>
        <h1 className="text-3xl font-semibold">Knowledge Insights</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Semantic search and potential node connections from embeddings.</p>
      </div>
      <section className="mt-6 rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold">Semantic Search</h2>
        <form className="mt-3 flex gap-2" onSubmit={handleSearch}>
          <input
            className="min-w-0 flex-1 rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="gods associated with wisdom"
          />
          <Button type="submit" variant="secondary" disabled={!canSearch || search.isFetching}><Search size={16} /> Search</Button>
        </form>
        {search.error ? <p className="mt-3 text-sm text-red-600">{search.error.message}</p> : null}
        {search.isFetching ? <p className="mt-3 text-sm text-zinc-500">Searching semantic memory...</p> : null}
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {search.data?.map((result) => (
            <Link key={`${result.source_type}-${result.source_id}`} to={result.source_type === "note" ? `/notes/${result.source_id}` : "/knowledge"} className="rounded border border-vault-line p-3 text-sm hover:bg-black/5 dark:border-zinc-800 dark:hover:bg-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{result.title}</p>
                <span className="text-xs text-vault-accent">{Math.round(result.score * 100)}%</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">{result.source_type}</p>
              <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{result.preview}</p>
            </Link>
          ))}
        </div>
        {!search.isFetching && submittedQuery && search.data?.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No semantic matches yet. Edit and save a few notes or knowledge nodes so embeddings can be generated.</p>
        ) : null}
      </section>
      <section className="mt-6 rounded border border-vault-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Potential Connections</h2>
            <p className="mt-1 text-xs text-zinc-500">Suggestions appear when similarity meets the threshold.</p>
          </div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Threshold
            <input className="ml-2 w-20 rounded border border-vault-line bg-transparent px-2 py-1 dark:border-zinc-700" type="number" min="0.5" max="0.99" step="0.01" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
          </label>
        </div>
        {suggestions.error ? <p className="mt-3 text-sm text-red-600">{suggestions.error.message}</p> : null}
        <div className="mt-4 space-y-3">
          {suggestions.data?.map((item) => (
            <div key={`${item.source_node_id}-${item.target_node_id}`} className="rounded border border-vault-line p-3 text-sm dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">{item.source_title} ↔ {item.target_title}</p>
                <span className="text-vault-accent">{Math.round(item.score * 100)}%</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Suggested relation: <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.suggested_relation}</span></p>
            </div>
          ))}
          {!suggestions.isLoading && suggestions.data?.length === 0 ? <p className="text-sm text-zinc-500">No suggestions above this threshold yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
