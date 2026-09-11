import { useState } from "react";
import { localDateStr } from "../../utils/localDate";
import { ShareSheet } from "./ShareSheet";
import { SharePrompt, ShareLink } from "./SharePrompt";
import { pickPrompt, recordPromptShown } from "./sharePrompts";
import type { ShareMoment } from "./shareMoments";

/**
 * Sharing for one screen's result: what the run can share (always, on
 * demand, via the quiet link), whether it earned a prompt under the
 * frequency rules, and the open sheet. `finish` is called once, when the
 * result is known; `reset` when a new run starts.
 */
export function useRunShare() {
  const [runMoment, setRunMoment] = useState<ShareMoment | null>(null);
  const [promptMoment, setPromptMoment] = useState<ShareMoment | null>(null);
  const [sheetMoment, setSheetMoment] = useState<ShareMoment | null>(null);

  function finish(moment: ShareMoment | null, promptCandidates: (ShareMoment | null)[] = []) {
    setRunMoment(moment);
    const today = localDateStr();
    const prompt = pickPrompt(promptCandidates, today);
    if (prompt) recordPromptShown(prompt.type, today);
    setPromptMoment(prompt);
  }

  function reset() {
    setRunMoment(null);
    setPromptMoment(null);
  }

  const prompt = (variant: "game" | "cream") =>
    promptMoment && (
      <SharePrompt moment={promptMoment} variant={variant} onShare={() => setSheetMoment(promptMoment)} onDismiss={() => setPromptMoment(null)} />
    );

  /** The quiet link — hidden while a prompt for the same run is showing. */
  const link = (onDark?: boolean) => runMoment && !promptMoment && <ShareLink onDark={onDark} onClick={() => setSheetMoment(runMoment)} />;

  const sheet = sheetMoment && <ShareSheet moment={sheetMoment} onClose={() => setSheetMoment(null)} />;

  return { finish, reset, prompt, link, sheet, open: setSheetMoment };
}
