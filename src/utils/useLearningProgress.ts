import { useLocalStorageState } from "./useLocalStorageState";
import { MISHNA_SEQUENCE, mishnaKey, endOfPerekIndex } from "../data/mishnaSequence";
import { SEDARIM } from "../data/shas";
import { getMishnayotCount } from "../data/perekInfo";

export type CompletionSource = "app" | "logged";

/**
 * One mishnah marked learned. This is the single atomic unit both Daily
 * Limmud (in-app, sequential) and "Log learning" (offline, can be out of
 * order) write into — not two separate stores. `source` is kept for data
 * integrity even though the Progress view doesn't currently distinguish
 * them in what it displays.
 */
export interface CompletionRecord {
  masechetEn: string;
  perek: number;
  mishnah: number;
  date: string; // YYYY-MM-DD
  source: CompletionSource;
}

export type Pace = "1" | "2" | "perek";

/** A concept to revisit, tied to where it came from — not a searchable
    library yet (that's future scope), just capture with the source
    location attached so that library won't need a migration later. */
export interface ConceptNote {
  id: string;
  title: string;
  note: string;
  masechetEn: string;
  perek: number;
  date: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(date: string, delta: number): string {
  const d = new Date(date + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Shared learning-progress store: completions, Daily Limmud position/pace,
 * concept notes, streaks, and hierarchy rollup percentages. Everything
 * here is localStorage-backed for now (see useLocalStorageState) — there
 * are no user accounts yet, so this is per-browser, not per-person. The
 * shape is designed to move to real per-account storage later without
 * changing anything that reads through this hook.
 */
export function useLearningProgress() {
  const [completions, setCompletions] = useLocalStorageState<CompletionRecord[]>("completions", []);
  const [position, setPosition] = useLocalStorageState<number>("dailyLimmudPosition", 0);
  const [pace, setPace] = useLocalStorageState<Pace>("dailyLimmudPace", "1");
  const [concepts, setConcepts] = useLocalStorageState<ConceptNote[]>("conceptNotes", []);

  const completedKeys = new Set(completions.map(mishnaKey));

  function isCompleted(item: { masechetEn: string; perek: number; mishnah: number }): boolean {
    return completedKeys.has(mishnaKey(item));
  }

  const rangeStart = Math.min(position, Math.max(0, MISHNA_SEQUENCE.length - 1));
  const finishedShas = position >= MISHNA_SEQUENCE.length;
  let rangeEnd = rangeStart;
  if (!finishedShas) {
    if (pace === "2") rangeEnd = Math.min(rangeStart + 1, MISHNA_SEQUENCE.length - 1);
    else if (pace === "perek") rangeEnd = endOfPerekIndex(rangeStart);
  }
  const todaysItems = finishedShas ? [] : MISHNA_SEQUENCE.slice(rangeStart, rangeEnd + 1);

  /** The one deliberate confirmation action — nothing else advances
      position, completion, or streak. */
  function markTodayLearned() {
    if (finishedShas || todaysItems.length === 0) return;
    const date = todayStr();
    const fresh: CompletionRecord[] = todaysItems
      .filter((item) => !isCompleted(item))
      .map((item) => ({ ...item, date, source: "app" as const }));
    setCompletions((prev) => [...prev, ...fresh]);
    setPosition(rangeEnd + 1);
  }

  /** Offline logging — marks a whole perek learned on a given date,
      independent of (and without moving) the Daily Limmud position. */
  function logLearning(masechetEn: string, perek: number, date: string) {
    const count = getMishnayotCount(masechetEn, perek);
    const fresh: CompletionRecord[] = [];
    for (let mishnah = 1; mishnah <= count; mishnah++) {
      const item = { masechetEn, perek, mishnah };
      if (!isCompleted(item)) fresh.push({ ...item, date, source: "logged" as const });
    }
    if (fresh.length > 0) setCompletions((prev) => [...prev, ...fresh]);
  }

  function addConcept(title: string, note: string, masechetEn: string, perek: number) {
    const entry: ConceptNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      note,
      masechetEn,
      perek,
      date: todayStr(),
    };
    setConcepts((prev) => [...prev, entry]);
  }

  // Streak: consecutive days (by any completion, either source) ending
  // today or yesterday — a day isn't "missed" until it's fully passed.
  const activeDates = new Set(completions.map((c) => c.date));
  let longest = 0;
  {
    const sorted = Array.from(activeDates).sort();
    let run = 0;
    let prev: string | null = null;
    for (const d of sorted) {
      run = prev && addDaysStr(prev, 1) === d ? run + 1 : 1;
      if (run > longest) longest = run;
      prev = d;
    }
  }
  let current = 0;
  {
    const today = todayStr();
    const yesterday = addDaysStr(today, -1);
    let cursor: string | null = activeDates.has(today) ? today : activeDates.has(yesterday) ? yesterday : null;
    while (cursor && activeDates.has(cursor)) {
      current++;
      cursor = addDaysStr(cursor, -1);
    }
  }

  function shasPercent(): number {
    return MISHNA_SEQUENCE.length === 0
      ? 0
      : Math.round((completedKeys.size / MISHNA_SEQUENCE.length) * 100);
  }

  function sederPercent(sederId: string): number {
    const seder = SEDARIM.find((s) => s.id === sederId);
    if (!seder) return 0;
    let total = 0;
    let done = 0;
    for (const m of seder.masechtot) {
      for (let p = 1; p <= m.perakim; p++) {
        const c = getMishnayotCount(m.en, p);
        total += c;
        for (let mi = 1; mi <= c; mi++) {
          if (isCompleted({ masechetEn: m.en, perek: p, mishnah: mi })) done++;
        }
      }
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  function masechetPercent(masechetEn: string, perakim: number): number {
    let total = 0;
    let done = 0;
    for (let p = 1; p <= perakim; p++) {
      const c = getMishnayotCount(masechetEn, p);
      total += c;
      for (let mi = 1; mi <= c; mi++) {
        if (isCompleted({ masechetEn, perek: p, mishnah: mi })) done++;
      }
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  function perekPercent(masechetEn: string, perek: number): number {
    const c = getMishnayotCount(masechetEn, perek);
    if (c === 0) return 0;
    let done = 0;
    for (let mi = 1; mi <= c; mi++) {
      if (isCompleted({ masechetEn, perek, mishnah: mi })) done++;
    }
    return Math.round((done / c) * 100);
  }

  return {
    completions,
    position,
    pace,
    setPace,
    concepts,
    todaysItems,
    rangeStart,
    rangeEnd,
    finishedShas,
    markTodayLearned,
    logLearning,
    addConcept,
    streak: { current, longest },
    shasPercent,
    sederPercent,
    masechetPercent,
    perekPercent,
    isCompleted,
  };
}
