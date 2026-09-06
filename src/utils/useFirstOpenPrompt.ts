import { useEffect, useState } from "react";

const STORAGE_KEY = "chazarat-hashas:firstOpenPrompt";
const SILENCE_DAYS = 14;

interface PromptState {
  askedCount: number; // 0 = never shown, 1 = variant A shown, 2 = variant B shown (retired)
  lastDismissed: string | null; // ISO timestamp of the last "Not right now"
  retired: boolean;
  exceptionUsed: boolean;
  masechtotBaseline: number | null;
}

const DEFAULT_STATE: PromptState = {
  askedCount: 0,
  lastDismissed: null,
  retired: false,
  exceptionUsed: false,
  masechtotBaseline: null,
};

function readState(): PromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    // corrupt value — fall through to defaults
  }
  return DEFAULT_STATE;
}

function writeState(state: PromptState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface FirstOpenPromptInput {
  isLoggedIn: boolean;
  streakCurrent: number;
  mishnayotCount: number;
  noteCount: number;
  masechtotCompleted: number;
}

/**
 * Decides, once per cold open, whether to show the first-open sign-in
 * prompt and which copy variant — see SIGNIN-BRIEF.md §5 for the full
 * frequency rules this implements: two asks total (variant A once, then
 * variant B once, gated on having something worth naming), a 14-day
 * silence after "Not right now", permanent retirement after the second
 * dismissal, and one lifetime exception (finishing a masechet or a
 * 30-day streak) that can re-open variant B once even after retirement.
 *
 * The decision is made in useState's lazy initializer — it runs exactly
 * once per real page load, which is what "cold open" means here; it is
 * deliberately not re-evaluated as progress changes mid-session, since
 * the frequency rules cap this at once per session regardless.
 */
export function useFirstOpenPrompt(input: FirstOpenPromptInput) {
  const [variant, setVariant] = useState<"A" | "B" | null>(() => {
    if (input.isLoggedIn) return null;
    const state = readState();

    if (state.retired) {
      const justFinishedMasechet =
        state.masechtotBaseline !== null && input.masechtotCompleted > state.masechtotBaseline;
      if (!state.exceptionUsed && (input.streakCurrent >= 30 || justFinishedMasechet)) return "B";
      return null;
    }

    if (state.lastDismissed) {
      const daysSince = (Date.now() - new Date(state.lastDismissed).getTime()) / 86_400_000;
      if (daysSince < SILENCE_DAYS) return null;
    }

    if (state.askedCount === 0) return "A";

    if (state.askedCount === 1) {
      const qualifies = input.mishnayotCount >= 3 || input.noteCount >= 1 || input.streakCurrent >= 2;
      return qualifies ? "B" : null;
    }

    return null;
  });

  // Bootstraps the masechet-completion baseline on the very first mount
  // after this feature ships, so a later completion has something to
  // compare against for the exception above.
  useEffect(() => {
    const state = readState();
    if (state.masechtotBaseline === null) {
      writeState({ ...state, masechtotBaseline: input.masechtotCompleted });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    const state = readState();
    const next: PromptState = {
      ...state,
      lastDismissed: new Date().toISOString(),
      masechtotBaseline: input.masechtotCompleted,
    };
    if (state.retired) {
      next.exceptionUsed = true;
    } else if (variant === "A") {
      next.askedCount = 1;
    } else if (variant === "B") {
      next.askedCount = 2;
      next.retired = true;
    }
    writeState(next);
    setVariant(null);
  }

  return { variant, dismiss };
}
