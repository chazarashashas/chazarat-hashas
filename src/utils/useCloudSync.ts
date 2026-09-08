import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { STORAGE_SYNC_EVENT } from "./useLocalStorageState";
import { DEFAULT_BOTTOM_BAR_IDS } from "./navItems";

export const PREFIX = "chazarat-hashas:";
/** This device's own marker of the last reset it has already applied —
    never synced itself (each device tracks this independently), so a
    device that's been offline can tell a reset happened while it was
    away from one that already caught up. */
const RESET_SEEN_KEY = PREFIX + "_lastResetSeenAt";
export const SYNC_KEYS = [
  "perekNotes",
  "perekNotebook",
  "masechetSentences",
  "completions",
  "dailyLimmudPosition",
  "dailyLimmudPace",
  "conceptNotes",
  "nishmatMyClaims",
  "gameStats",
  "streakFreezes",
  "frozenDates",
  "lastFreezeMilestone",
  "reviewState",
  "showEnglish",
  "nishmatHiddenSiyumim",
  "bottomBarIds",
] as const;

export type SyncBlob = Partial<Record<(typeof SYNC_KEYS)[number], unknown>>;

function readLocalBlob(): SyncBlob {
  const blob: SyncBlob = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) {
      try {
        blob[key] = JSON.parse(raw);
      } catch {
        // corrupt value — skip it rather than let one bad key break the sync
      }
    }
  }
  return blob;
}

