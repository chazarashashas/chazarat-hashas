import { useLocalStorageState } from "./useLocalStorageState";
import { mishnaKey } from "../data/mishnaSequence";
import type { CompletionRecord } from "./useLearningProgress";

/** Leitner-box spaced repetition: 5 boxes, each with a longer interval.
    A correct ("Got it") review promotes to the next box; a miss ("Need
    practice") drops back to box 1. No content authoring required — it
    schedules review of mishnayot the user has already marked learned. */
const BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30];
const MAX_BOX = BOX_INTERVAL_DAYS.length;

export interface ReviewState {
  box: number;
  nextReview: string; // YYYY-MM-DD
  lastReviewed: string | null;
  timesReviewed: number;
}

export interface ReviewItem {
  key: string;
  masechetEn: string;
  perek: number;
  mishnah: number;
  box: number;
  nextReview: string;
  /** The date this mishnah was originally marked learned — lets the
      review card show "learned 12 days ago" for context. */
  learnedDate: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(date: string, delta: number): string {
  const d = new Date(date + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Spaced review over the mishnayot in `completions` — a thin layer on
    top of useLearningProgress rather than a fork of it: this hook only
    tracks each item's box/schedule, never the completion fact itself. */
export function useSpacedReview(completions: CompletionRecord[]) {
  const [reviewState, setReviewState] = useLocalStorageState<Record<string, ReviewState>>("reviewState", {});

  // Earliest date wins if a mishnah was somehow logged twice — the
  // original learn date is what "learned N days ago" should reflect.
  const byKey = new Map<string, CompletionRecord>();
  for (const c of completions) {
    const key = mishnaKey(c);
    const existing = byKey.get(key);
    if (!existing || c.date < existing.date) byKey.set(key, c);
  }

  // Any completed mishnah not yet in reviewState starts in box 1, due
  // tomorrow — reviewing the same day you learned it isn't the point.
  const today = todayStr();

  const dueItems: ReviewItem[] = [];
  let totalTracked = 0;
  for (const [key, record] of byKey) {
    totalTracked++;
    const state: ReviewState = reviewState[key] ?? {
      box: 1,
      nextReview: addDaysStr(record.date, 1),
      lastReviewed: null,
      timesReviewed: 0,
    };
    if (state.nextReview <= today) {
      dueItems.push({
        key,
        masechetEn: record.masechetEn,
        perek: record.perek,
        mishnah: record.mishnah,
        box: state.box,
        nextReview: state.nextReview,
        learnedDate: record.date,
      });
    }
  }

  const interleaved = interleaveByMasechet(dueItems);

  function recordReview(key: string, gotIt: boolean) {
    setReviewState((prev) => {
      const current = prev[key] ?? { box: 1, nextReview: today, lastReviewed: null, timesReviewed: 0 };
      const nextBox = gotIt ? Math.min(MAX_BOX, current.box + 1) : 1;
      return {
        ...prev,
        [key]: {
          box: nextBox,
          nextReview: addDaysStr(today, BOX_INTERVAL_DAYS[nextBox - 1]),
          lastReviewed: today,
          timesReviewed: current.timesReviewed + 1,
        },
      };
    });
  }

  return {
    dueItems: interleaved,
    totalTracked,
    recordReview,
  };
}

/** Reviewing the same masechet back-to-back is weaker for retention than
    mixing — interleaving forces the retrieval cue to be "which mishnah is
    this," not just "what comes next in this masechet." Groups by masechet
    (each group sorted most-overdue first), then round-robins across
    groups so consecutive cards come from different masechtot whenever
    more than one is due. */
function interleaveByMasechet(items: ReviewItem[]): ReviewItem[] {
  const groups = new Map<string, ReviewItem[]>();
  for (const item of items) {
    const group = groups.get(item.masechetEn);
    if (group) group.push(item);
    else groups.set(item.masechetEn, [item]);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  }
  const queues = Array.from(groups.values());
  const out: ReviewItem[] = [];
  let remaining = items.length;
  let i = 0;
  while (remaining > 0) {
    const queue = queues[i % queues.length];
    if (queue.length > 0) {
      out.push(queue.shift()!);
      remaining--;
    }
    i++;
  }
  return out;
}
