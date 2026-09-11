import { forwardRef } from "react";
import { BrandMark } from "../BrandMark";
import { getSederHue } from "../../utils/sederHue";
import { GRID_MASECHTOT, SITE, type ShareMoment } from "./shareMoments";

interface Props {
  moment: ShareMoment;
  /** The student's name, only when they chose to add it. */
  name: string | null;
  withFigure: boolean;
}

/** The logo's six squares in a row — five outlined, one brass — the
    device that makes four different cards read as one product. */
function Squares() {
  return (
    <span className="share-card__squares" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={"share-card__square" + (i === 5 ? " share-card__square--on" : "")} />
      ))}
    </span>
  );
}

/**
 * The image that goes out (SHARE-BRIEF.md "The image"), drawn here at
 * 340px — the sheet's preview is this same element — and exported at
 * 1080 × 1080. Rounded, 20px, on every kind.
 */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ moment, name, withFigure }, ref) {
  const c = moment.card;
  const sub = [c.sub, name].filter(Boolean).join(" · ");
  const lit = c.lit ? new Set(c.lit) : null;

  if (moment.kind === "challenge") {
    return (
      <div ref={ref} className="share-card share-card--challenge">
        <div className="share-card__top">
          <Squares />
          <span className="share-card__he" lang="he" dir="rtl">
            חזרת הש״ס
          </span>
        </div>
        <div className="share-card__middle">
          <div className="share-card__figure">
            {withFigure && <div className="share-card__fig">{c.fig}</div>}
            <div className="share-card__fighead">{c.head}</div>
            {sub && <div className="share-card__figsub">{sub}</div>}
          </div>
          <div className="share-card__grid" dir="rtl" aria-hidden="true">
            {GRID_MASECHTOT.map((m) => (
              <span
                key={m.en}
                className={"share-card__cell" + (lit && !lit.has(m.en) ? " share-card__cell--dim" : "")}
                style={{ ["--cell" as string]: getSederHue(m.sederId) }}
              />
            ))}
          </div>
        </div>
        <div className="share-card__invite-band">
          <div className="share-card__invite">{c.invite}</div>
          <div className="share-card__url">{SITE}</div>
        </div>
      </div>
    );
  }

  if (moment.kind === "step") {
    const pct = c.stepDone ? Math.max(1.6, (c.stepDone / 63) * 100) : null;
    return (
      <div ref={ref} className="share-card share-card--step">
        <div className="share-card__letter" lang="he" dir="rtl" aria-hidden="true">
          {c.letter}
        </div>
        <div className="share-card__column">
          <div className="share-card__label">
            <span className="share-card__label-dot" aria-hidden="true" />
            {c.stepLabel}
          </div>
          <div className="share-card__center">
            <div className="share-card__step-he" lang="he" dir="rtl">
              {c.stepHe}
            </div>
            <div className="share-card__step-head">{c.head}</div>
            {pct !== null && (
              <div className="share-card__road">
                <span className="share-card__road-track">
                  <span className="share-card__road-fill" style={{ width: `${pct}%` }} />
                </span>
                {withFigure && <span className="share-card__road-count">{c.stepDone} / 63</span>}
              </div>
            )}
            <div className="share-card__ahead">{[c.stepAhead, name].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="share-card__foot">
            <span className="share-card__foot-url">{SITE}</span>
            <span className="share-card__foot-he" lang="he" dir="rtl">
              חזרת הש״ס
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (moment.kind === "ceremony") {
    return (
      <div ref={ref} className="share-card share-card--ceremony">
        <div className="share-card__frame">
          <BrandMark variant="reversed" className="share-card__mark share-card__mark--bright" />
          <div className="share-card__center">
            <div className="share-card__cer-he" lang="he" dir="rtl">
              {c.cerHe}
            </div>
            <div className="share-card__rule" aria-hidden="true" />
            <div className="share-card__hadran" lang="he" dir="rtl">
              {c.hadran}
            </div>
            {sub && <div className="share-card__cer-sub">{sub}</div>}
          </div>
          <div className="share-card__cer-url">{SITE}</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="share-card share-card--plain">
      <div className="share-card__letter" lang="he" dir="rtl" aria-hidden="true">
        {c.letter}
      </div>
      <div className="share-card__column">
        <div className="share-card__top share-card__top--start">
          <BrandMark variant="reversed" className="share-card__mark" />
          <span className="share-card__he share-card__he--light" lang="he" dir="rtl">
            חזרת הש״ס
          </span>
        </div>
        <div className="share-card__center">
          {withFigure && <div className="share-card__fig share-card__fig--plain">{c.fig}</div>}
          <div className="share-card__plain-head">{c.head}</div>
          {sub && <div className="share-card__plain-sub">{sub}</div>}
        </div>
        <div className="share-card__plain-foot">
          <div className="share-card__invite">{c.invite}</div>
          <div className="share-card__url">{SITE}</div>
        </div>
      </div>
    </div>
  );
});
