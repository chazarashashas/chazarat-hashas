import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface AdminOverview {
  totalUsers: number;
  totalGroups: number;
  totalChaburot: number;
  totalChevrusot: number;
  totalSiyumim: number;
  totalClaims: number;
  learnedClaims: number;
  openPerakim: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  country: string | null;
  isAdmin: boolean;
  createdAt: string;
  mishnayotLearned: number;
  /** "google" or "email" — from auth.users' own provider field, not a
      guess (see admin_setup.sql). */
  signedUpVia: string;
}

/** Reads the two admin-only SECURITY DEFINER functions (see
    admin_setup.sql) — both check the caller's own is_admin flag
    server-side before returning anything, so a non-admin calling
    these just gets an error, not partial data. */
export function useAdmin(isAdmin: boolean) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by refresh() to re-run the effect below — this screen otherwise
  // only ever fetches once, on mount, so anyone who signs up while an
  // admin already has the tab open just doesn't appear until they leave
  // and come back.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [overviewRes, usersRes] = await Promise.all([
        supabase!.rpc("admin_overview").single(),
        supabase!.rpc("admin_list_users"),
      ]);
      if (cancelled) return;
      if (overviewRes.error || usersRes.error) {
        setError((overviewRes.error ?? usersRes.error)?.message ?? "Failed to load admin data.");
        setLoading(false);
        return;
      }
      const o = overviewRes.data as Record<string, number>;
      setOverview({
        totalUsers: Number(o.total_users),
        totalGroups: Number(o.total_groups),
        totalChaburot: Number(o.total_chaburot),
        totalChevrusot: Number(o.total_chevrusot),
        totalSiyumim: Number(o.total_siyumim),
        totalClaims: Number(o.total_claims),
        learnedClaims: Number(o.learned_claims),
        openPerakim: Number(o.open_perakim),
      });
      setUsers(
        (usersRes.data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          email: r.email as string,
          username: r.username as string | null,
          firstName: r.first_name as string | null,
          lastName: r.last_name as string | null,
          city: r.city as string | null,
          country: r.country as string | null,
          isAdmin: Boolean(r.is_admin),
          createdAt: r.created_at as string,
          mishnayotLearned: Number(r.mishnayot_learned),
          signedUpVia: (r.signed_up_via as string) ?? "email",
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, refreshTick]);

  function refresh() {
    setRefreshTick((n) => n + 1);
  }

  return { overview, users, loading, error, refresh };
}
