import { useEffect } from "react";
import { MISHNA_SEQUENCE, type SequenceItem } from "../data/mishnaSequence";
import { upcomingDayRanges } from "./dailyProjection";
import { fetchMishna } from "./sefaria";
import type { Pace } from "./useLearningProgress";

const DAYS_AHEAD = 5;

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
