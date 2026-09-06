import { useEffect } from "react";
import { MISHNA_SEQUENCE, endOfPerekIndex, type SequenceItem } from "../data/mishnaSequence";
import { fetchMishna } from "./sefaria";
import type { Pace } from "./useLearningProgress";

const DAYS_AHEAD = 5;

/** Simulates Daily Limmud's own day-advance logic (see
    useLearningProgress's markTodayLearned) purely, without touching any
    real state, to find which sequence indices the next few days will
    cover — so they can be warmed into the offline cache ahead of time. */
function upcomingDayRanges(position: number, pace: Pace, days: number): [number, number][] {
  const ranges: [number, number][] = [];
  let start = position;
  for (let day = 0; day < days; day++) {
    if (start >= MISHNA_SEQUENCE.length) break;
    let end = start;
    if (pace === "2") end = Math.min(start + 1, MISHNA_SEQUENCE.length - 1);
    else if (pace === "perek") end = endOfPerekIndex(start);
    ranges.push([start, end]);
    start = end + 1;
  }
  return ranges;
}

/** Warms the offline cache (via the service worker's runtime-caching rule
    for the Sefaria API, see vite.config.ts) with the next few days' worth
    of mishnayot at the user's current pace — so Daily Limmud still has
    real text to show if you open the app with no connection. Fire-and-
    forget: failures here are silent, since this is a background nicety,
    not a user-facing action. */
export function useOfflinePrefetch(position: number, pace: Pace, finishedShas: boolean) {
  useEffect(() => {
    if (finishedShas || typeof navigator === "undefined" || navigator.onLine === false) return;
    let cancelled = false;

    const ranges = upcomingDayRanges(position, pace, DAYS_AHEAD);
    const items: SequenceItem[] = [];
    for (const [start, end] of ranges) {
      for (let i = start; i <= end; i++) items.push(MISHNA_SEQUENCE[i]);
    }

    (async () => {
      for (const item of items) {
        if (cancelled) return;
        try {
          await fetchMishna(item.masechetEn, item.perek, item.mishnah);
        } catch {
          // Best-effort warming — a failed prefetch just means that one
          // mishnah won't be available offline yet, nothing to surface.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [position, pace, finishedShas]);
}
