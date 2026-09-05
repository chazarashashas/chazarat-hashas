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
  fromName: string | null;
}

export interface SentInvite {
  id: string;
  groupId: string;
  masechetEn: string;
  groupName: string | null;
  isChabura: boolean;
  invitedEmail: string;
  status: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Translates raw Postgres/Supabase error text into something a student
    can actually act on — nobody should see "duplicate key value
    violates unique constraint" in this app. */
function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("duplicate key") && lower.includes("group_members")) {
    return "You're already in this group.";
  }
  if (lower.includes("duplicate key")) {
    return "That's already been done.";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Couldn't reach the server — check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
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
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);

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
      setSentInvites([]);
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
      .select("id, group_id, invited_by, groups(name, masechet_en, is_chabura)")
      .eq("invited_email", session.user.email)
      .eq("status", "pending");

    const inviterIds = Array.from(new Set((invitesData ?? []).map((inv) => inv.invited_by as string)));
    const { data: inviterProfiles } = inviterIds.length
      ? await supabase.from("profiles").select("id, username, first_name").in("id", inviterIds)
      : { data: [] as { id: string; username: string | null; first_name: string | null }[] };
    const inviterById = new Map((inviterProfiles ?? []).map((p) => [p.id, p]));

    setPendingInvites(
      (invitesData ?? []).map((inv) => {
        const g = inv.groups as unknown as
          | { name: string | null; masechet_en: string; is_chabura: boolean }
          | null;
        const inviter = inviterById.get(inv.invited_by as string);
        return {
          id: inv.id,
          groupId: inv.group_id,
          masechetEn: g?.masechet_en ?? "",
          groupName: g?.name ?? null,
          isChabura: g?.is_chabura ?? false,
          fromName: inviter?.first_name ?? inviter?.username ?? null,
        };
      }),
    );

    const { data: sentData } = await supabase
      .from("group_invites")
      .select("id, group_id, invited_email, status, groups(name, masechet_en, is_chabura)")
      .eq("invited_by", session.user.id)
      .in("status", ["pending", "declined"]);

    setSentInvites(
      (sentData ?? []).map((inv) => {
        const g = inv.groups as unknown as
          | { name: string | null; masechet_en: string; is_chabura: boolean }
          | null;
        return {
          id: inv.id,
          groupId: inv.group_id,
          masechetEn: g?.masechet_en ?? "",
          groupName: g?.name ?? null,
          isChabura: g?.is_chabura ?? false,
          invitedEmail: inv.invited_email,
          status: inv.status,
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

    const myEmailEarly = session.user.email?.toLowerCase();
    const typedSomething = inviteEmails.some((e) => e.trim());
    const onlySelf =
      typedSomething && inviteEmails.every((e) => !e.trim() || e.trim().toLowerCase() === myEmailEarly);
    if (onlySelf) return "You can't invite yourself — enter someone else's email.";

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ masechet_en: masechetEn, is_chabura: isChabura, name, created_by: session.user.id })
      .select("id")
      .single();
    if (groupError || !group) return groupError ? friendlyError(groupError.message) : "Couldn't create the group.";

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: session.user.id });
    if (memberError) return friendlyError(memberError.message);

    const myEmail = session.user.email?.toLowerCase();
    const validEmails = Array.from(
      new Set(
        inviteEmails
          .map((e) => e.trim().toLowerCase())
          .filter((e) => Boolean(e) && e !== myEmail),
      ),
    );
    if (validEmails.length > 0) {
      const { error: inviteError } = await supabase
        .from("group_invites")
        .insert(validEmails.map((email) => ({ group_id: group.id, invited_email: email, invited_by: session.user.id })));
      if (inviteError) return friendlyError(inviteError.message);
    }

    await refresh();
    return null;
  }

  /** Invites more people (by email) to a group that already exists —
      only meant for chabura groups; a chevrusa stays a fixed pair by
      design, so this isn't offered there in the UI. */
  async function addMembers(groupId: string, emails: string[]): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";

    const myEmail = session.user.email?.toLowerCase();
    const validEmails = Array.from(
      new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => Boolean(e) && e !== myEmail)),
    );
    if (validEmails.length === 0) return "Enter at least one email that isn't your own.";

    const { error } = await supabase
      .from("group_invites")
      .insert(validEmails.map((email) => ({ group_id: groupId, invited_email: email, invited_by: session.user.id })));
    if (error) return friendlyError(error.message);

    await refresh();
    return null;
  }

  async function acceptInvite(invite: PendingInvite): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: invite.groupId, user_id: session.user.id });
    if (memberError) return friendlyError(memberError.message);

    const { error: updateError } = await supabase
      .from("group_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);
    if (updateError) return friendlyError(updateError.message);

    await refresh();
    return null;
  }

  async function declineInvite(invite: PendingInvite): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.from("group_invites").update({ status: "declined" }).eq("id", invite.id);
    if (error) return friendlyError(error.message);
    await refresh();
    return null;
  }

  /** Cancels an invite you sent, whether it's still pending or was
      declined — the sender shouldn't have to keep seeing a dead invite
      in their own list forever. */
  async function cancelInvite(invite: SentInvite): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.from("group_invites").delete().eq("id", invite.id);
    if (error) return friendlyError(error.message);
    await refresh();
    return null;
  }

  /** Leaves a group — removes just your own membership row. If you were
      the last member, the group itself is left orphaned (harmless: with
      nobody left in group_members, nobody's RLS policy can see it
      anymore, so it simply stops appearing anywhere). */
  async function leaveGroup(groupId: string): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", session.user.id);
    if (error) return friendlyError(error.message);
    await refresh();
    return null;
  }

  return {
    groups,
    pendingInvites,
    sentInvites,
    createGroup,
    addMembers,
    acceptInvite,
    declineInvite,
    cancelInvite,
    leaveGroup,
    refresh,
  };
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
