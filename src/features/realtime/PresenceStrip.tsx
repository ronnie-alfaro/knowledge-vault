import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

export function PresenceStrip() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const channel = supabase.channel("vault-presence", { config: { presence: { key: crypto.randomUUID() } } });
    channel.on("presence", { event: "sync" }, () => setCount(Object.keys(channel.presenceState()).length));
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ online_at: new Date().toISOString() });
    });
    return () => { supabase.removeChannel(channel); };
  }, []);
  return <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">{count} active vault session{count === 1 ? "" : "s"}</p>;
}
