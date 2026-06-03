import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

export function SharedNotePage() {
  const { token } = useParams();
  const note = useQuery({
    queryKey: ["shared-note", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_note", { token: token! });
      if (error) throw error;
      if (!data[0]) throw new Error("This share link is invalid or expired.");
      return data[0];
    }
  });
  return (
    <main className="min-h-screen bg-vault-paper p-4 dark:bg-zinc-950">
      <article className="mx-auto max-w-3xl rounded border border-vault-line bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <Link className="text-sm font-semibold uppercase tracking-[0.2em] text-vault-accent" to="/login">Knowledge Vault</Link>
        {note.isLoading ? <p className="mt-8">Loading shared note...</p> : null}
        {note.error ? <p className="mt-8 text-red-600">{note.error.message}</p> : null}
        {note.data ? <>
          <h1 className="mt-6 text-4xl font-semibold">{note.data.title}</h1>
          <p className="mt-2 text-sm text-zinc-500">Shared by {note.data.owner_name ?? "a vault user"} · Updated {new Date(note.data.updated_at).toLocaleDateString()}</p>
          <div className="prose prose-zinc mt-8 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: note.data.content }} />
        </> : null}
      </article>
    </main>
  );
}
