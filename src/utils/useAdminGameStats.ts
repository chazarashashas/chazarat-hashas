import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { friendlyError } from "./friendlyError";
import { normalizeGameStats, type GameStats } from "./useGameStats";

/** Shown instead of a generic failure when the function simply doesn't
    exist yet — the admin is the one person who can fix that. */
const NOT_SET_UP = "Game scores need one Supabase step: run admin_game_stats_schema.sql in the SQL editor.";

/**
 * Every account's Practice game record, keyed by user id. Reads
 * admin_game_stats() (admin_game_stats_schema.sql), which checks the
 * caller's is_admin flag server-side and returns only the gameStats part
 * of each synced user_data blob. An account with no entry has never
 * played while signed in.
 */
export function useAdminGameStats(isAdmin: boolean) {
  const [byUser, setByUser] = useState<Map<string, GameStats>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    // Marking the fetch as in-flight is a legitimate reaction to
    // isAdmin/tick changing, not something derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    supabase.rpc("admin_game_stats").then(({ data, error: err }) => {
      if (cancelled) return;
      setLoading(false);
      if (err) {
        setError(err.code === "PGRST202" ? NOT_SET_UP : friendlyError(err, "admin-game-stats"));
        return;
      }
      setError(null);
      const rows = (data as { id: string; game_stats: Partial<GameStats> | null }[]) ?? [];
      setByUser(new Map(rows.map((r) => [r.id, normalizeGameStats(r.game_stats)])));
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, tick]);

  return { byUser, loading, error, refresh };
}
