import { useEffect } from "react";
import { useLocalStorageState } from "./useLocalStorageState";
import { MISHNA_SEQUENCE, mishnaKey } from "../data/mishnaSequence";
import { dayRange } from "./dailyProjection";
import { SEDARIM } from "../data/shas";
import { getMishnayotCount } from "../data/perekInfo";
import { localDateStr } from "./localDate";

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

/** How fast Daily Limmud moves forward, in one of two units. Chosen
    either directly (My Siyumim's "by daily amount") or derived from a
    target siyum frequency (My Siyumim's "by how often you finish") —
    both write this same shape, since Daily Limmud only ever needs to
    know the resulting amount-per-day, not which direction picked it.
    Unrelated to a chevrusa/chabura's own GroupPace (useChevrusa.ts) —
    that's a fixed 3-value setting chosen once when the group is
    created, not a personal, changeable-anytime preference. */
export interface Pace {
  unit: "mishnayot" | "perakim";
  amount: number;
}

export const DEFAULT_PACE: Pace = { unit: "mishnayot", amount: 1 };

/** Reads either the current {unit, amount} shape or one of the three
    literal strings ("1" | "2" | "perek") every pace was stored as
    before this type existed — real devices and accounts already have
    those values saved, and there's no migration script that touches
    them, so every read has to keep understanding them. */
function normalizePace(raw: unknown): Pace {
  if (raw && typeof raw === "object") {
    const p = raw as { unit?: unknown; amount?: unknown };
    if ((p.unit === "mishnayot" || p.unit === "perakim") && typeof p.amount === "number" && p.amount > 0) {
      return { unit: p.unit, amount: p.amount };
    }
  }
  if (raw === "2") return { unit: "mishnayot", amount: 2 };
  if (raw === "perek") return { unit: "perakim", amount: 1 };
  return DEFAULT_PACE;
}

export function paceEquals(a: Pace, b: Pace): boolean {
  return a.unit === b.unit && a.amount === b.amount;
}

export function paceLabel(p: Pace): string {
  if (p.unit === "mishnayot") return p.amount === 1 ? "1 mishnah/day" : `${p.amount} mishnayot/day`;
  return p.amount === 1 ? "1 perek/day" : `${p.amount} perakim/day`;
}

/** A perek's real length varies, so a perakim-based pace is converted to
    an estimated mishnayot-per-day using the Shas-wide average — good
    enough for an ETA, never displayed as if it were exact. */
export function paceToMishnayotPerDay(pace: Pace, avgMishnayotPerPerek: number): number {
  return pace.unit === "mishnayot" ? pace.amount : pace.amount * avgMishnayotPerPerek;
}

/** Where you personally are within one masechet — used when learning
    for a chevrusa/chabura, which is scoped to a masechet that could be
    anywhere in Shas relative to where your own sequential Daily Limmud
    reading has reached. Deliberately *not* separately-tracked state:
    it's computed from `completions` (the first not-yet-learned mishnah
    in that masechet) so it can never drift out of sync with what
    Progress/Map of Shas already show as done — including mishnayot
    covered via sequential Daily Limmud or offline logging, not just
    ones learned "for" a specific group. */
export interface MasechetPosition {
  perek: number;
  mishnah: number;
}

/** A concept to revisit, tied to where it came from — not a searchable
    library yet (that's future scope), just capture with the source
    location attached so that library won't need a migration later. */
export interface ConceptNote {
  id: string;
  title: string;
  note: string;
  masechetEn: string;
  perek: number;
  mishnah: number;
  date: string;
}

