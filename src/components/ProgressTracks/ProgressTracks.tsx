import "./ProgressTracks.css";

interface ScopeInput {
  title: string;
  percent: number;
}

interface ProgressTracksProps {
  masechet: ScopeInput;
  seder: ScopeInput;
  shas: { percent: number };
  onStepMasechet?: () => void;
  canStepMasechet?: boolean;
  streakCurrent?: number;
  /** True when the host already supplies the navy ground (ProgressHeaderBar,
      on Home) — otherwise this renders its own navy hero card, matching
      the Progress screen's use as a standalone block. */
  bare?: boolean;
}

/** A genuinely tiny but nonzero fraction (e.g. 4 of 4,192 mishnayot, 0.1%)
    still needs to render as a visible sliver, or it reads as a bug rather
    than as a beginning. A true zero stays empty. */
function fillWidth(pct: number): number {
  return pct <= 0 ? 0 : Math.max(pct, 1.4);
}

/** The three-scope (masechet -> seder -> Shas) progress display, all shown
    at once as track lengths rather than switched between — extracted from
    ProgressHeaderBar so the Progress screen's "Next siyum" can use the
    same navy-card language instead of FlipCounter's one-at-a-time view.
    See AUDIT.md §F. */
export function ProgressTracks({
  masechet,
  seder,
  shas,
  onStepMasechet,
  canStepMasechet,
  streakCurrent,
  bare,
}: ProgressTracksProps) {
  return (
    <div className={"progress-tracks" + (bare ? "" : " progress-tracks--card")}>
      <div className="progress-tracks__row">
        <span className="progress-tracks__label">
          {masechet.title}
          {onStepMasechet && canStepMasechet && (
            <button className="progress-tracks__step" aria-label="Next masechet" onClick={onStepMasechet}>
              ›
            </button>
          )}
        </span>
        <div
          className="progress-tracks__track"
          role="progressbar"
          aria-valuenow={masechet.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${masechet.title}, ${masechet.percent} percent`}
        >
          <div
            className="progress-tracks__fill progress-tracks__fill--masechet"
            style={{ width: `${fillWidth(masechet.percent)}%` }}
          />
        </div>
      </div>

      <div className="progress-tracks__row">
        <span className="progress-tracks__label">{seder.title}</span>
        <div
          className="progress-tracks__track"
          role="progressbar"
          aria-valuenow={seder.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${seder.title}, ${seder.percent} percent`}
        >
          <div
            className="progress-tracks__fill progress-tracks__fill--seder"
            style={{ width: `${fillWidth(seder.percent)}%` }}
          />
        </div>
      </div>

      <div className="progress-tracks__row">
        <span className="progress-tracks__label">Shas</span>
        <div
          className="progress-tracks__track"
          role="progressbar"
          aria-valuenow={shas.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Shas, ${shas.percent} percent`}
        >
          <div
            className="progress-tracks__fill progress-tracks__fill--shas"
            style={{ width: `${fillWidth(shas.percent)}%` }}
          />
        </div>
      </div>

      {streakCurrent !== undefined && (
        <div className="progress-tracks__streak">
          {streakCurrent > 0 && <span className="progress-tracks__streak-dot" aria-hidden="true" />}
          <span className="progress-tracks__streak-text">
            {streakCurrent > 0 ? `${streakCurrent}-day streak` : "Learn today to start a streak"}
          </span>
        </div>
      )}
    </div>
  );
}
