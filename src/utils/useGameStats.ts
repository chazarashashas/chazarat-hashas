import { useLocalStorageState } from "./useLocalStorageState";

export interface GameStats {
  quiz: { timesPlayed: number; bestScore: number; bestOutOf: number };
  dash: { timesPlayed: number; bestScore: number };
  chazara: { timesPlayed: number; bestCount: number };
  sort: { timesCompleted: number };
}

const EMPTY_STATS: GameStats = {
  quiz: { timesPlayed: 0, bestScore: 0, bestOutOf: 0 },
  dash: { timesPlayed: 0, bestScore: 0 },
  chazara: { timesPlayed: 0, bestCount: 0 },
  sort: { timesCompleted: 0 },
};

/** Best-effort local record of Practice game results, for the My Account
    dashboard's "graded" summary — same localStorage-per-browser scope as
    the rest of the app's progress data, not synced to an account. */
export function useGameStats() {
  const [stats, setStats] = useLocalStorageState<GameStats>("gameStats", EMPTY_STATS);

  function recordQuizResult(score: number, outOf: number) {
    setStats((prev) => ({
      ...prev,
      quiz: {
        timesPlayed: prev.quiz.timesPlayed + 1,
        bestScore: score > prev.quiz.bestScore ? score : prev.quiz.bestScore,
        bestOutOf: score > prev.quiz.bestScore ? outOf : prev.quiz.bestOutOf || outOf,
      },
    }));
  }

  function recordDashScore(score: number) {
    setStats((prev) => ({
      ...prev,
      dash: {
        timesPlayed: prev.dash.timesPlayed + 1,
        bestScore: Math.max(prev.dash.bestScore, score),
      },
    }));
  }

  function recordChazaraResult(count: number) {
    setStats((prev) => ({
      ...prev,
      chazara: {
        timesPlayed: prev.chazara.timesPlayed + 1,
        bestCount: Math.max(prev.chazara.bestCount, count),
      },
    }));
  }

  function recordSortCompletion() {
    setStats((prev) => ({ ...prev, sort: { timesCompleted: prev.sort.timesCompleted + 1 } }));
  }

  return {
    stats,
    recordQuizResult,
    recordDashScore,
    recordChazaraResult,
    recordSortCompletion,
  };
}
