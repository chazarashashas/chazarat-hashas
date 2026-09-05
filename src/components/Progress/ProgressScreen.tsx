import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName } from "../../data/perekInfo";
import { useLearningProgress } from "../../utils/useLearningProgress";
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
export function ProgressScreen() {
  const progress = useLearningProgress();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  return (
    <div className="stage">
      <div className="panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Progress</h1>
        <p className="panel__subtitle">
          How much of Shas you've been exposed to — Daily Limmud and anything you've logged, together.
        </p>

        <div className="progress-shas">
          <div className="progress-shas__pct">{progress.shasPercent()}%</div>
          <div className="progress-shas__label">of all Mishnayot in Shas</div>
        </div>

        <div className="progress-streaks">
          <div className="progress-streak">
            <span className="progress-streak__num">🔥 {progress.streak.current}</span>
            <span className="progress-streak__label">current streak</span>
          </div>
          <div className="progress-streak">
            <span className="progress-streak__num">🏆 {progress.streak.longest}</span>
            <span className="progress-streak__label">longest streak</span>
          </div>
        </div>

        <div className="progress-actions">
          <button className="restart progress-log-btn" onClick={() => setLogOpen(true)}>
            + Log learning
          </button>
          <button className="progress-print-btn" onClick={() => setPrintOpen(true)}>
            ⎙ Print notes
          </button>
        </div>

        <div className="progress-list">
          {SEDARIM.map((seder) => {
            const isOpen = expanded === seder.id;
            return (
              <div key={seder.id} className="progress-seder">
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
