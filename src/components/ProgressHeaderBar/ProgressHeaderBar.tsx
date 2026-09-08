import { useState } from "react";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { buildJourneyScopes, findNextMasechet } from "../../utils/shasJourney";
import { NavIcon } from "../Icon/NavIcon";
import "./ProgressHeaderBar.css";

interface ProgressHeaderBarProps {
  progress: ReturnType<typeof useLearningProgress>;
  onGoToLimmud: () => void;
}

/** A genuinely tiny but nonzero fraction (e.g. 4 of 4,192 mishnayot, 0.1%)
    still needs to render as a visible sliver, or it reads as a bug rather
    than as a beginning. A true zero stays empty. */
function fillWidth(pct: number): number {
  return pct <= 0 ? 0 : Math.max(pct, 1.4);
}

/**
 * One navy bar replacing what used to be two stacked cards (a ring, and a
 * separate Masechet/Seder/Shas switcher below it) — all three levels shown
 * at once as track lengths, so nothing needs switching and no percentage
 * is ever the "wrong" one for what's on screen. See PROGRESS-HEADER-BRIEF.md.
 *
 * `.progress-header-bar` is a size container (not a media query) — this
 * card's actual width is set by its host screen's own column, which can
 * stay well under 640px regardless of the browser window's width.
 */
export function ProgressHeaderBar({ progress, onGoToLimmud }: ProgressHeaderBarProps) {
  const { seder: actualSeder, masechet: actualMasechet } = findNextMasechet(progress);
  const [stepIndex, setStepIndex] = useState(0);
  const maxIndex = actualSeder.masechtot.length - 1;
  const actualIndex = actualSeder.masechtot.findIndex((m) => m.en === actualMasechet.en);
  const previewIndex = Math.min(actualIndex + stepIndex, maxIndex);
  const previewMasechet = actualSeder.masechtot[previewIndex];

  const [masechetScope, sederScope, shasScope] = buildJourneyScopes(progress, previewMasechet.en);
  const upNext = progress.todaysItems[0];

  return (
    <div className="progress-header-bar">
      <div className="phb-row">
        <div className="phb-tracks">
          <div className="phb-track-row">
            <span className="phb-track-label">
              {masechetScope.title}
              {previewIndex < maxIndex && (
                <button className="phb-step" aria-label="Next masechet" onClick={() => setStepIndex((i) => i + 1)}>
                  ›
                </button>
              )}
            </span>
            <div
              className="phb-track"
              role="progressbar"
              aria-valuenow={masechetScope.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${masechetScope.title}, ${masechetScope.percent} percent`}
            >
              <div
                className="phb-track-fill phb-track-fill--masechet"
                style={{ width: `${fillWidth(masechetScope.percent)}%` }}
              />
            </div>
          </div>

          <div className="phb-track-row">
            <span className="phb-track-label">{sederScope.title}</span>
            <div
              className="phb-track"
              role="progressbar"
              aria-valuenow={sederScope.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${sederScope.title}, ${sederScope.percent} percent`}
            >
              <div
                className="phb-track-fill phb-track-fill--seder"
                style={{ width: `${fillWidth(sederScope.percent)}%` }}
              />
            </div>
          </div>

          <div className="phb-track-row">
            <span className="phb-track-label">Shas</span>
            <div
              className="phb-track"
              role="progressbar"
              aria-valuenow={shasScope.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Shas, ${shasScope.percent} percent`}
            >
              <div
                className="phb-track-fill phb-track-fill--shas"
                style={{ width: `${fillWidth(shasScope.percent)}%` }}
              />
            </div>
          </div>

          <div className="phb-streak">
            {progress.streak.current > 0 && <span className="phb-streak-dot" aria-hidden="true" />}
            <span className="phb-streak-text">
              {progress.streak.current > 0 ? `${progress.streak.current}-day streak` : "Learn today to start a streak"}
            </span>
          </div>
        </div>

        <div className="phb-rule" aria-hidden="true" />

        <div className="phb-passuk" lang="he" dir="rtl">
          <p className="phb-passuk-text">וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה</p>
          <p className="phb-passuk-cite">יהושע א׳:ח׳</p>
        </div>

        <div className="phb-rule" aria-hidden="true" />

        <div className="phb-next">
          <span className="phb-next-label">Up next</span>
          {progress.finishedShas ? (
            <span className="phb-next-ref">Kol HaShas!</span>
          ) : (
            <>
              <span className="phb-next-ref">
                {upNext.masechetEn} {upNext.perek}:{upNext.mishnah}
              </span>
              <button className="phb-next-btn" onClick={onGoToLimmud}>
                <span>Go to My Limmud</span>
                <NavIcon id="arrow" size={15} weight={2.2} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