function writeLocalBlob(blob: SyncBlob) {
  for (const key of SYNC_KEYS) {
    if (blob[key] !== undefined) {
      localStorage.setItem(PREFIX + key, JSON.stringify(blob[key]));
    }
  }
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Record<string, string | string[]> merge — local wins per key when it
    has a real (non-empty) value, cloud fills in whatever local doesn't. */
function mergeRecordPreferLocal(local: unknown, cloud: unknown): Record<string, unknown> {
  const l = (local && typeof local === "object" ? local : {}) as Record<string, unknown>;
  const c = (cloud && typeof cloud === "object" ? cloud : {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...c };
  for (const key of Object.keys(l)) {
    if (!isEmptyValue(l[key])) merged[key] = l[key];
  }
  return merged;
}

function mergeUniqueBy(local: unknown, cloud: unknown, keyOf: (item: unknown) => string): unknown[] {
  const l = Array.isArray(local) ? local : [];
  const c = Array.isArray(cloud) ? cloud : [];
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of [...c, ...l]) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  // Sorted by key so the result is deterministic regardless of which
  // side (local vs. cloud) happened to see an item first historically —
  // without this, the exact same logical data could serialize
  // differently on every merge and look like a spurious "change".
  out.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  return out;
}

/** Per-game best-result merge — takes the higher score/count and the
    higher play count from either side, so neither device's record of a
    personal best (or how many times a game's been played) is discarded
    just because the other side happened to sync last. */
function mergeGameStat(
  local: Record<string, number> | undefined,
  cloud: Record<string, number> | undefined,
): Record<string, number> {
  const l = local ?? {};
  const c = cloud ?? {};
  const keys = new Set([...Object.keys(l), ...Object.keys(c)]);
  const merged: Record<string, number> = {};
  for (const key of keys) {
    merged[key] = Math.max(Number(l[key]) || 0, Number(c[key]) || 0);
  }
  return merged;
}

function mergeGameStats(local: unknown, cloud: unknown): Record<string, unknown> {
  const l = (local && typeof local === "object" ? local : {}) as Record<string, Record<string, number>>;
  const c = (cloud && typeof cloud === "object" ? cloud : {}) as Record<string, Record<string, number>>;
  const games = new Set([...Object.keys(l), ...Object.keys(c)]);
  const merged: Record<string, unknown> = {};
  for (const game of games) {
    merged[game] = mergeGameStat(l[game], c[game]);
  }
  return merged;
}

interface ReviewStateEntry {
  box: number;
  nextReview: string;
  lastReviewed: string | null;
  timesReviewed: number;
}

/** Per-mishnah review schedule merge — whichever side has the more
    recent lastReviewed date wins that item outright (its box/schedule
    reflects a real review that happened, so it's more trustworthy than
    guessing from box number alone); untouched items just carry over. */
function mergeReviewState(local: unknown, cloud: unknown): Record<string, ReviewStateEntry> {
  const l = (local && typeof local === "object" ? local : {}) as Record<string, ReviewStateEntry>;
  const c = (cloud && typeof cloud === "object" ? cloud : {}) as Record<string, ReviewStateEntry>;
  const keys = new Set([...Object.keys(l), ...Object.keys(c)]);
  const merged: Record<string, ReviewStateEntry> = {};
  for (const key of keys) {
    const lv = l[key];
    const cv = c[key];
    if (lv && cv) {
      merged[key] = (lv.lastReviewed ?? "") >= (cv.lastReviewed ?? "") ? lv : cv;
    } else {
      merged[key] = lv ?? cv;
    }
  }
  return merged;
}

/** Merges this device's local data with whatever's already saved to the
    account — local edits always win on a direct conflict, cloud fills in
    anything local is missing, nothing is silently discarded. */
function mergeBlobs(local: SyncBlob, cloud: SyncBlob): SyncBlob {
  return {
    perekNotes: mergeRecordPreferLocal(local.perekNotes, cloud.perekNotes),
    perekNotebook: mergeRecordPreferLocal(local.perekNotebook, cloud.perekNotebook),
    masechetSentences: mergeRecordPreferLocal(local.masechetSentences, cloud.masechetSentences),
    completions: mergeUniqueBy(
      local.completions,
      cloud.completions,
      (item) => {
        const r = item as { masechetEn: string; perek: number; mishnah: number };
        return `${r.masechetEn}.${r.perek}.${r.mishnah}`;
      },
    ),
    conceptNotes: mergeUniqueBy(local.conceptNotes, cloud.conceptNotes, (item) => (item as { id: string }).id),
    dailyLimmudPosition: Math.max(Number(local.dailyLimmudPosition) || 0, Number(cloud.dailyLimmudPosition) || 0),
    dailyLimmudPace: local.dailyLimmudPace ?? cloud.dailyLimmudPace ?? "1",
    nishmatMyClaims: mergeUniqueBy(local.nishmatMyClaims, cloud.nishmatMyClaims, (item) => (item as { id: string }).id),
    gameStats: mergeGameStats(local.gameStats, cloud.gameStats),
    streakFreezes: Math.max(Number(local.streakFreezes) || 0, Number(cloud.streakFreezes) || 0),
    frozenDates: mergeUniqueBy(local.frozenDates, cloud.frozenDates, (item) => item as string),
    lastFreezeMilestone: Math.max(Number(local.lastFreezeMilestone) || 0, Number(cloud.lastFreezeMilestone) || 0),
    reviewState: mergeReviewState(local.reviewState, cloud.reviewState),
    // Cloud wins when present, so "phone and laptop agree" (a device that
    // never touched the switch shouldn't keep a stale local false once the
    // account's real answer is known) — the brief's "local wins on first
    // load" is about not flickering before this merge runs, not about
    // this merge's own outcome.
    showEnglish: typeof cloud.showEnglish === "boolean" ? cloud.showEnglish : (local.showEnglish ?? false),
    nishmatHiddenSiyumim: mergeUniqueBy(local.nishmatHiddenSiyumim, cloud.nishmatHiddenSiyumim, (item) => item as string),
    // Same "local wins when it has a real value" rule as dailyLimmudPace —
    // someone who set this up on one device should find it everywhere,
    // but this device's own choice (if it's made one) isn't overwritten
    // by an account default from before the setting existed.
    bottomBarIds: isEmptyValue(local.bottomBarIds)
      ? ((cloud.bottomBarIds as string[] | undefined) ?? DEFAULT_BOTTOM_BAR_IDS)
      : (local.bottomBarIds as string[]),
  };
}

/**
 * Pushes whatever's in localStorage to the account right now, instead of
 * waiting for useCloudSync's own 10s poll to notice a change. Call this
 * before signing out: useCloudSync wipes this device's local cache the
 * instant the session goes away (see its "Clears this device's local
 * cache" effect below), on the assumption that everything was already
 * pushed — true only if the poll happened to run since the last change.
 * Anything edited in the last <10s before an unflushed sign-out had no
 * cloud copy and, the moment the wipe ran, no local copy either: gone
 * for good. This closes that gap by making the push happen synchronously
 * as part of signing out, not on a timer.
 */
export async function flushLocalDataToCloud(session: Session) {
  if (!supabase) return;
  const blob = readLocalBlob();
  await supabase
    .from("user_data")
    .upsert({ user_id: session.user.id, data: blob, updated_at: new Date().toISOString() });
}

/**
 * Clears specific trackers to an explicit "fresh" value (never removes a
 * key — an absent key wouldn't overwrite a stale cached one locally on
 * another device, an empty one does) and, when signed in, pushes the
 * result to the account immediately rather than waiting for the 10s poll.
 *
 * Writes straight to localStorage instead of going through each hook's
 * own setState — those only flush to localStorage in a later effect, so
 * reading local state back immediately afterward could still see the old
 * values. This also stamps `reset_requested_at`, which the sign-in merge
 * below checks: another of this account's devices, syncing later, needs
 * to know a reset happened rather than merging its own stale copy of the
 * same fields back in over the top of it. The tradeoff is that a reset
 * adopts the account's cloud state wholesale on that other device, which
 * can also discard anything that device changed in an unrelated tracker
 * but hadn't synced yet — accepted here as a rare edge case rather than
 * building a per-key reset ledger.
 */
export function applyReset(session: Session | null, patch: SyncBlob) {
  for (const key of Object.keys(patch) as (typeof SYNC_KEYS)[number][]) {
    localStorage.setItem(PREFIX + key, JSON.stringify(patch[key]));
  }
  window.dispatchEvent(new Event(STORAGE_SYNC_EVENT));

  if (!session || !supabase) return;
  const resetAt = new Date().toISOString();
  const fullBlob = readLocalBlob();
  localStorage.setItem(RESET_SEEN_KEY, resetAt);
  supabase
    .from("user_data")
    .upsert({ user_id: session.user.id, data: fullBlob, reset_requested_at: resetAt, updated_at: resetAt })
    .then(() => {});
}

/**
 * Ties the app's localStorage-backed notes/progress/concepts to the
 * signed-in account, without touching the hooks that already read and
 * write those keys (usePerekNotes, useLearningProgress) — this is a
 * single, isolated addition on top rather than a rewrite of how state
 * works everywhere.
 *
 * On login: merges this device's local data with whatever's already on
 * the account (see mergeBlobs), writes the merged result back to
 * localStorage, and dispatches STORAGE_SYNC_EVENT so every mounted
 * useLocalStorageState re-reads its key and picks up the merge in place —
 * no page reload, so signing in never bounces you to a different screen
 * than the one you were on. If nothing actually changed (steady state, or
 * a brand-new account with nothing local yet either), the merge is a
 * no-op and no event fires.
 *
 * While signed in: polls localStorage every 10s and pushes up whatever
 * changed. A poll, not a hook into every individual setState call,
 * keeps this addition isolated — the tradeoff is up to a ~10s delay
 * before a change reaches the account, which is fine for notes/progress
 * that aren't time-critical. Pulling live updates from *other* devices
 * while this tab stays open isn't handled — out of scope for now.
 */
export function useCloudSync(session: Session | null) {
  const hasMergedRef = useRef(false);
  const lastPushedRef = useRef<string | null>(null);
  const wasSignedInRef = useRef(false);

  // Clears this device's local cache on an actual sign-out (had a
  // session, now don't) — not on first load while merely browsing
  // anonymously. Without this, a second account signing in on the same
  // device would inherit the first account's local data through the
  // login merge below, since that merge treats local as authoritative.
  // Safe for the account that just signed out: everything here was
  // already pushed to their account before this fires.
  useEffect(() => {
    if (session) {
      wasSignedInRef.current = true;
      return;
    }
    if (!wasSignedInRef.current) return;
    wasSignedInRef.current = false;
    for (const key of SYNC_KEYS) {
      localStorage.removeItem(PREFIX + key);
    }
    localStorage.removeItem(RESET_SEEN_KEY);
    window.dispatchEvent(new Event(STORAGE_SYNC_EVENT));
  }, [session]);

  useEffect(() => {
    if (!session || !supabase) {
      hasMergedRef.current = false;
      return;
    }
    if (hasMergedRef.current) return;
    hasMergedRef.current = true;

    let cancelled = false;
    (async () => {
      // reset_requested_at only exists once account_reset_schema.sql has
      // been run — fall back to the column that's always been there so
      // sync never breaks outright in the gap between deploying this and
      // running that SQL (same pattern as useAuth's fetchProfile).
      let { data, error } = await supabase!
        .from("user_data")
        .select("data, reset_requested_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled && error) {
        ({ data } = await supabase!.from("user_data").select("data").eq("user_id", session.user.id).maybeSingle());
      }
      if (cancelled) return;

      const cloudBlob = (data?.data ?? {}) as SyncBlob;
      const cloudResetAt = (data as { reset_requested_at?: string | null } | null)?.reset_requested_at ?? null;
      const seenResetAt = localStorage.getItem(RESET_SEEN_KEY);
      const localBlob = readLocalBlob();
      // A reset (this device's own, or another device's / an admin's) has
      // landed on the account since this device last saw one — adopt the
      // account's current state as-is rather than merging, so this
      // device's stale copy of whatever was just cleared can't merge its
      // way back in.
      const resetIsNew = cloudResetAt !== null && (!seenResetAt || cloudResetAt > seenResetAt);
      const merged = resetIsNew ? cloudBlob : mergeBlobs(localBlob, cloudBlob);
      const localSerialized = JSON.stringify(localBlob);
      const mergedSerialized = JSON.stringify(merged);

      writeLocalBlob(merged);
      if (cloudResetAt) localStorage.setItem(RESET_SEEN_KEY, cloudResetAt);
      lastPushedRef.current = mergedSerialized;
      await supabase!
        .from("user_data")
        .upsert({ user_id: session.user.id, data: merged, updated_at: new Date().toISOString() });

      if (mergedSerialized !== localSerialized) {
        window.dispatchEvent(new Event(STORAGE_SYNC_EVENT));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !supabase) return;
    const interval = window.setInterval(() => {
      const blob = readLocalBlob();
      const serialized = JSON.stringify(blob);
      if (serialized === lastPushedRef.current) return;
      lastPushedRef.current = serialized;
      supabase!
        .from("user_data")
        .upsert({ user_id: session.user.id, data: blob, updated_at: new Date().toISOString() })
        .then(() => {});
    }, 10000);
    return () => window.clearInterval(interval);
  }, [session]);
}
