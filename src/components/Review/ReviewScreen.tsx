import { useEffect, useState } from "react";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useSpacedReview, BOX_INTERVAL_DAYS, type ReviewItem } from "../../utils/useSpacedReview";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { fetchMishna } from "../../utils/sefaria";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { SEDARIM } from "../../data/shas";
import { getSederHue } from "../../utils/sederHue";
import { NavIcon } from "../Icon/NavIcon";
import "./ReviewScreen.css";

interface TextState {
  status: "idle" | "loading" | "loaded" | "error";
  text: string;
  error: string;
}

const IDLE_TEXT: TextState = { status: "idle", text: "", error: "" };
const MAX_BOX = BOX_INTERVAL_DAYS.length;
const BOX_LABELS = ["1d", "3d", "1w", "2w", "30d"];

function daysAgo(dateStr: string): string {
  const then = new Date(dateStr + "T00:00:00.000Z").getTime();
  const now = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  const days = Math.round((now - then) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function intervalLabel(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

function sederOf(masechetEn: string): string | undefined {
  return SEDARIM.find((s) => s.masechtot.some((m) => m.en === masechetEn))?.id;
}

/** The five-box Leitner ladder, made visible — bar height carries the
    interval, so the schedule reads as time lengthening rather than as a
    number. See AUDIT.md's Review brief: box was computed and never shown. */
function Ladder({ box }: { box: number }) {
  return (
    <div className="review-ladder">
      {BOX_INTERVAL_DAYS.map((_days, idx) => {
        const n = idx + 1;
        const at = box > 0 && n === box;
        const passed = box > 0 && n < box;
        return (
          <div className="review-ladder__col" key={n}>
            <div
              className={
                "review-ladder__bar" + (at ? " review-ladder__bar--at" : passed ? " review-ladder__bar--passed" : "")
              }
              style={{ height: `${8 + idx * 5}px` }}
            />
            <span className={"review-ladder__label" + (at ? " review-ladder__label--at" : "")}>{BOX_LABELS[idx]}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ReviewScreenProps {
  onOpenLimmud?: () => void;
}

/**
 * Spaced-repetition review: everything the user has already marked
 * learned gets scheduled into Leitner boxes (see useSpacedReview) and
 * resurfaces here when due. Flashcard shape — reference first, real
 * Sefaria text and your own note on reveal, then a self-rating that
 * reschedules the item further out or brings it back sooner.
 */
export function ReviewScreen({ onOpenLimmud }: ReviewScreenProps) {
  const progress = useLearningProgress();
  const { dueItems, totalTracked, recordReview } = useSpacedReview(progress.completions);
  const { getPerekNote } = usePerekNotes();

  // Rated items drop out of the live due-list immediately (they're no
  // longer due), so the next card to show is always dueItems[0] — no
  // separate index to track. The session's starting count is captured
  // once so the "X of Y" denominator doesn't shrink as you go.
  const [sessionTotal] = useState(dueItems.length);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [promotedCount, setPromotedCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [textState, setTextState] = useState<TextState>(IDLE_TEXT);

  const current: ReviewItem | undefined = dueItems[0];
  const next: ReviewItem | undefined = dueItems[1];

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
    if (gotIt) setPromotedCount((n) => n + 1);
    else setMissedCount((n) => n + 1);
  }

  const done = sessionTotal > 0 && dueItems.length === 0;
  const seder = current ? SEDARIM.find((s) => s.id === sederOf(current.masechetEn)) : undefined;
  const hue = seder ? getSederHue(seder.id) : undefined;
  const note = current ? getPerekNote(current.masechetEn, current.perek) : "";
  const nextBoxOf = (box: number) => Math.min(MAX_BOX, box + 1);

  return (
    <div className="stage">
      <div className="panel review-panel">
        <h1 className="panel__title">Review</h1>
        <p className="panel__subtitle">
          Mishnayot you've learned before, resurfaced before you forget them — {totalTracked} tracked in
          all.
        </p>

        {done ? (
          <div className="review-done">
            <span className="review-done__mark" dir="rtl" aria-hidden="true">
              ✓
            </span>
            <p className="review-done__title">All {sessionTotal} reviewed</p>
            <p className="review-done__sub">Nothing else is due today.</p>
            <div className="review-done__stats">
              <div className="review-done__stat">
                <p className="review-done__stat-num">{promotedCount}</p>
                <p className="review-done__stat-label">promoted</p>
              </div>
              <div className="review-done__stat">
                <p className="review-done__stat-num">{missedCount}</p>
                <p className="review-done__stat-label">back to day one</p>
              </div>
            </div>
          </div>
        ) : dueItems.length === 0 ? (
          <div className="review-empty">
            <p className="review-empty__title">Nothing to review yet</p>
            <p className="review-empty__body">
              {totalTracked === 0
                ? "Mark a mishnah learned in Daily Limmud and it comes back here tomorrow, then in three days, then a week — each time you know it, it waits longer."
                : "Nothing due today. Check back tomorrow."}
            </p>
            {totalTracked === 0 && (
              <>
                <Ladder box={0} />
                {onOpenLimmud && (
                  <button className="review-empty__cta" onClick={onOpenLimmud}>
                    <span>Go to My Limmud</span>
                    <NavIcon id="arrow" size={14} weight={2.2} />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          current && (
            <>
              <div className="review-pips">
                {Array.from({ length: sessionTotal }, (_, i) => (
                  <span
                    key={i}
                    className={
                      "review-pips__pip" +
                      (i < reviewedCount ? " review-pips__pip--done" : i === reviewedCount ? " review-pips__pip--current" : "")
                    }
                  />
                ))}
                <span className="review-pips__label">
                  {reviewedCount + 1} of {sessionTotal}
                </span>
              </div>

              <div className="review-card" style={{ ["--tile-hue" as string]: hue }}>
                <div className="review-card__head">
                  <div className="review-card__head-text">
                    <p className="review-card__seder">{seder?.en}</p>
                    <p className="review-card__title">
                      <span className="review-card__masechet">{current.masechetEn}</span>{" "}
                      <span className="review-card__ref" dir="rtl">
                        {hebrewNumeral(current.perek)}:{hebrewNumeral(current.mishnah)}
                      </span>
                    </p>
                    <p className="review-card__meta">
                      Learned {daysAgo(current.learnedDate)} · {current.timesReviewed}{" "}
                      {current.timesReviewed === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                  <div className="review-card__interval">
                    <p className="review-card__interval-label">Interval</p>
                    <p className="review-card__interval-num">{intervalLabel(BOX_INTERVAL_DAYS[current.box - 1])}</p>
                  </div>
                </div>

                <Ladder box={current.box} />
                <p className="review-card__ladder-note">
                  Box {current.box} of {MAX_BOX}. Getting it right sends this one out to{" "}
                  {intervalLabel(BOX_INTERVAL_DAYS[nextBoxOf(current.box) - 1])}; missing it brings it back to
                  tomorrow.
                </p>

                {!revealed ? (
                  <>
                    <button className="review-card__reveal" onClick={handleReveal}>
                      Show the mishnah
                    </button>
                    <p className="review-card__recall-hint">Try to recall it first — that's the part that does the work.</p>
                  </>
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
                        <p className="review-card__note-label">Your name for this perek</p>
                        <p className="review-card__note-text">{note}</p>
                      </div>
                    )}
                    <div className="review-card__rate">
                      <button className="review-card__rate-btn review-card__rate-btn--miss" onClick={() => handleRate(false)}>
                        <span className="review-card__rate-btn-title">Need practice</span>
                        <span className="review-card__rate-btn-sub">back tomorrow</span>
                      </button>
                      <button className="review-card__rate-btn review-card__rate-btn--hit" onClick={() => handleRate(true)}>
                        <span className="review-card__rate-btn-title">Got it</span>
                        <span className="review-card__rate-btn-sub">
                          out to {intervalLabel(BOX_INTERVAL_DAYS[nextBoxOf(current.box) - 1])}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {next && (
                <div className="review-upnext">
                  <span className="review-upnext__dot" aria-hidden="true" />
                  <span className="review-upnext__text">
                    Next up is {next.masechetEn === current.masechetEn ? "the same masechet" : "a different masechet"} —
                    cards are mixed on purpose, so the question is which mishnah this is rather than what comes next.
                  </span>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
