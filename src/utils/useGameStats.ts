import { useLocalStorageState } from "./useLocalStorageState";
import { localDateStr } from "./localDate";

function todayStr(): string {
  return localDateStr();
}

interface DailyQuiz {
  date: string;
  bestScore: number;
  bestOutOf: number;
  /** Which pool the quiz was played on — "All of Shas", a seder's name,
      or one masechet — so the rebbe dashboard can say what was actually
      studied, not just the grade. */
  scope: string;
}
interface DailyDash {
  date: string;
  bestScore: number;
}
interface DailyChazara {
  date: string;
  bestCount: number;
  scope: string;
}
interface DailyPlaced {
  date: string;
  placed: number;
  total: number;
}

export interface GameStats {
  quiz: { timesPlayed: number; bestScore: number; bestOutOf: number; today: DailyQuiz | null };
  dash: { timesPlayed: number; bestScore: number; today: DailyDash | null };
  chazara: { timesPlayed: number; bestCount: number; today: DailyChazara | null };
  sort: { timesCompleted: number; today: DailyPlaced | null };
  /** Sidrei Hamishna — the drag-into-order matching game (six sedarim, or
      one seder's/pair's masechtot). Wasn't tracked at all before the
      rebbe dashboard needed a daily figure for it. */
  sidrei: { timesCompleted: number; today: DailyPlaced | null };
}

const EMPTY_STATS: GameStats = {
  quiz: { timesPlayed: 0, bestScore: 0, bestOutOf: 0, today: null },
  dash: { timesPlayed: 0, bestScore: 0, today: null },
  chazara: { timesPlayed: 0, bestCount: 0, today: null },
  sort: { timesCompleted: 0, today: null },
  sidrei: { timesCompleted: 0, today: null },
};

/** Keeps `existing` unless `fresh` is today's date and actually better —
    a stale "today" from a previous date is discarded outright rather
    than compared against, so yesterday's high score can't linger and
    read as if it happened today. */
function bestToday<T extends { date: string }>(existing: T | null, fresh: T, isBetter: (a: T, b: T) => boolean): T {
  if (!existing || existing.date !== fresh.date) return fresh;
  return isBetter(fresh, existing) ? fresh : existing;
}

/** Backfills any field missing from what's actually in localStorage —
    every account that used the Practice games before the rebbe
    dashboard existed has a `gameStats` value with no `today` fields and
    no `sidrei` key at all, and reading `.today` off an entirely-missing
    `sidrei` would otherwise throw on every load. */
function normalize(raw: Partial<GameStats> | null | undefined): GameStats {
  return {
    quiz: { ...EMPTY_STATS.quiz, ...raw?.quiz },
    dash: { ...EMPTY_STATS.dash, ...raw?.dash },
    chazara: { ...EMPTY_STATS.chazara, ...raw?.chazara },
    sort: { ...EMPTY_STATS.sort, ...raw?.sort },
    sidrei: { ...EMPTY_STATS.sidrei, ...raw?.sidrei },
  };
}

/** Best-effort local record of Practice game results, for the My Account
    dashboard's "graded" summary and (via the `today` fields) the rebbe
    dashboard's daily submission — same localStorage-per-browser scope as
    the rest of the app's progress data, not synced to an account. */
export function useGameStats() {
  const [rawStats, setRawStats] = useLocalStorageState<Partial<GameStats>>("gameStats", EMPTY_STATS);
  const stats = normalize(rawStats);
  function setStats(updater: (prev: GameStats) => GameStats) {
    setRawStats((prevRaw) => updater(normalize(prevRaw)));
  }

  function recordQuizResult(score: number, outOf: number, scope: string) {
    const date = todayStr();
    setStats((prev) => ({
      ...prev,
      quiz: {
        timesPlayed: prev.quiz.timesPlayed + 1,
        bestScore: score > prev.quiz.bestScore ? score : prev.quiz.bestScore,
        bestOutOf: score > prev.quiz.bestScore ? outOf : prev.quiz.bestOutOf || outOf,
        today: bestToday(prev.quiz.today, { date, bestScore: score, bestOutOf: outOf, scope }, (a, b) => a.bestScore > b.bestScore),
      },
    }));
  }

  function recordDashScore(score: number) {
    const date = todayStr();
    setStats((prev) => ({
      ...prev,
      dash: {
        timesPlayed: prev.dash.timesPlayed + 1,
        bestScore: Math.max(prev.dash.bestScore, score),
        today: bestToday(prev.dash.today, { date, bestScore: score }, (a, b) => a.bestScore > b.bestScore),
      },
    }));
  }

  function recordChazaraResult(count: number, scope: string) {
    const date = todayStr();
    setStats((prev) => ({
      ...prev,
      chazara: {
        timesPlayed: prev.chazara.timesPlayed + 1,
        bestCount: Math.max(prev.chazara.bestCount, count),
        today: bestToday(prev.chazara.today, { date, bestCount: count, scope }, (a, b) => a.bestCount > b.bestCount),
      },
    }));
  }

  function recordSortCompletion() {
    setStats((prev) => ({ ...prev, sort: { ...prev.sort, timesCompleted: prev.sort.timesCompleted + 1 } }));
  }

  /** Fires on every placed-count change, not just full completion — an
      abandoned attempt still gives the rebbe dashboard a real "how far
      did they get today" figure instead of nothing. */
  function recordSortProgress(placed: number, total: number) {
    const date = todayStr();
    setStats((prev) => ({
      ...prev,
      sort: { ...prev.sort, today: bestToday(prev.sort.today, { date, placed, total }, (a, b) => a.placed > b.placed) },
    }));
  }

  function recordSidreiCompletion() {
    setStats((prev) => ({ ...prev, sidrei: { ...prev.sidrei, timesCompleted: prev.sidrei.timesCompleted + 1 } }));
  }

  function recordSidreiProgress(placed: number, total: number) {
    const date = todayStr();
    setStats((prev) => ({
      ...prev,
      sidrei: {
        ...prev.sidrei,
        today: bestToday(prev.sidrei.today, { date, placed, total }, (a, b) => a.placed > b.placed),
      },
    }));
  }

  return {
    stats,
    recordQuizResult,
    recordDashScore,
    recordChazaraResult,
    recordSortCompletion,
    recordSortProgress,
    recordSidreiCompletion,
    recordSidreiProgress,
  };
}
