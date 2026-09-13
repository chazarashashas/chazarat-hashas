import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { friendlyError } from "./friendlyError";
import { useAdminRpc } from "./adminRpc";

export interface AdminGroupRow {
  id: string;
  name: string | null;
  masechetEn: string;
  isChabura: boolean;
  isClass: boolean;
  createdAt: string;
  memberCount: number;
  teacherEmail: string | null;
  joinCode: string | null;
  pendingInvites: number;
  lastSubmission: string | null;
  archivedAt: string | null;
}

export interface AdminGroupMember {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  /** Null for anyone who joined before join dates were recorded. */
  joinedAt: string | null;
}

export function mapAdminGroups(data: unknown): AdminGroupRow[] {
  return ((data as Record<string, unknown>[] | null) ?? []).map((g) => ({
    id: g.id as string,
    name: (g.name as string | null) ?? null,
    masechetEn: g.masechet_en as string,
    isChabura: Boolean(g.is_chabura),
    isClass: Boolean(g.is_class),
    createdAt: g.created_at as string,
    memberCount: Number(g.member_count) || 0,
    teacherEmail: (g.teacher_email as string | null) ?? null,
    joinCode: (g.join_code as string | null) ?? null,
    pendingInvites: Number(g.pending_invites) || 0,
    lastSubmission: (g.last_submission as string | null) ?? null,
    archivedAt: (g.archived_at as string | null) ?? null,
  }));
}

/** Every chabura and chevrusa, for support. Admin-only server-side (see
    admin_panel_v2_schema.sql) — the ordinary group policies scope reads
    to your own membership, which is right for students and no use when
    someone asks why their talmid is missing. */
export function useAdminGroups(isAdmin: boolean) {
  const { data, loading, error, refresh } = useAdminRpc("admin_list_groups", isAdmin ? {} : null, mapAdminGroups, []);
  return { groups: data, loading, error, refresh };
}

/** One group's roster — loaded only when a row is opened, since the
    panel lists every group and most are never looked at. */
export function useAdminGroupMembers(groupId: string | null, tick = 0) {
  const [members, setMembers] = useState<AdminGroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No clearing branch: the drawer unmounts when it closes, so this
    // hook starts from empty every time it is opened anyway.
    if (!groupId || !supabase) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      const { data, error: err } = await supabase!.rpc("admin_group_members", { p_group_id: groupId });
      if (cancelled) return;
      if (err) {
        setError(friendlyError(err, "admin-group-members"));
        setMembers([]);
      } else {
        setError(null);
        setMembers(
          (data ?? []).map(
            (m: {
              user_id: string;
              email: string;
              first_name: string | null;
              last_name: string | null;
              role: string;
              joined_at: string | null;
            }) => ({
              userId: m.user_id,
              email: m.email,
              firstName: m.first_name,
              lastName: m.last_name,
              role: m.role,
              joinedAt: m.joined_at,
            }),
          ),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, tick]);

  return { members, loading, error };
}
