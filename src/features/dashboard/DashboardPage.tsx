import { BookOpen, Files, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";

type DashboardStats = { total_notes: number; total_tags: number; total_files: number };

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const [statRes, activityRes, tagsRes] = await Promise.all([
        supabase.rpc("get_dashboard_stats").single(),
        supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("note_tags").select("tags(name, color)").limit(20)
      ]);
      if (statRes.error) throw statRes.error;
      if (activityRes.error) throw activityRes.error;
      if (tagsRes.error) throw tagsRes.error;
      return { stats: statRes.data as DashboardStats, activity: activityRes.data, tags: tagsRes.data };
    }
  });
  const cards = [
    { label: "Total notes", value: stats.data?.stats.total_notes ?? 0, icon: BookOpen },
    { label: "Total tags", value: stats.data?.stats.total_tags ?? 0, icon: Tag },
    { label: "Uploaded files", value: stats.data?.stats.total_files ?? 0, icon: Files }
  ];
  return (
    <section>
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => <div key={card.label} className="rounded border border-vault-line bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><card.icon size={20} className="text-vault-accent" /><p className="mt-4 text-3xl font-semibold">{card.value}</p><p className="text-sm text-zinc-500">{card.label}</p></div>)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-vault-line bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Recent activity</h2>
          <div className="mt-3 space-y-3">
            {stats.data?.activity.map((event) => <p key={event.id} className="text-sm text-zinc-600 dark:text-zinc-400">{event.event_type.replace(".", " ")}: {event.subject_title ?? "Untitled"} <span className="text-xs text-zinc-500">{new Date(event.created_at).toLocaleDateString()}</span></p>)}
          </div>
        </section>
        <section className="rounded border border-vault-line bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Most used tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.data?.tags.map((row, index) => {
              const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
              return tag ? <span key={index} className="rounded px-2 py-1 text-xs text-white" style={{ background: tag.color }}>{tag.name}</span> : null;
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
