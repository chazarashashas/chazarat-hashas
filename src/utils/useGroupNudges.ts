import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";

export interface ReceivedNudge {
  id: string;
  groupId: string;
  fromName: string;
  note: string | null;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function friendlyNudgeError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("duplicate key")) return "Already nudged today.";
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You can't nudge them.";
  }
  return "Couldn't send that — please try again.";
}

/** Who's already been nudged today in this one group — enough for the
    member list to show or hide the Nudge pill correctly. See
    chizuk_nudge_schema.sql for the one-per-person-per-day rule. */
export function useGroupNudges(groupId: string) {
  const { session } = useAuth();
  const [nudgedTodayIds, setNudgedTodayIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    const { data } = await supabase
      .from("group_nudges")
      .select("to_user_id")
      .eq("group_id", groupId)
      .eq("nudge_date", todayStr());
    setNudgedTodayIds(new Set((data ?? []).map((r) => r.to_user_id as string)));
  }, [groupId, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function sendNudge(toUserId: string, note: string): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    const { error } = await supabase.from("group_nudges").insert({
      group_id: groupId,
      from_user_id: session.user.id,
      to_user_id: toUserId,
      note: note.trim() || null,
    });
    if (error) return friendlyNudgeError(error.message);
    setNudgedTodayIds((prev) => new Set(prev).add(toUserId));
    return null;
  }

  return { nudgedTodayIds, sendNudge };
}

/** Chizuk sent to *me*, today, across every group I'm in — what Home and
    the chevrusa/chabura screens show the recipient. Not scoped to one
    group since a single account can be nudged in any of several. */
export function useMyNudgesToday() {
  const { session } = useAuth();
  const [nudges, setNudges] = useState<ReceivedNudge[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase || !session) {
      setNudges([]);
      return;
    }
    const { data } = await supabase
      .from("group_nudges")
      .select("id, group_id, note, from_user_id")
      .eq("to_user_id", session.user.id)
      .eq("nudge_date", todayStr());
    const fromIds = Array.from(new Set((data ?? []).map((n) => n.from_user_id as string)));
    const { data: profiles } = fromIds.length
      ? await supabase.from("profiles").select("id, username, first_name").in("id", fromIds)
      : { data: [] as { id: string; username: string | null; first_name: string | null }[] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    setNudges(
      (data ?? []).map((n) => {
        const p = profileById.get(n.from_user_id as string);
        return {
          id: n.id as string,
          groupId: n.group_id as string,
          fromName: p?.first_name ?? p?.username ?? "Someone",
          note: (n.note as string | null) ?? null,
        };
      }),
    );
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { nudges, refresh };
}
