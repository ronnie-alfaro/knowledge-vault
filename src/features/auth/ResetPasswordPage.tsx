import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { env } from "../../shared/lib/env";
import { supabase } from "../../shared/lib/supabase";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.VITE_APP_URL ?? location.origin}/update-password` });
    setMessage(error?.message ?? "Check your email for the reset link.");
  }
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form className="w-full max-w-md rounded border border-vault-line bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900" onSubmit={submit}>
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <input className="mt-5 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" />
        {message ? <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{message}</p> : null}
        <Button className="mt-4 w-full" type="submit">Send reset link</Button>
        <Link className="mt-4 block text-sm underline" to="/login">Back to login</Link>
      </form>
    </main>
  );
}
