import { useAuth } from "./useAuth";
import { applyReset, type SyncBlob } from "./useCloudSync";

/** One named, reviewable group per resettable feature — never an
    arbitrary key list, so "reset everything" can't silently grow to
    include something added later without a deliberate decision here. */
const DAILY_LIMMUD_PATCH: SyncBlob = {
  completions: [],
  dailyLimmudPosition: 0,
  dailyLimmudPace: "1",
  streakFreezes: 2,
  frozenDates: [],
  lastFreezeMilestone: 0,
};
const PEREK_NOTES_PATCH: SyncBlob = { perekNotes: {}, perekNotebook: {}, masechetSentences: {} };
const CONCEPTS_PATCH: SyncBlob = { conceptNotes: [] };
const GAME_STATS_PATCH: SyncBlob = { gameStats: {} };
const EVERYTHING_PATCH: SyncBlob = {
  ...DAILY_LIMMUD_PATCH,
  ...PEREK_NOTES_PATCH,
  ...CONCEPTS_PATCH,
  ...GAME_STATS_PATCH,
};

/**
 * Self-service reset of this browser's (and, if signed in, this
 * account's) own learning trackers — separate from deleting the account
 * itself (see useAuth's deleteAccount), and deliberately not touching
 * L'Iluy Nishmat claims, which are a commitment tied to other people's
 * dedications, not a personal practice tracker.
 */
export function useAccountReset() {
  const { session } = useAuth();

  return {
    resetDailyLimmud: () => applyReset(session, DAILY_LIMMUD_PATCH),
    resetNotes: () => applyReset(session, PEREK_NOTES_PATCH),
    resetConcepts: () => applyReset(session, CONCEPTS_PATCH),
    resetGameStats: () => applyReset(session, GAME_STATS_PATCH),
    resetEverything: () => applyReset(session, EVERYTHING_PATCH),
  };
}
