import { Github, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { env } from "../../shared/lib/env";
import { supabase } from "../../shared/lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<"password" | "oauth" | "guest" | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoadingAction("password");
    const response = mode === "signin" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setLoadingAction(null);
    if (response.error) {
      setMessage(response.error.message);
      return;
    }
    navigate("/dashboard");
  }

  async function oauth(provider: "google" | "github") {
    setMessage("");
    setLoadingAction("oauth");
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${env.VITE_APP_URL ?? location.origin}/auth/callback` } });
    if (error) {
      setMessage(error.message);
      setLoadingAction(null);
    }
  }

  async function continueAsGuest() {
    setMessage("");
    setLoadingAction("guest");
    const { error } = await supabase.auth.signInAnonymously();
    setLoadingAction(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-vault-paper p-4 dark:bg-zinc-950">
      <section className="w-full max-w-md rounded border border-vault-line bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <img className="mx-auto h-36 w-auto object-contain sm:h-44" src="/knowledge-vault-logo.jpg" alt="Knowledge Vault" />
        <h1 className="mt-2 text-3xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your vault"}</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">Email<input className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label className="block text-sm font-medium">Password<input className="mt-1 w-full rounded border border-vault-line bg-transparent px-3 py-2 dark:border-zinc-700" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required /></label>
          {message ? <p className="text-sm text-red-600">{message}</p> : null}
          <Button className="w-full" type="submit" disabled={loadingAction !== null}>{loadingAction === "password" ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}</Button>
        </form>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={loadingAction !== null} onClick={() => oauth("google")}>Google</Button>
          <Button variant="secondary" disabled={loadingAction !== null} onClick={() => oauth("github")}><Github size={16} /> GitHub</Button>
        </div>
        <div className="mt-4 border-t border-vault-line pt-4 dark:border-zinc-800">
          <Button className="w-full" variant="ghost" disabled={loadingAction !== null} onClick={continueAsGuest}>
            <Sparkles size={16} /> {loadingAction === "guest" ? "Opening guest vault..." : "Try without an account"}
          </Button>
          <p className="mt-2 text-center text-xs text-zinc-500">Explore the vault now. Add email/password later to keep it long term.</p>
        </div>
        <div className="mt-5 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <button className="underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Need an account?" : "Have an account?"}</button>
          <Link className="underline" to="/reset-password">Reset password</Link>
        </div>
      </section>
    </main>
  );
}
