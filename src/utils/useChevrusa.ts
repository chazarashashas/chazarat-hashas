import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";

export interface GroupMember {
  userId: string;
  username: string | null;
  firstName: string | null;
  lastLearnedDate: string | null;
}

export interface Group {
  id: string;
  name: string | null;
  masechetEn: string;
  isChabura: boolean;
  members: GroupMember[];
}

export interface PendingInvite {
  id: string;
  groupId: string;
  masechetEn: string;
  groupName: string | null;
  isChabura: boolean;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Real chevrusa/chabura data, backed by four tables (groups,
    group_members, group_invites, group_activity — see the SQL handed
    alongside this). Invites are stored by email (Supabase gives no way
    to look up a user by email from the client), and group_activity is a
    deliberately minimal "learned today, yes/no" signal per member — not
    full data sharing, matching the original no-streaks/no-shared-notes
    design. */
export function useChevrusa() {
  const { session } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Reset synchronously during render when the session goes away (log
  // out, or a different user logs in on this device) — adjusting state
  // during render rather than in the effect below, so this doesn't count
  // as a synchronous setState-in-effect.
  const sessionId = session?.user.id ?? null;
  const [trackedSessionId, setTrackedSessionId] = useState<string | null>(sessionId);
  if (trackedSessionId !== sessionId) {
    setTrackedSessionId(sessionId);
    if (!sessionId) {
      setGroups([]);
      setPendingInvites([]);
    }
  }

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", session.user.id);
    const groupIds = (memberships ?? []).map((m) => m.group_id as string);

    if (groupIds.length > 0) {
      const [{ data: groupsData }, { data: membersData }, { data: activityData }] = await Promise.all([
        supabase.from("groups").select("id, name, masechet_en, is_chabura").in("id", groupIds),
        supabase.from("group_members").select("group_id, user_id").in("group_id", groupIds),
        supabase.from("group_activity").select("group_id, user_id, last_learned_date").in("group_id", groupIds),
      ]);

      const memberUserIds = Array.from(new Set((membersData ?? []).map((m) => m.user_id as string)));
      const { data: profilesData } = memberUserIds.length
        ? await supabase.from("profiles").select("id, username, first_name").in("id", memberUserIds)
        : { data: [] as { id: string; username: string | null; first_name: string | null }[] };

      const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]));
      const activityByKey = new Map(
        (activityData ?? []).map((a) => [`${a.group_id}:${a.user_id}`, a.last_learned_date as string]),
      );

      const built: Group[] = (groupsData ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        masechetEn: g.masechet_en,
        isChabura: g.is_chabura,
        members: (membersData ?? [])
          .filter((m) => m.group_id === g.id)
          .map((m) => {
            const profile = profileById.get(m.user_id);
            return {
              userId: m.user_id as string,
              username: profile?.username ?? null,
              firstName: profile?.first_name ?? null,
              lastLearnedDate: activityByKey.get(`${g.id}:${m.user_id}`) ?? null,
            };
          }),
      }));
      setGroups(built);
    } else {
      setGroups([]);
    }

    const { data: invitesData } = await supabase
      .from("group_invites")
      .select("id, group_id, groups(name, masechet_en, is_chabura)")
      .eq("invited_email", session.user.email)
      .eq("status", "pending");

    setPendingInvites(
      (invitesData ?? []).map((inv) => {
        const g = inv.groups as unknown as
          | { name: string | null; masechet_en: string; is_chabura: boolean }
          | null;
        return {
          id: inv.id,
          groupId: inv.group_id,
          masechetEn: g?.masechet_en ?? "",
          groupName: g?.name ?? null,
          isChabura: g?.is_chabura ?? false,
        };
      }),
    );
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [session, refresh]);

  async function createGroup(
    masechetEn: string,
    isChabura: boolean,
    name: string | null,
    inviteEmails: string[],
  ): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ masechet_en: masechetEn, is_chabura: isChabura, name, created_by: session.user.id })
      .select("id")
      .single();
    if (groupError || !group) return groupError?.message ?? "Couldn't create the group.";

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: session.user.id });
    if (memberError) return memberError.message;

    const validEmails = Array.from(new Set(inviteEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    if (validEmails.length > 0) {
      const { error: inviteError } = await supabase
        .from("group_invites")
        .insert(validEmails.map((email) => ({ group_id: group.id, invited_email: email, invited_by: session.user.id })));
      if (inviteError) return inviteError.message;
    }

    await refresh();
    return null;
  }

  async function acceptInvite(invite: PendingInvite): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: invite.groupId, user_id: session.user.id });
    if (memberError) return memberError.message;

    const { error: updateError } = await supabase
      .from("group_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);
    if (updateError) return updateError.message;

    await refresh();
    return null;
  }

  async function declineInvite(invite: PendingInvite): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.from("group_invites").update({ status: "declined" }).eq("id", invite.id);
    if (error) return error.message;
    await refresh();
    return null;
  }

  return { groups, pendingInvites, createGroup, acceptInvite, declineInvite, refresh };
}

/** Records "learned today" for every group the user is in on this
    masechet — called from wherever a real completion happens (Daily
    Limmud's Mark as learned), not from the Chevrusa screen itself, so
    the signal reflects genuine study rather than a self-report button. */
export async function recordGroupActivityForMasechet(userId: string, masechetEn: string) {
  if (!supabase) return;
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups!inner(masechet_en)")
    .eq("user_id", userId)
    .eq("groups.masechet_en", masechetEn);
  const date = todayStr();
  const rows = (memberships ?? []).map((m) => ({
    group_id: m.group_id as string,
    user_id: userId,
    last_learned_date: date,
  }));
  if (rows.length > 0) {
    await supabase.from("group_activity").upsert(rows);
  }
}
