import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : "Something went wrong";
  return (
    <main className="grid min-h-screen place-items-center bg-vault-paper p-6 dark:bg-zinc-950">
      <section className="max-w-md rounded border border-vault-line bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold">Knowledge Vault hit an error</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      </section>
    </main>
  );
}