function todayStr(): string {
  return localDateStr();
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
  const [rawPace, setRawPace] = useLocalStorageState<unknown>("dailyLimmudPace", DEFAULT_PACE);
  const pace = normalizePace(rawPace);
  const setPace = (next: Pace) => setRawPace(next);
  const [concepts, setConcepts] = useLocalStorageState<ConceptNote[]>("conceptNotes", []);
  // Streak freeze: bridges exactly one missed day so a single off day
  // doesn't zero out an otherwise-real streak. Starts with two freezes as
  // a welcome gift, then earns one more per full week of unfrozen streak
  // (capped at 3 banked) — see the two effects below.
  const [streakFreezes, setStreakFreezes] = useLocalStorageState<number>("streakFreezes", 2);
  const [frozenDates, setFrozenDates] = useLocalStorageState<string[]>("frozenDates", []);
  const [lastFreezeMilestone, setLastFreezeMilestone] = useLocalStorageState<number>("lastFreezeMilestone", 0);

  const completedKeys = new Set(completions.map(mishnaKey));

  function isCompleted(item: { masechetEn: string; perek: number; mishnah: number }): boolean {
    return completedKeys.has(mishnaKey(item));
  }

  const finishedShas = position >= MISHNA_SEQUENCE.length;
  // Same projection the offline prefetch and the chag print job use.
  const todaysRange = dayRange(position, pace);
  const rangeStart = todaysRange ? todaysRange[0] : Math.max(0, MISHNA_SEQUENCE.length - 1);
  const rangeEnd = todaysRange ? todaysRange[1] : rangeStart;
  const todaysItems = todaysRange ? MISHNA_SEQUENCE.slice(todaysRange[0], todaysRange[1] + 1) : [];

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

  /** The first not-yet-learned mishnah in this masechet, scanning from
      perek 1 — see the MasechetPosition doc comment for why this is
      computed rather than separately tracked. Returns one perek past
      the end once every mishnah in the masechet is done. */
  function getMasechetPosition(masechetEn: string): MasechetPosition {
    const masechet = SEDARIM.flatMap((s) => s.masechtot).find((m) => m.en === masechetEn);
    const totalPerakim = masechet?.perakim ?? 1;
    for (let p = 1; p <= totalPerakim; p++) {
      const count = getMishnayotCount(masechetEn, p);
      for (let mi = 1; mi <= count; mi++) {
        if (!isCompleted({ masechetEn, perek: p, mishnah: mi })) return { perek: p, mishnah: mi };
      }
    }
    return { perek: totalPerakim + 1, mishnah: 1 };
  }

  /** Marks one specific mishnah learned within a masechet context (a
      chevrusa/chabura's masechet, not the global sequential Daily
      Limmud) — getMasechetPosition naturally advances on the next call
      since it's computed from completions, not a separate counter. */
  function markMasechetMishnaLearned(masechetEn: string, perek: number, mishnah: number) {
    const item = { masechetEn, perek, mishnah };
    if (!isCompleted(item)) {
      setCompletions((prev) => [...prev, { ...item, date: todayStr(), source: "app" as const }]);
    }
  }

  function addConcept(title: string, note: string, masechetEn: string, perek: number, mishnah: number) {
    const entry: ConceptNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      note,
      masechetEn,
      perek,
      mishnah,
      date: todayStr(),
    };
    setConcepts((prev) => [...prev, entry]);
  }

  // Streak: consecutive days (by any completion, either source, or a day
  // bridged by a streak freeze) ending today or yesterday — a day isn't
  // "missed" until it's fully passed.
  const rawActiveDates = new Set(completions.map((c) => c.date));
  const activeDates = new Set([...rawActiveDates, ...frozenDates]);
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

  // Spends one freeze to bridge yesterday, but only when doing so actually
  // saves a real streak: today is active, yesterday isn't (and hasn't
  // already been frozen), and the day before yesterday was itself active —
  // an isolated missed day with nothing before it isn't worth a freeze.
  useEffect(() => {
    Promise.resolve().then(() => {
      const today = todayStr();
      const yesterday = addDaysStr(today, -1);
      const dayBefore = addDaysStr(today, -2);
      const todayActive = rawActiveDates.has(today);
      const yesterdayActive = rawActiveDates.has(yesterday) || frozenDates.includes(yesterday);
      const dayBeforeActive = rawActiveDates.has(dayBefore) || frozenDates.includes(dayBefore);
      if (todayActive && !yesterdayActive && dayBeforeActive && streakFreezes > 0) {
        setFrozenDates((prev) => (prev.includes(yesterday) ? prev : [...prev, yesterday]));
        setStreakFreezes((prev) => Math.max(0, prev - 1));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions]);

  // Grants one freeze per full week of streak (capped at 3 banked) —
  // milestone-gated so it only ever fires once per week reached, not on
  // every render where current happens to still be a multiple of 7.
  useEffect(() => {
    Promise.resolve().then(() => {
      const milestone = Math.floor(current / 7) * 7;
      if (milestone > lastFreezeMilestone && milestone > 0) {
        setLastFreezeMilestone(milestone);
        setStreakFreezes((prev) => Math.min(3, prev + 1));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

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
    getMasechetPosition,
    markMasechetMishnaLearned,
    streak: { current, longest, freezesAvailable: streakFreezes },
    shasPercent,
    sederPercent,
    masechetPercent,
    perekPercent,
    isCompleted,
  };
}
