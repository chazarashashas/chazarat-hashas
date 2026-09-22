import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useName } from "../../i18n";
import { findMasechet } from "../../data/shas";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { buildJourneyScopes, findNextMasechet } from "../../utils/shasJourney";
import { NavIcon } from "../Icon/NavIcon";
import { ProgressTracks } from "../ProgressTracks/ProgressTracks";
import "./ProgressHeaderBar.css";

interface ProgressHeaderBarProps {
  progress: ReturnType<typeof useLearningProgress>;
  onGoToLimmud: () => void;
  onOpenGuide: () => void;
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
export function ProgressHeaderBar({ progress, onGoToLimmud, onOpenGuide }: ProgressHeaderBarProps) {
  const { t } = useTranslation("shell");
  const name = useName();
  const { seder: actualSeder, masechet: actualMasechet } = findNextMasechet(progress);
  const [stepIndex, setStepIndex] = useState(0);
  const maxIndex = actualSeder.masechtot.length - 1;
  const actualIndex = actualSeder.masechtot.findIndex((m) => m.en === actualMasechet.en);
  const previewIndex = Math.min(actualIndex + stepIndex, maxIndex);
  const previewMasechet = actualSeder.masechtot[previewIndex];

  const [masechetScope, sederScope, shasScope] = buildJourneyScopes(progress, previewMasechet.en);
  const upNext = progress.todaysItems[0];
  const upNextMasechet = upNext ? findMasechet(upNext.masechetEn) : undefined;

  return (
    <div className="progress-header-bar">
      <div className="phb-row">
        <div className="phb-tracks">
          <ProgressTracks
            bare
            masechetOnly
            masechet={{ title: name(previewMasechet), percent: masechetScope.percent }}
            seder={{ title: name(actualSeder), percent: sederScope.percent }}
            shas={{ percent: shasScope.percent }}
            onStepMasechet={() => setStepIndex((i) => i + 1)}
            canStepMasechet={previewIndex < maxIndex}
            streakCurrent={progress.streak.current}
          />
        </div>

        <div className="phb-rule" aria-hidden="true" />

        <div className="phb-guide">
          <button className="pill pill--compact phb-guide-btn" onClick={onOpenGuide}>
            <NavIcon id="guide" size={17} weight={2} />
            <span>{t("progressHeader.howToUse")}</span>
          </button>
        </div>

        <div className="phb-rule" aria-hidden="true" />

        <div className="phb-next">
          <span className="phb-next-label">{t("progressHeader.upNext")}</span>
          {progress.finishedShas ? (
            <span className="phb-next-ref">{t("progressHeader.kolHashas")}</span>
          ) : (
            <>
              <span className="phb-next-ref">
                {t("progressHeader.upNextRef", {
                  masechet: upNextMasechet ? name(upNextMasechet) : upNext.masechetEn,
                  perek: upNext.perek,
                  mishnah: upNext.mishnah,
                })}
              </span>
              <button className="btn btn--accent btn--block" onClick={onGoToLimmud}>
                <span>{t("progressHeader.goToLimmud")}</span>
                <NavIcon id="arrow" size={15} weight={2.2} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
