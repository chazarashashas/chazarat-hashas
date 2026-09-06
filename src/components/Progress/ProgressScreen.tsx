import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { FlipCounter, type FlipScope } from "../FlipCounter/FlipCounter";
import { SEDER_HUE, getSederHue } from "../../utils/sederHue";
import { LogLearningModal } from "./LogLearningModal";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
import "./ProgressScreen.css";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="progress-bar">
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Exposure (has this been read/learned) at every level of the app's own
 * hierarchy — Shas, Seder, Masechet, Perek. Deliberately separate from
 * mastery/accuracy, which the games already measure on their own terms.
 */
interface ProgressScreenProps {
  onOpenNishmat?: () => void;
}

export function ProgressScreen({ onOpenNishmat }: ProgressScreenProps) {
  const progress = useLearningProgress();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Totals for the journey-to-a-siyum framing (HANDOFF30 §2).
  let perakimFinished = 0;
  let masechtotCompleted = 0;
  let mishnayotLearned = 0;
  let totalMishnayot = 0;

  // The masechet you'd finish next: the first one, in Shas order, that
  // isn't 100% done yet.
  let nextSeder = SEDARIM[SEDARIM.length - 1];
  let nextMasechet = nextSeder.masechtot[nextSeder.masechtot.length - 1];
  let nextFound = false;

  for (const seder of SEDARIM) {
    for (const m of seder.masechtot) {
      let mDone = 0;
      let mTotal = 0;
      for (let p = 1; p <= m.perakim; p++) {
        const c = getMishnayotCount(m.en, p);
        mTotal += c;
        let pDone = 0;
        for (let mi = 1; mi <= c; mi++) {
          if (progress.isCompleted({ masechetEn: m.en, perek: p, mishnah: mi })) {
            pDone++;
            mDone++;
          }
        }
        if (pDone === c && c > 0) perakimFinished++;
      }
      mishnayotLearned += mDone;
      totalMishnayot += mTotal;
      if (mDone === mTotal && mTotal > 0) masechtotCompleted++;
      else if (!nextFound) {
        nextSeder = seder;
        nextMasechet = m;
        nextFound = true;
      }
    }
  }

  const masechetPct = progress.masechetPercent(nextMasechet.en, nextMasechet.perakim);
  const sederPct = progress.sederPercent(nextSeder.id);
  const shasPct = progress.shasPercent();
  const hue = getSederHue(nextSeder.id);

  let mDone = 0;
  let mTotal = 0;
  let perakimDoneInMasechet = 0;
  for (let p = 1; p <= nextMasechet.perakim; p++) {
    const c = getMishnayotCount(nextMasechet.en, p);
    mTotal += c;
    let pDone = 0;
    for (let mi = 1; mi <= c; mi++) {
      if (progress.isCompleted({ masechetEn: nextMasechet.en, perek: p, mishnah: mi })) {
        pDone++;
        mDone++;
      }
    }
    if (pDone === c && c > 0) perakimDoneInMasechet++;
  }
  const perakimLeftInMasechet = nextMasechet.perakim - perakimDoneInMasechet;

  let sDone = 0;
  let sTotal = 0;
  for (const m of nextSeder.masechtot) {
    for (let p = 1; p <= m.perakim; p++) {
      const c = getMishnayotCount(m.en, p);
      sTotal += c;
      for (let mi = 1; mi <= c; mi++) {
        if (progress.isCompleted({ masechetEn: m.en, perek: p, mishnah: mi })) sDone++;
      }
    }
  }

  const scopes: FlipScope[] = [
    {
      key: "Masechet",
      title: nextMasechet.en,
      context: `${nextSeder.en} · ${perakimLeftInMasechet} perek${perakimLeftInMasechet === 1 ? "" : "im"} left`,
      percent: masechetPct,
      doneCount: mDone,
      totalCount: mTotal,
      unit: "mishnayot",
      hue,
    },
    {
      key: "Seder",
      title: nextSeder.en,
      context: `${nextSeder.masechtot.length} masechtot`,
      percent: sederPct,
      doneCount: sDone,
      totalCount: sTotal,
      unit: "mishnayot",
      hue,
    },
    {
      key: "Shas",
      title: "Kol HaShas",
      context: "all six sedarim",
      percent: shasPct,
      doneCount: mishnayotLearned,
      totalCount: totalMishnayot,
      unit: "mishnayot",
      hue: "var(--gold)",
    },
  ];

  return (
    <div className="stage">
      <div className="panel">
        <h1 className="panel__title">My Siyumim</h1>
        <p className="panel__subtitle">
          The journey to a siyum — Daily Limmud and anything you've logged, together.
        </p>

        <div className="siyumim-stats">
          <div className="siyumim-stat">
            <span className="siyumim-stat__num">{perakimFinished}</span>
            <span className="siyumim-stat__label">perakim finished</span>
          </div>
          <div className="siyumim-stat">
            <span className="siyumim-stat__num">{masechtotCompleted}</span>
            <span className="siyumim-stat__label">masechtot completed</span>
          </div>
          <div className="siyumim-stat">
            <span className="siyumim-stat__num">{mishnayotLearned}</span>
            <span className="siyumim-stat__label">mishnayot learned</span>
          </div>
        </div>

        <p className="siyumim-next-label">Next siyum</p>
        <FlipCounter large scopes={scopes} />

        <div className="progress-actions">
          <button className="restart progress-log-btn" onClick={() => setLogOpen(true)}>
            + Log learning
          </button>
          <button className="progress-print-btn" onClick={() => setPrintOpen(true)}>
            Print notes
          </button>
        </div>

        {onOpenNishmat && (
          <button className="progress-nishmat-link" onClick={onOpenNishmat}>
            <span className="progress-nishmat-link__title">L'Iluy Nishmat</span>
            <span className="progress-nishmat-link__sub">
              Dedicate a full siyum on Shas to a neshama, or take a perek in someone else's →
            </span>
          </button>
        )}

        <h2 className="home-section-title">Siyumim ahead</h2>
        <div className="progress-list">
          {SEDARIM.map((seder) => {
            const isOpen = expanded === seder.id;
            return (
              <div
                key={seder.id}
                className="progress-seder"
                style={{ ["--row-hue" as string]: SEDER_HUE[seder.id] }}
              >
                <button
                  className="progress-row progress-row--seder"
                  onClick={() => setExpanded(isOpen ? null : seder.id)}
                >
                  <span className="progress-row__label">
                    {isOpen ? "▾" : "▸"} {seder.en}
                  </span>
                  <span className="progress-row__pct">{progress.sederPercent(seder.id)}%</span>
                </button>
                <ProgressBar pct={progress.sederPercent(seder.id)} />

                {isOpen && (
                  <div className="progress-masechtot">
                    {seder.masechtot.map((m) => {
                      const mKey = seder.id + ":" + m.en;
                      const mOpen = expanded === mKey;
                      return (
                        <div key={m.en}>
                          <button
                            className="progress-row progress-row--masechet"
                            onClick={() => setExpanded(mOpen ? seder.id : mKey)}
                          >
                            <span className="progress-row__label">
                              {mOpen ? "▾" : "▸"} {m.en}
                            </span>
                            <span className="progress-row__pct">
                              {progress.masechetPercent(m.en, m.perakim)}%
                            </span>
                          </button>
                          <ProgressBar pct={progress.masechetPercent(m.en, m.perakim)} />

                          {mOpen && (
                            <div className="progress-perakim">
                              {Array.from({ length: m.perakim }, (_, i) => i + 1).map((p) => {
                                const name = getPerekName(m.en, p);
                                return (
                                  <div key={p} className="progress-row progress-row--perek">
                                    <span className="progress-row__label">
                                      Perek {p}
                                      {name ? ` — ${name}` : ""}
                                    </span>
                                    <span className="progress-row__pct">
                                      {progress.perekPercent(m.en, p)}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {logOpen && (
        <LogLearningModal
          onSave={(masechetEn, perek, date) => progress.logLearning(masechetEn, perek, date)}
          onClose={() => setLogOpen(false)}
        />
      )}
      {printOpen && <PrintNotesView onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
