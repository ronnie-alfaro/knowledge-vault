import { BookOpen, Files, GitBranch, LayoutDashboard, LogOut, Moon, Search, Settings, Sun } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { useProfile } from "../../features/profile/profileHooks";
import { PresenceStrip } from "../../features/realtime/PresenceStrip";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: BookOpen },
  { href: "/knowledge", label: "Knowledge Graph", icon: GitBranch },
  { href: "/files", label: "Files", icon: Files },
  { href: "/profile", label: "Profile", icon: Settings }
];

export function AppLayout() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-vault-line bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:px-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-vault-accent">Knowledge</p>
            <h1 className="text-xl font-semibold">Vault</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDark((value) => !value)} title="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3">
          {nav.map((item) => (
            <NavLink key={item.href} to={item.href} className={({ isActive }) => cn("flex min-w-max items-center gap-3 rounded px-3 py-2 text-sm font-medium", isActive ? "bg-vault-accent text-white" : "text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10")}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-5 py-4 lg:block">
          <PresenceStrip />
        </div>
        <div className="hidden border-t border-vault-line p-4 dark:border-zinc-800 lg:block">
          <div className="mb-3 flex items-center gap-3">
            <img className="h-9 w-9 rounded object-cover" src={profile?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.email ?? "KV"}`} alt="" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.display_name || "Vault user"}</p>
              <p className="truncate text-xs text-zinc-500">{profile?.email}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={signOut}><LogOut size={16} /> Sign out</Button>
        </div>
      </aside>
      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-vault-line bg-vault-paper/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <Search size={18} className="text-zinc-500" />
          <span className="text-sm text-zinc-500">Search, write, connect ideas</span>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
