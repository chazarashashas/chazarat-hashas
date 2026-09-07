import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import type { Pace } from "./useLearningProgress";

export type GroupRole = "member" | "teacher";

export interface GroupMember {
  userId: string;
  username: string | null;
  firstName: string | null;
  lastLearnedDate: string | null;
  role: GroupRole;
}

export interface Group {
  id: string;
  name: string | null;
  masechetEn: string;
  isChabura: boolean;
  /** A teacher-led chabura: visibility is restricted (see GroupCard) so
      students see only themselves and the teacher, never each other —
      everything else about a class works exactly like a regular
      chabura. Always false for a chevrusa. */
  isClass: boolean;
  /** The agreed pace this group learns its masechet at — set once when
      the group is created, so everyone in it (and Daily Limmud's group
      context) stays consistent without re-choosing it each time. */
  pace: Pace;
  members: GroupMember[];
  /** Faster than emailing eighteen addresses — a student who has the
      code joins directly (see joinGroupByCode). Only ever set for a
      class chabura; null otherwise. */
  joinCode: string | null;
}

/** Whether I hold the "teacher" role in at least one class chabura — the
    rebbe dashboard's sidebar entry and role gate both key off this
    rather than a separate account type, since a rebbe who also learns
    keeps their own streak and notes on the same account. */
export function isRebbe(groups: Group[], userId: string | undefined): boolean {
  if (!userId) return false;
  return groups.some((g) => g.isClass && g.members.some((m) => m.userId === userId && m.role === "teacher"));
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
        supabase.from("groups").select("id, name, masechet_en, is_chabura, is_class, pace, join_code").in("id", groupIds),
        supabase.from("group_members").select("group_id, user_id, role").in("group_id", groupIds),
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
        isClass: g.is_class,
        pace: (g.pace as Pace) ?? "1",
        joinCode: (g.join_code as string | null) ?? null,
        members: (membersData ?? [])
          .filter((m) => m.group_id === g.id)
          .map((m) => {
            const profile = profileById.get(m.user_id);
            return {
              userId: m.user_id as string,
              username: profile?.username ?? null,
              firstName: profile?.first_name ?? null,
              lastLearnedDate: activityByKey.get(`${g.id}:${m.user_id}`) ?? null,
              role: (m.role as GroupRole) ?? "member",
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
    pace: Pace = "1",
    isClass = false,
  ): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";

    const myEmailEarly = session.user.email?.toLowerCase();
    const typedSomething = inviteEmails.some((e) => e.trim());
    const onlySelf =
      typedSomething && inviteEmails.every((e) => !e.trim() || e.trim().toLowerCase() === myEmailEarly);
    if (onlySelf) return "You can't invite yourself — enter someone else's email.";

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        masechet_en: masechetEn,
        is_chabura: isChabura,
        is_class: isClass,
        pace,
        name,
        created_by: session.user.id,
      })
      .select("id")
      .single();
    if (groupError || !group) return groupError ? friendlyError(groupError.message) : "Couldn't create the group.";

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: session.user.id, role: isClass ? "teacher" : "member" });
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

    const { data: existing } = await supabase
      .from("group_invites")
      .select("invited_email")
      .eq("group_id", groupId)
      .eq("status", "pending");
    const alreadyInvited = new Set((existing ?? []).map((e) => e.invited_email as string));
    const newEmails = validEmails.filter((e) => !alreadyInvited.has(e));
    if (newEmails.length === 0) return "That person's already been invited.";

    const { error } = await supabase
      .from("group_invites")
      .insert(newEmails.map((email) => ({ group_id: groupId, invited_email: email, invited_by: session.user.id })));
    if (error) return friendlyError(error.message);

    await refresh();
    return null;
  }

  /** Moves a chevrusa/chabura on to a different masechet — the shared
      group-level fact everyone in it is learning, so this updates the
      group itself (not just one member's view). Used when a group
      finishes its current masechet and moves on together. */
  async function updateGroupMasechet(groupId: string, newMasechetEn: string): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.from("groups").update({ masechet_en: newMasechetEn }).eq("id", groupId);
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

  /** Leaves a group — removes your own membership row and, per the
      dashboard brief's "leaving takes the data with it," your own
      submission history for it too. Explicit rather than relying on a
      cascade, so leaving doesn't silently depend on delete order. If you
      were the last member, the group itself is left orphaned (harmless:
      with nobody left in group_members, nobody's RLS policy can see it
      anymore, so it simply stops appearing anywhere). */
  async function leaveGroup(groupId: string): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    await supabase.from("group_submissions").delete().eq("group_id", groupId).eq("user_id", session.user.id);
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", session.user.id);
    if (error) return friendlyError(error.message);
    await refresh();
    return null;
  }

  /** Joins a chabura by its join code — the student's own action of
      entering a code they were given is the consent, same as accepting
      an emailed invite (see join_group_by_code in the schema). */
  async function joinByCode(code: string): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    const { error } = await supabase.rpc("join_group_by_code", { p_code: code.trim() });
    if (error) return error.message.includes("Invalid") ? error.message : friendlyError(error.message);
    await refresh();
    return null;
  }

  /** Generates this chabura's first join code, or rotates it — old codes
      stop working immediately since lookup is by exact match. */
  async function rotateJoinCode(groupId: string): Promise<{ code: string | null; error: string | null }> {
    if (!supabase) return { code: null, error: "Accounts aren't connected yet." };
    const { data, error } = await supabase.rpc("rotate_join_code", { p_group_id: groupId });
    if (error) return { code: null, error: friendlyError(error.message) };
    await refresh();
    return { code: data as string, error: null };
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
    updateGroupMasechet,
    joinByCode,
    rotateJoinCode,
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
