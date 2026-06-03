import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { supabase } from "../../shared/lib/supabase";

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else navigate("/dashboard");
  }
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form className="w-full max-w-md rounded border border-vault-line bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900" onSubmit={submit}>
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <input className="mt-5 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
        {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
        <Button className="mt-4 w-full" type="submit">Update password</Button>
      </form>
    </main>
  );
}
