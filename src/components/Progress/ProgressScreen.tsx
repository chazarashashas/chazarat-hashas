import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import {
  useLearningProgress,
  paceToMishnayotPerDay,
  paceEquals,
  paceLabel as formatPaceLabel,
  type Pace,
} from "../../utils/useLearningProgress";
import { useAuth } from "../../utils/useAuth";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { ProgressTracks } from "../ProgressTracks/ProgressTracks";
import { SEDER_HUE } from "../../utils/sederHue";
import { LogLearningModal } from "./LogLearningModal";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
import { CertificateView } from "../Certificate/CertificateView";
import "./ProgressScreen.css";

const MISHNAYOT_AMOUNTS = [1, 2, 3, 5, 10];
const PEREK_AMOUNTS = [1, 2, 3, 4];

const FREQUENCY_OPTIONS: { key: string; label: string; days: number }[] = [
  { key: "month", label: "Every month", days: 30.44 },
  { key: "half-year", label: "Twice a year", days: 182.625 },
  { key: "year", label: "Every year", days: 365.25 },
  { key: "2-years", label: "Every 2 years", days: 730.5 },
  { key: "5-years", label: "Every 5 years", days: 1826.25 },
];

/** The daily pace a target siyum-haShas frequency implies, rounded up —
    17.2 perakim a day finishes late, so the honest figure is 18. Uses
    perakim when that stays a legible few-a-day figure (≥2/day
    unrounded); falls back to mishnayot once perakim/day would round to
    a barely-there 1 or less (a 5-year pace is closer to "3 mishnayot a
    day" than "1 perek a day," which understates it by roughly half). */
