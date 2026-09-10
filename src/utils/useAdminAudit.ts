import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { friendlyError } from "./friendlyError";

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetEmail: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

/** The actions worth a line in the log. Anything that changes or reveals
    another account's data belongs here; read-only browsing of the panel
    itself does not. */
export type AuditAction = "reset_user_data" | "delete_user" | "view_as";

const ACTION_LABELS: Record<string, string> = {
  reset_user_data: "Reset trackers",
  delete_user: "Deleted account",
  view_as: "Viewed as rebbe",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/**
 * Writes one entry. Deliberately fire-and-forget from the caller's point
 * of view but awaited internally, so a failed log never blocks or undoes
 * the action it describes — a reset that worked must not look like it
 * failed because logging did. A failure to log is reported instead.
 */
export async function logAdminAction(
  action: AuditAction,
  target: { id?: string; email?: string } = {},
  detail: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("log_admin_action", {
    p_action: action,
    p_target_id: target.id ?? null,
    p_target_email: target.email ?? null,
    p_detail: detail,
  });
  if (error) friendlyError(error, "admin-audit-write");
}

/** Reads the log. Admin-only server-side (see admin_audit_log_schema.sql);
    a non-admin calling this gets an error rather than partial data. */
export function useAdminAudit(isAdmin: boolean) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    // Reacting to isAdmin/tick changing, not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      const { data, error: err } = await supabase!.rpc("admin_audit_log_list");
      if (cancelled) return;
      if (err) {
        // The panel's own §1 complaint: a raw Postgres string used to
        // render here as body copy. It goes to monitoring instead.
        setError(friendlyError(err, "admin-audit-list"));
        setEntries([]);
      } else {
        setError(null);
        setEntries(
          (data ?? []).map(
            (r: {
              id: string;
              actor_email: string;
              action: string;
              target_email: string | null;
              detail: Record<string, unknown> | null;
              created_at: string;
            }) => ({
              id: r.id,
              actorEmail: r.actor_email,
              action: r.action,
              targetEmail: r.target_email,
              detail: r.detail ?? {},
              createdAt: r.created_at,
            }),
          ),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, tick]);

  return { entries, loading, error, refresh };
}
