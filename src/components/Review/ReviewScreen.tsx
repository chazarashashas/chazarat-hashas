import { useEffect, useState } from "react";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useSpacedReview, type ReviewItem } from "../../utils/useSpacedReview";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { fetchMishna } from "../../utils/sefaria";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { SEDARIM } from "../../data/shas";
import { getSederHue } from "../../utils/sederHue";
import "./ReviewScreen.css";

interface TextState {
  status: "idle" | "loading" | "loaded" | "error";
  text: string;
  error: string;
}

const IDLE_TEXT: TextState = { status: "idle", text: "", error: "" };

function daysAgo(dateStr: string): string {
  const then = new Date(dateStr + "T00:00:00.000Z").getTime();
  const now = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  const days = Math.round((now - then) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function sederOf(masechetEn: string): string | undefined {
  return SEDARIM.find((s) => s.masechtot.some((m) => m.en === masechetEn))?.id;
}

/**
 * Spaced-repetition review: everything the user has already marked
 * learned gets scheduled into Leitner boxes (see useSpacedReview) and
 * resurfaces here when due. Flashcard shape — reference first, real
 * Sefaria text and your own note on reveal, then a self-rating that
 * reschedules the item further out or brings it back sooner.
 */
export function ReviewScreen() {
  const progress = useLearningProgress();
  const { dueItems, totalTracked, recordReview } = useSpacedReview(progress.completions);
  const { getPerekNote } = usePerekNotes();

  // Rated items drop out of the live due-list immediately (they're no
  // longer due), so the next card to show is always dueItems[0] — no
  // separate index to track. The session's starting count is captured
  // once so the "X of Y" denominator doesn't shrink as you go.
  const [sessionTotal] = useState(dueItems.length);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [textState, setTextState] = useState<TextState>(IDLE_TEXT);

  const current: ReviewItem | undefined = dueItems[0];

  useEffect(() => {
    setRevealed(false);
    setTextState(IDLE_TEXT);
  }, [current?.key]);

  async function handleReveal() {
    if (!current) return;
    setRevealed(true);
    setTextState({ status: "loading", text: "", error: "" });
    try {
      const text = await fetchMishna(current.masechetEn, current.perek, current.mishnah);
      setTextState({ status: "loaded", text, error: "" });
    } catch (err) {
      setTextState({ status: "error", text: "", error: err instanceof Error ? err.message : "Failed to load." });
    }
  }

  function handleRate(gotIt: boolean) {
    if (!current) return;
    recordReview(current.key, gotIt);
    setReviewedCount((n) => n + 1);
  }

  const done = sessionTotal > 0 && dueItems.length === 0;
  const hue = current ? getSederHue(sederOf(current.masechetEn) ?? "zeraim") : undefined;
  const note = current ? getPerekNote(current.masechetEn, current.perek) : "";

  return (
    <div className="stage">
      <div className="panel review-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Review</h1>
        <p className="panel__subtitle">
          Mishnayot you've learned before, resurfaced before you forget them — {totalTracked} tracked in
          all.
        </p>

        {done ? (
          <div className="note-banner note-banner--good review-empty">
            You reviewed all {sessionTotal} due today. Come back tomorrow for more.
          </div>
        ) : dueItems.length === 0 ? (
          <div className="note-banner review-empty">
            {totalTracked === 0
              ? "Nothing to review yet — mark a mishnah learned in Daily Limmud and it'll show up here in a day."
              : "Nothing due today. Check back tomorrow."}
          </div>
        ) : (
          current && (
            <div className="review-card" style={{ ["--tile-hue" as string]: hue }}>
              <p className="review-card__progress">
                {reviewedCount + 1} of {sessionTotal} due today
              </p>

              <div className="review-card__front">
                <p className="review-card__masechet">{current.masechetEn}</p>
                <p className="review-card__ref" dir="rtl">
                  {hebrewNumeral(current.perek)}:{hebrewNumeral(current.mishnah)}
                </p>
                <p className="review-card__learned">Learned {daysAgo(current.learnedDate)}</p>
              </div>

              {!revealed ? (
                <button className="restart review-card__reveal" onClick={handleReveal}>
                  Show text
                </button>
              ) : (
                <>
                  <div className="review-card__text-block">
                    {textState.status === "loading" && <p className="review-card__status">Loading…</p>}
                    {textState.status === "error" && (
                      <p className="review-card__status" dir="ltr">
                        {textState.error}
                      </p>
                    )}
                    {textState.status === "loaded" && (
                      <p className="review-card__text" dir="rtl">
                        {textState.text}
                      </p>
                    )}
                  </div>
                  {note && (
                    <div className="review-card__note">
                      <p className="review-card__note-label">Your note</p>
                      <p className="review-card__note-text">{note}</p>
                    </div>
                  )}
                  <div className="review-card__rate">
                    <button className="review-card__rate-btn review-card__rate-btn--miss" onClick={() => handleRate(false)}>
                      Need practice
                    </button>
                    <button className="review-card__rate-btn review-card__rate-btn--hit" onClick={() => handleRate(true)}>
                      Got it
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
