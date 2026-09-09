import { useState } from "react";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { buildJourneyScopes, findNextMasechet } from "../../utils/shasJourney";
import { NavIcon } from "../Icon/NavIcon";
import { ProgressTracks } from "../ProgressTracks/ProgressTracks";
import "./ProgressHeaderBar.css";

interface ProgressHeaderBarProps {
  progress: ReturnType<typeof useLearningProgress>;
  onGoToLimmud: () => void;
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
          <ProgressTracks
            bare
            hideEmptyRows
            masechet={{ title: masechetScope.title, percent: masechetScope.percent }}
            seder={{ title: sederScope.title, percent: sederScope.percent }}
            shas={{ percent: shasScope.percent }}
            onStepMasechet={() => setStepIndex((i) => i + 1)}
            canStepMasechet={previewIndex < maxIndex}
            streakCurrent={progress.streak.current}
          />
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
