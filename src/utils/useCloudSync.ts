import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const PREFIX = "chazarat-hashas:";
const SYNC_KEYS = [
  "perekNotes",
  "masechetSentences",
  "completions",
  "dailyLimmudPosition",
  "dailyLimmudPace",
  "conceptNotes",
] as const;

type SyncBlob = Partial<Record<(typeof SYNC_KEYS)[number], unknown>>;

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

/** Merges this device's local data with whatever's already saved to the
    account — local edits always win on a direct conflict, cloud fills in
    anything local is missing, nothing is silently discarded. */
function mergeBlobs(local: SyncBlob, cloud: SyncBlob): SyncBlob {
  return {
    perekNotes: mergeRecordPreferLocal(local.perekNotes, cloud.perekNotes),
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
  };
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
 * localStorage, and reloads the page. The reload is necessary — every
 * existing hook already read its initial value from localStorage at
 * mount, before the merge landed, and won't notice a localStorage write
 * happening out from under it otherwise. If nothing actually changed
 * (steady state, or a brand-new account with nothing local yet either),
 * the merge is a no-op and no reload happens.
 *
 * While signed in: polls localStorage every 10s and pushes up whatever
 * changed. A poll, not a hook into every individual setState call,
 * keeps this addition isolated — the tradeoff is up to a ~10s delay
 * before a change reaches the account, which is fine for notes/progress
 * that aren't time-critical. Pulling live updates from *other* devices
 * while this tab stays open isn't handled — out of scope for now.
 */
const RELOAD_GUARD_KEY = "chazarat-hashas:cloudSyncReloaded";

export function useCloudSync(session: Session | null) {
  const hasMergedRef = useRef(false);
  const lastPushedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session || !supabase) {
      hasMergedRef.current = false;
      return;
    }
    if (hasMergedRef.current) return;
    hasMergedRef.current = true;

    let cancelled = false;
    (async () => {
      const { data } = await supabase!
        .from("user_data")
        .select("data")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;

      const cloudBlob = (data?.data ?? {}) as SyncBlob;
      const localBlob = readLocalBlob();
      const merged = mergeBlobs(localBlob, cloudBlob);
      const localSerialized = JSON.stringify(localBlob);
      const mergedSerialized = JSON.stringify(merged);

      writeLocalBlob(merged);
      lastPushedRef.current = mergedSerialized;
      await supabase!
        .from("user_data")
        .upsert({ user_id: session.user.id, data: merged, updated_at: new Date().toISOString() });

      // Guard against ever reloading more than once per browser tab —
      // belt-and-suspenders on top of the equality check above, so a
      // merge that (for whatever reason) never quite converges can't
      // turn into a reload loop that traps the user on a blank reload
      // instead of the page they wanted.
      const alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
      if (mergedSerialized !== localSerialized && !alreadyReloaded) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
        window.location.reload();
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
