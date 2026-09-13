import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { friendlyError } from "./friendlyError";

/** Shown instead of a generic failure when an admin function doesn't
    exist yet — the admin is the one person who can fix that. */
export const ADMIN_SQL_MISSING = "This needs the admin SQL: run admin_panel_v2_schema.sql in Supabase's SQL editor.";

/** Messages the admin functions raise on purpose (admin_panel_v2_schema.sql).
    These are written for the person reading them, so they are shown as-is;
    anything else is a raw database error and goes through friendlyError. */
const OWN_MESSAGES = [
  "A dedication is required.",
  "A username is required.",
  "That username is already taken.",
  "You can't remove your own admin access.",
  "That person isn't in this chabura.",
  "A masechet is required.",
];

function adminErrorMessage(err: { code?: string; message?: string }, context: string): string {
  if (err.code === "PGRST202") return ADMIN_SQL_MISSING;
  const own = OWN_MESSAGES.find((m) => err.message?.includes(m));
  return own ?? friendlyError(err, context);
}

/**
 * Reads one admin-only function. `args` null means "not yet" (a drawer
 * with nothing open). The function checks the caller's is_admin flag
 * server-side, so a non-admin only ever gets an error, never data.
 */
export function useAdminRpc<T>(
  fn: string,
  args: Record<string, unknown> | null,
  map: (data: unknown) => T,
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  // Callers pass module-level mappers, so `map` is stable across renders.
  const argsKey = args === null ? null : JSON.stringify(args);

  useEffect(() => {
    if (argsKey === null || !supabase) return;
    let cancelled = false;
    // Marking the fetch as in-flight reacts to the arguments or a refresh
    // changing — not something derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    supabase.rpc(fn, JSON.parse(argsKey)).then(({ data: raw, error: err }) => {
      if (cancelled) return;
      setLoading(false);
      if (err) {
        setError(adminErrorMessage(err, `admin-${fn}`));
        return;
      }
      setError(null);
      setData(map(raw));
    });
    return () => {
      cancelled = true;
    };
  }, [fn, argsKey, tick, map]);

  return { data, loading, error, refresh };
}

/** Runs one admin action. Returns an error message, or null on success. */
export async function adminAction(fn: string, args: Record<string, unknown>): Promise<string | null> {
  if (!supabase) return "Accounts aren't connected yet.";
  const { error } = await supabase.rpc(fn, args);
  return error ? adminErrorMessage(error, `admin-${fn}`) : null;
}