function paceForFrequency(days: number, totalPerakim: number, totalMishnayotAll: number): Pace {
  const perakimPerDay = totalPerakim / days;
  if (perakimPerDay >= 2) return { unit: "perakim", amount: Math.ceil(perakimPerDay) };
  return { unit: "mishnayot", amount: Math.ceil(totalMishnayotAll / days) };
}

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
  const auth = useAuth();
  const [paceDirection, setPaceDirection] = useState<"amount" | "frequency">("amount");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [certificateFor, setCertificateFor] = useState<{ en: string; he: string } | null>(null);
  const [shasCertificateOpen, setShasCertificateOpen] = useState(false);

  const certificateName = auth.firstName
    ? `${auth.firstName}${auth.lastName ? ` ${auth.lastName}` : ""}`
    : (auth.username ?? "");

  // Totals for the journey-to-a-siyum framing (HANDOFF30 §2).
  let perakimFinished = 0;
  let totalPerakim = 0;
  let masechtotCompleted = 0;
  let mishnayotLearned = 0;
  let totalMishnayot = 0;

  // The masechet you'd finish next: the first one, in Shas order, that
  // isn't 100% done yet — and the seder it belongs to is the next siyum,
  // since completion happens in Shas order.
  let nextSeder = SEDARIM[SEDARIM.length - 1];
  let nextMasechet = nextSeder.masechtot[nextSeder.masechtot.length - 1];
  let nextFound = false;
  let nextMasechetRemaining = 0;
  let nextSederDone = 0;
  let nextSederTotal = 0;

  for (const seder of SEDARIM) {
    let sDone = 0;
    let sTotal = 0;
    for (const m of seder.masechtot) {
      let mDone = 0;
      let mTotal = 0;
      for (let p = 1; p <= m.perakim; p++) {
        const c = getMishnayotCount(m.en, p);
        mTotal += c;
        totalPerakim++;
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
      sDone += mDone;
      sTotal += mTotal;
      if (mDone === mTotal && mTotal > 0) masechtotCompleted++;
      else if (!nextFound) {
        nextSeder = seder;
        nextMasechet = m;
        nextMasechetRemaining = mTotal - mDone;
        nextFound = true;
      }
    }
    if (seder.id === nextSeder.id) {
      nextSederDone = sDone;
      nextSederTotal = sTotal;
    }
  }

  const masechetPct = progress.masechetPercent(nextMasechet.en, nextMasechet.perakim);
  const sederPct = progress.sederPercent(nextSeder.id);
  const shasPct = progress.shasPercent();

  // Days-per-mishnah at the current Daily Limmud pace — "perek" uses the
  // Shas-wide average mishnayot-per-perek, since a perek's actual length
  // varies. Rounds the remaining-days figure up, never down: an optimistic
  // estimate that quietly slips is worse than a plain one that holds.
  const avgMishnayotPerPerek = totalPerakim > 0 ? totalMishnayot / totalPerakim : 1;
  const perDay = paceToMishnayotPerDay(progress.pace, avgMishnayotPerPerek);
  const sederRemaining = nextSederTotal - nextSederDone;
  const sederDaysLeft = perDay > 0 ? Math.ceil(sederRemaining / perDay) : 0;
  const masechetDaysLeft = perDay > 0 ? Math.ceil(nextMasechetRemaining / perDay) : 0;
  const shasMishnayotRemaining = totalMishnayot - mishnayotLearned;
  const shasDaysLeft = perDay > 0 ? Math.ceil(shasMishnayotRemaining / perDay) : 0;
  // Steady-state average, not "however big the seder you're mid-way
  // through happens to be" — the frequency this pace settles into once
  // it isn't just finishing off whatever's already in progress.
  const avgSederMishnayot = totalMishnayot / SEDARIM.length;
  const sederFrequencyDays = perDay > 0 ? Math.ceil(avgSederMishnayot / perDay) : 0;

  // One ladder for any day count — day/week/month/year, each switching
  // before its own unit stops being meaningful (a 291-day span reads
  // better as "about 10 months" than "291 days" or "0.8 years").
  function spanFromDays(days: number): string {
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
    if (days < 14) return plural(Math.max(1, Math.round(days)), "day");
    if (days < 70) return plural(Math.round(days / 7), "week");
    if (days < 730) return plural(Math.round(days / 30.44), "month");
    return plural(Math.round(days / 365.25), "year");
  }

  function estimatedDate(daysFromNow: number): string {
    // A month-and-year estimate doesn't need a stable "now" across
    // render attempts the way a value feeding logic or a key would —
    // being off by however long a render takes is invisible here.
    // eslint-disable-next-line react-hooks/purity
    const d = new Date(Date.now() + daysFromNow * 86400000);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const paceLabel = formatPaceLabel(progress.pace);

  return (
    <div className="stage">
      <div className="panel">
        <div className="screen-head">
          <h1 className="screen-head__title">My Siyumim</h1>
        </div>

        {sederRemaining > 0 && (
          <div className="hero-card siyum-countdown">
            <div className="siyum-countdown__head">
              <div className="siyum-countdown__text">
                <p className="siyum-countdown__label">Your next siyum</p>
                <p className="siyum-countdown__seder">Seder {nextSeder.en}</p>
              </div>
              <div className="siyum-countdown__eta">
                <span className="siyum-countdown__days">{sederDaysLeft}</span>
                <span className="siyum-countdown__days-unit">days</span>
              </div>
            </div>
            <div className="siyum-countdown__date">around {estimatedDate(sederDaysLeft)}</div>
            <div className="siyum-countdown__bar">
              <div
                className="siyum-countdown__bar-fill"
                style={{ width: `${Math.max(nextSederTotal ? (nextSederDone / nextSederTotal) * 100 : 0, nextSederDone > 0 ? 2 : 0)}%` }}
              />
            </div>
            <div className="siyum-countdown__meta">
              <span>
                {nextSederDone.toLocaleString()} of {nextSederTotal.toLocaleString()} mishnayot ·{" "}
                {sederRemaining.toLocaleString()} to go at {paceLabel}
              </span>
            </div>
            <div className="siyum-countdown__next-masechet">
              <span className="siyum-countdown__next-dot" aria-hidden="true" />
              <span>
                {nextMasechet.en} finishes first — {nextMasechetRemaining} mishnayot away, about{" "}
                {spanFromDays(masechetDaysLeft)}.
              </span>
            </div>

            <div className="pace-control">
              <div className="pace-control__tabs">
                <button
                  className={"pill pill--compact" + (paceDirection === "amount" ? " pill--active" : "")}
                  onClick={() => setPaceDirection("amount")}
                >
                  By daily amount
                </button>
                <button
                  className={"pill pill--compact" + (paceDirection === "frequency" ? " pill--active" : "")}
                  onClick={() => setPaceDirection("frequency")}
                >
                  By how often you finish
                </button>
              </div>

              {paceDirection === "amount" ? (
                <>
                  <div className="pace-pill-row">
                    <button
                      className={"pill pill--compact" + (progress.pace.unit === "mishnayot" ? " pill--active" : "")}
                      onClick={() => progress.setPace({ unit: "mishnayot", amount: 1 })}
                    >
                      Mishnayot
                    </button>
                    <button
                      className={"pill pill--compact" + (progress.pace.unit === "perakim" ? " pill--active" : "")}
                      onClick={() => progress.setPace({ unit: "perakim", amount: 1 })}
                    >
                      Perakim
                    </button>
                  </div>
                  <div className="pace-pill-row">
                    {(progress.pace.unit === "perakim" ? PEREK_AMOUNTS : MISHNAYOT_AMOUNTS).map((amount) => {
                      const optionPace: Pace = { unit: progress.pace.unit, amount };
                      return (
                        <button
                          key={amount}
                          className={"pill pill--compact" + (paceEquals(progress.pace, optionPace) ? " pill--active" : "")}
                          onClick={() => progress.setPace(optionPace)}
                        >
                          {amount}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="pace-pill-row pace-pill-row--frequency">
                  {FREQUENCY_OPTIONS.map((f) => {
                    const optionPace = paceForFrequency(f.days, totalPerakim, totalMishnayot);
                    return (
                      <button
                        key={f.key}
                        className={
                          "pill pill--compact pace-pill--freq" + (paceEquals(progress.pace, optionPace) ? " pill--active" : "")
                        }
                        onClick={() => progress.setPace(optionPace)}
                      >
                        <span className="pace-pill__freq-label">{f.label}</span>
                        <span className="pace-pill__freq-figure">{formatPaceLabel(optionPace)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="pace-control__note">
                {paceLabel}
                {shasMishnayotRemaining > 0 && (
                  <>
                    {" "}
                    · Siyum haShas {estimatedDate(shasDaysLeft)} · seder every {spanFromDays(sederFrequencyDays)}
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="siyumim-stats">
          <div className="card siyumim-stat">
            <span className="siyumim-stat__num">{perakimFinished}</span>
            <span className="siyumim-stat__label">perakim finished</span>
          </div>
          <div className="card siyumim-stat">
            <span className="siyumim-stat__num">{masechtotCompleted}</span>
            <span className="siyumim-stat__label">masechtot completed</span>
          </div>
          <div className="card siyumim-stat">
            <span className="siyumim-stat__num">{mishnayotLearned}</span>
            <span className="siyumim-stat__label">mishnayot learned</span>
          </div>
        </div>

        {shasPct === 100 && (
          <div className="note-banner note-banner--good progress-shas-done">
            <p className="progress-shas-done__text">You've completed all of Shas!</p>
            <button className="btn btn--accent btn--compact progress-cert-btn" onClick={() => setShasCertificateOpen(true)}>
              Get your certificate
            </button>
          </div>
        )}

        <h2 className="section-title">Where each level stands</h2>
        <ProgressTracks
          masechet={{ title: nextMasechet.en, percent: masechetPct }}
          seder={{ title: nextSeder.en, percent: sederPct }}
          shas={{ percent: shasPct }}
          streakCurrent={progress.streak.current}
        />

        <div className="progress-actions">
          <button className="btn btn--primary progress-log-btn" onClick={() => setLogOpen(true)}>
            + Log learning
          </button>
          <button className="btn btn--secondary progress-print-btn" onClick={() => setPrintOpen(true)}>
            Print
          </button>
        </div>

        {onOpenNishmat && (
          <button className="card progress-nishmat-link" onClick={onOpenNishmat}>
            <span className="progress-nishmat-link__title">L'Iluy Nishmat</span>
            <span className="progress-nishmat-link__sub">
              Dedicate a full siyum on Shas to a neshama, or take a perek in someone else's →
            </span>
          </button>
        )}

        <h2 className="section-title">Siyumim ahead</h2>
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
                          {progress.masechetPercent(m.en, m.perakim) === 100 && (
                            <button
                              className="btn btn--accent btn--compact progress-cert-btn progress-cert-btn--row"
                              onClick={() => setCertificateFor({ en: m.en, he: m.he })}
                            >
                              Get certificate
                            </button>
                          )}

                          {mOpen && (
                            <div className="progress-perakim">
                              {Array.from({ length: m.perakim }, (_, i) => i + 1).map((p) => {
                                const name = getPerekName(m.en, p);
                                return (
                                  <div key={p} className="progress-row progress-row--perek">
                                    <span className="progress-row__label">
                                      Perek <span dir="rtl">{hebrewNumeral(p)}</span>
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
      {certificateFor && (
        <CertificateView
          masechetEn={certificateFor.en}
          masechetHe={certificateFor.he}
          defaultName={certificateName}
          onClose={() => setCertificateFor(null)}
        />
      )}
      {shasCertificateOpen && (
        <CertificateView masechetEn={null} defaultName={certificateName} onClose={() => setShasCertificateOpen(false)} />
      )}
    </div>
  );
}
