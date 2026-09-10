import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { friendlyError } from "./friendlyError";

export interface AdminGroupRow {
  id: string;
  name: string | null;
  masechetEn: string;
  isChabura: boolean;
  isClass: boolean;
  createdAt: string;
  memberCount: number;
  teacherEmail: string | null;
}

export interface AdminGroupMember {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  joinedAt: string;
}

/** Every chabura and chevrusa, for support. Admin-only server-side (see
    admin_chaburot_schema.sql) — the ordinary group policies scope reads
    to your own membership, which is right for students and no use when
    someone asks why their talmid is missing. */
export function useAdminGroups(isAdmin: boolean) {
  const [groups, setGroups] = useState<AdminGroupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      const { data, error: err } = await supabase!.rpc("admin_list_groups");
      if (cancelled) return;
      if (err) {
        setError(friendlyError(err, "admin-groups"));
        setGroups([]);
      } else {
        setError(null);
        setGroups(
          (data ?? []).map(
            (g: {
              id: string;
              name: string | null;
              masechet_en: string;
              is_chabura: boolean;
              is_class: boolean;
              created_at: string;
              member_count: number;
              teacher_email: string | null;
            }) => ({
              id: g.id,
              name: g.name,
              masechetEn: g.masechet_en,
              isChabura: g.is_chabura,
              isClass: g.is_class,
              createdAt: g.created_at,
              memberCount: Number(g.member_count),
              teacherEmail: g.teacher_email,
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

  return { groups, loading, error, refresh };
}

/** One group's roster — loaded only when a row is opened, since the
    panel lists every group and most are never looked at. */
export function useAdminGroupMembers(groupId: string | null) {
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
              joined_at: string;
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
  }, [groupId]);

  return { members, loading, error };
}
