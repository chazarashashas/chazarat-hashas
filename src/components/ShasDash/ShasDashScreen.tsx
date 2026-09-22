import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SEDARIM, type Masechet } from "../../data/shas";
import { useDirection, useName } from "../../i18n";
import { useNavLabels } from "../../utils/navItems";
import { getSederHue } from "../../utils/sederHue";
import { shuffle } from "../../utils/shuffle";
import { useGameStats } from "../../utils/useGameStats";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { crossingMs, speedPips, easeToward, laneAt, lockBonus, MAX_DT_MS } from "./dashPhysics";
import { localDateStr } from "../../utils/localDate";
import { ShareSheet } from "../Share/ShareSheet";
import { SharePrompt, ShareLink } from "../Share/SharePrompt";
import { all63Moment, bestMoment, type ShareMoment } from "../Share/shareMoments";
import { pickPrompt, recordPromptShown } from "../Share/sharePrompts";
import "./ShasDashScreen.css";

interface FlatMasechet {
  name: string;
  sederId: string;
}

const ALL_MASECHTOT: FlatMasechet[] = SEDARIM.flatMap((s) =>
  s.masechtot.map((m) => ({ name: m.en, sederId: s.id })),
);
const TOTAL = ALL_MASECHTOT.length;
/** Cards are keyed by English name; this finds the masechet to show it by. */
const MASECHET_BY_EN = new Map<string, Masechet>(SEDARIM.flatMap((s) => s.masechtot.map((m) => [m.en, m])));
const LANES = SEDARIM.length;
const START_LANE = 2;
const START_LIVES = 3;

// The gate column's width. The card stops with its leading edge on the
// column's left edge, so the runway is whatever is left of the board.
const GATE_W = 88;
const RESOLVE_HOLD_MS = 380;

type Phase = "ready" | "playing" | "ended";
type Tone = "idle" | "good" | "bad";
interface Message {
  text: string;
  tone: Tone;
}
const IDLE: Message = { text: "", tone: "idle" };

/* Every glyph is drawn: text characters like ♥ render differently on
   Samsung's font stack than on desktop Chrome. */

function Heart({ full }: { full: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      className={"dash-heart" + (full ? " dash-heart--full" : "")}
    >
      <path d="M12 20.5s-7.8-4.7-7.8-10.4A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.7c0 5.7-7.8 10.4-7.8 10.4z" />
    </svg>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="dash-icon">
      <path d={d} />
    </svg>
  );
}

const ICON = {
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  lock: "M5 12.5l4.5 4.5L19 7.5",
  pause: "M9 6v12M15 6v12",
  play: "M8 5.5v13l10.5-6.5z",
  restart: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.9h3.9",
};

/** Makes the Android back gesture (and Escape) pause a running game, the
    same way it closes a modal — and only while running, so a paused game's
    back gesture still leaves the screen. */
function PauseOnBack({ onBack }: { onBack: () => void }) {
  useEscapeKey(onBack);
  return null;
}

export function ShasDashScreen() {
  const { t } = useTranslation("games");
  const nameOf = useName();
  const navLabels = useNavLabels();
  const dir = useDirection();
  const shown = (en: string): string => {
    const m = MASECHET_BY_EN.get(en);
    return m ? nameOf(m) : en;
  };
  const { stats, recordDashScore } = useGameStats();
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [combo, setCombo] = useState(0);
  const [card, setCard] = useState<FlatMasechet | null>(null);
  const [cardAnim, setCardAnim] = useState<"catch" | "miss" | null>(null);
  const [lane, setLane] = useState(START_LANE);
  const [crossing, setCrossing] = useState(crossingMs(0));
  const [paused, setPaused] = useState(false);
  const [caught, setCaught] = useState<Set<string>>(new Set());
  // What this run can share, whether it earned a prompt, and the open sheet.
  const [runMoment, setRunMoment] = useState<ShareMoment | null>(null);
  const [promptMoment, setPromptMoment] = useState<ShareMoment | null>(null);
  const [sheetMoment, setSheetMoment] = useState<ShareMoment | null>(null);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState<Message>(IDLE);
  const [wobble, setWobble] = useState(false);

  // The frame loop and key handler read these rather than state, which would
  // be a stale closure by the time the next frame runs.
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const pauseBeganRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const cardRef = useRef<FlatMasechet | null>(null);
  const cardIdRef = useRef(0);
  const cardStartRef = useRef(0);
  const crossingRef = useRef(crossingMs(0));
  const laneRef = useRef(START_LANE);
  const yRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const lockRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(START_LIVES);
  const comboRef = useRef(0);
  const caughtRef = useRef<Set<string>>(new Set());
  const bagRef = useRef<FlatMasechet[]>([]);
  const lastNameRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLDivElement>(null);
  const roadRefs = useRef<(HTMLDivElement | null)[]>([]);
  const resolveRef = useRef<(id: number, centreY: number, laneH: number) => void>(() => {});
  // The card runs toward the gates, which sit on the left in Hebrew — the
  // frame loop reads this to run it the other way.
  const dirSignRef = useRef(dir === "rtl" ? -1 : 1);
  useEffect(() => {
    dirSignRef.current = dir === "rtl" ? -1 : 1;
  }, [dir]);

  const best = Math.max(stats.dash.bestScore, score);

  // Shuffle-bag draw. Each refill leaves out whatever is already caught, so
  // once every masechet has come round the bag recycles down to the ones
  // you missed — that is what "catch all 63" means. The top card is swapped
  // if it would repeat the one just drawn.
  const nextCard = useCallback((): FlatMasechet => {
    if (bagRef.current.length === 0) {
      bagRef.current = shuffle(ALL_MASECHTOT.filter((m) => !caughtRef.current.has(m.name)));
      if (bagRef.current.length > 1 && bagRef.current[0].name === lastNameRef.current) {
        [bagRef.current[0], bagRef.current[1]] = [bagRef.current[1], bagRef.current[0]];
      }
    }
    const picked = bagRef.current.shift()!;
    lastNameRef.current = picked.name;
    return picked;
  }, []);

  const togglePause = useCallback(() => {
    if (!runningRef.current) return;
    const now = performance.now();
    if (pausedRef.current) {
      pausedTotalRef.current += now - pauseBeganRef.current;
      pausedRef.current = false;
      setPaused(false);
    } else {
      pauseBeganRef.current = now;
      pausedRef.current = true;
      setPaused(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (runningRef.current && !pausedRef.current) togglePause();
  }, [togglePause]);

  const moveLane = useCallback((delta: number) => {
    // Steering still works while paused: a pause freezes the crossing, not
    // the player — a thinking break you can line up the answer in.
    if (!runningRef.current || !cardRef.current || lockRef.current) return;
    const next = Math.max(0, Math.min(LANES - 1, laneRef.current + delta));
    if (next === laneRef.current) return;
    laneRef.current = next;
    setLane(next);
  }, []);

  /** Commits now instead of waiting for the crossing to finish. */
  const lockIn = useCallback(() => {
    if (!runningRef.current || !cardRef.current) return;
    if (pausedRef.current) togglePause();
    lockRef.current = true;
  }, [togglePause]);

  const spawnCard = useCallback(() => {
    const picked = nextCard();
    const ms = crossingMs(scoreRef.current);
    const now = performance.now();
    cardRef.current = picked;
    cardIdRef.current += 1;
    const id = cardIdRef.current;
    laneRef.current = START_LANE;
    yRef.current = null;
    lockRef.current = false;
    crossingRef.current = ms;
    cardStartRef.current = now;
    pausedTotalRef.current = 0;
    // A pause pressed in the gap between cards carries over to this one,
    // and only this card's share of it counts against this card's clock.
    if (pausedRef.current) pauseBeganRef.current = now;
    lastFrameRef.current = now;
    setCard(picked);
    setCardAnim(null);
    setLane(START_LANE);
    setCrossing(ms);
    setMsg(IDLE);

    const step = (frameNow: number) => {
      if (cardIdRef.current !== id) return;
      const dt = Math.min(Math.max(frameNow - lastFrameRef.current, 0), MAX_DT_MS);
      lastFrameRef.current = frameNow;
      const board = boardRef.current;
      const runner = runnerRef.current;
      // Hold until React has committed this card, so its width is real.
      if (!board || !runner || runner.dataset.card !== picked.name) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const laneH = board.clientHeight / LANES;
      const cardH = runner.offsetHeight;
      const runway = Math.max(0, board.clientWidth - GATE_W - runner.offsetWidth);
      // Progress is wall clock minus time paused, never the sum of clamped
      // frame deltas — those drift from real time whenever frames drop.
      // While paused the clock stops at the moment of pausing, so the card
      // holds its place across the board — but the loop keeps running, so a
      // lane change still eases the card up or down.
      const clockNow = pausedRef.current ? pauseBeganRef.current : frameNow;
      const elapsed = clockNow - cardStartRef.current - pausedTotalRef.current;
      const t = lockRef.current ? 1 : Math.min(1, Math.max(0, elapsed / ms));
      const x = t * runway;
      const targetY = laneRef.current * laneH + (laneH - cardH) / 2;
      if (yRef.current === null) yRef.current = targetY;
      yRef.current = easeToward(yRef.current, targetY, dt);
      runner.style.transform = `translate(${x * dirSignRef.current}px, ${yRef.current}px)`;
      // The live lane's dashes travel with the card, at its own pace.
      const road = roadRefs.current[laneRef.current];
      if (road) road.style.backgroundPositionX = `${x * dirSignRef.current}px`;
      if (t >= 1) {
        resolveRef.current(id, yRef.current + cardH / 2, laneH);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [nextCard]);

  function endGame(didWin: boolean) {
    runningRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setWon(didWin);
    setPhase("ended");
    setCard(null);
    // A new best, or all 63, may prompt (SHARE-BRIEF.md) — judged against
    // the best as it stood before this run is recorded.
    const newBest = scoreRef.current > 0 && scoreRef.current > stats.dash.bestScore;
    const placed = caughtRef.current;
    const moment = didWin ? all63Moment() : bestMoment("dash", placed.size, undefined, [...placed], scoreRef.current);
    setRunMoment(moment);
    const today = localDateStr();
    const prompt = pickPrompt([didWin ? moment : null, !didWin && newBest ? moment : null], today);
    if (prompt) recordPromptShown(prompt.type, today);
    setPromptMoment(prompt);
    recordDashScore(scoreRef.current);
  }

  // The catch is the gate box: whichever box the card's centre is inside
  // when it arrives is the answer — so a card still easing between lanes
  // lands wherever it actually is, not where it was heading.
  function resolveArrival(id: number, centreY: number, laneH: number) {
    const thisCard = cardRef.current;
    if (cardIdRef.current !== id || !thisCard) return;
    cardRef.current = null;
    cardIdRef.current += 1;

    const landed = SEDARIM[laneAt(centreY, laneH, LANES)];
    const answer = SEDARIM.find((s) => s.id === thisCard.sederId)!;
    const correct = landed.id === answer.id;

    if (correct) {
      let bonus = 0;
      if (lockRef.current) {
        const elapsed = performance.now() - cardStartRef.current - pausedTotalRef.current;
        bonus = lockBonus(crossingRef.current, elapsed);
      }
      comboRef.current += 1;
      scoreRef.current += Math.max(1, comboRef.current) + bonus;
      caughtRef.current.add(thisCard.name);
      setCaught(new Set(caughtRef.current));
      setCardAnim("catch");
      const names = { masechet: shown(thisCard.name), seder: nameOf(answer) };
      setMsg({ text: bonus > 0 ? t("dash.caughtWithBonus", { ...names, bonus }) : t("dash.caught", names), tone: "good" });
    } else {
      comboRef.current = 0;
      livesRef.current -= 1;
      setCardAnim("miss");
      setMsg({
        text: t("dash.landed", { landed: nameOf(landed), masechet: shown(thisCard.name), seder: nameOf(answer) }),
        tone: "bad",
      });
      setWobble(true);
      window.setTimeout(() => setWobble(false), 350);
    }
    lockRef.current = false;
    setScore(scoreRef.current);
    setLives(livesRef.current);
    setCombo(comboRef.current);

    const outOfLives = livesRef.current <= 0;
    const allCaught = caughtRef.current.size === TOTAL;
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      if (!runningRef.current) return;
      if (allCaught) endGame(true);
      else if (outOfLives) endGame(false);
      else spawnCard();
    }, RESOLVE_HOLD_MS);
  }

  useEffect(() => {
    resolveRef.current = resolveArrival;
  });

  function stopLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    cardIdRef.current += 1;
  }

  function resetRun() {
    scoreRef.current = 0;
    livesRef.current = START_LIVES;
    comboRef.current = 0;
    pausedRef.current = false;
    lockRef.current = false;
    cardRef.current = null;
    laneRef.current = START_LANE;
    bagRef.current = [];
    lastNameRef.current = null;
    caughtRef.current = new Set();
    setScore(0);
    setLives(START_LIVES);
    setCombo(0);
    setPaused(false);
    setCaught(new Set());
    setWon(false);
    setCard(null);
    setCardAnim(null);
    setLane(START_LANE);
    setCrossing(crossingMs(0));
    setMsg(IDLE);
  }

  function handleStart() {
    stopLoop();
    resetRun();
    runningRef.current = true;
    setPhase("playing");
    spawnCard();
  }

  function handleRestart() {
    stopLoop();
    runningRef.current = false;
    resetRun();
    setPhase("ready");
  }

  useEffect(() => {
    // Lock-in is the arrow toward the gates, pause the one away from them —
    // so the two swap in Hebrew, where the gates are on the left.
    const toGates = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const awayFromGates = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    function onKeydown(e: KeyboardEvent) {
      if (!runningRef.current) return;
      // Tapping only: a held key must not become held steering.
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (!e.repeat) moveLane(e.key === "ArrowUp" ? -1 : 1);
      } else if (e.key === toGates) {
        e.preventDefault();
        if (!e.repeat) lockIn();
      } else if (e.key === " " || e.key === "Spacebar" || e.key === awayFromGates) {
        e.preventDefault();
        if (!e.repeat) togglePause();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [moveLane, lockIn, togglePause, dir]);

  // A phone game that keeps running through a phone call costs a life.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") pause();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pause]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      cardIdRef.current += 1;
    };
  }, []);

  const status: Message = paused ? { text: t("paused"), tone: "idle" } : msg;
  const gameName = navLabels.item({ id: "dash", label: "Shas Dash" });
  const crossingSeconds = (crossing / 1000).toFixed(1);
  const pips = speedPips(crossing);
  const playing = phase === "playing";

  return (
    <div className="stage dash-stage">
      {playing && !paused && <PauseOnBack onBack={pause} />}
      <div className="panel dash-panel">
        <div className="dash-game">
          <div className="dash-head">
            <h1 className="dash-title">{gameName}</h1>
            <button className="icon-btn dash-restart" title={t("restart")} aria-label={t("restart")} onClick={handleRestart}>
              <Icon d={ICON.restart} />
            </button>
          </div>

          <div className="dash-hud">
            <div className="dash-score">
              <span className="dash-score__num">{score}</span>
              <span className="dash-score__best">{t("dash.best", { best })}</span>
            </div>
            <div className="dash-speed" aria-label={t("dash.crossingLabel", { seconds: crossingSeconds })}>
              <span className="dash-speed__secs">{t("dash.crossingSeconds", { seconds: crossingSeconds })}</span>
              <span className="dash-pips" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={"dash-pip" + (i < pips ? " dash-pip--on" : "")} />
                ))}
              </span>
            </div>
            <span className={"dash-combo" + (combo >= 2 ? "" : " dash-combo--hidden")}>×{combo}</span>
            <div className="dash-lives" aria-label={t("dash.livesLabel", { lives, total: START_LIVES })}>
              {Array.from({ length: START_LIVES }, (_, i) => (
                <Heart key={i} full={i < lives} />
              ))}
            </div>
          </div>

          <div className="dash-ledger" aria-label={t("dash.ledgerLabel", { caught: caught.size, total: TOTAL })}>
            {ALL_MASECHTOT.map((m) => (
              <span
                key={m.name}
                className={"dash-ledger__cell" + (caught.has(m.name) ? " dash-ledger__cell--caught" : "")}
                style={{ ["--hue" as string]: getSederHue(m.sederId) }}
              />
            ))}
          </div>

          <div className="dash-tallies">
            {SEDARIM.map((s) => {
              const done = s.masechtot.filter((m) => caught.has(m.en)).length;
              const total = s.masechtot.length;
              return (
                <span
                  key={s.id}
                  className={"dash-tally" + (done === total ? " dash-tally--complete" : "")}
                  style={{ ["--hue" as string]: getSederHue(s.id) }}
                  aria-label={t("dash.tallyLabel", { seder: nameOf(s), done, total })}
                >
                  <span className="dash-tally__name">{nameOf(s)}</span>
                  <span className="dash-tally__count">
                    {done}/{total}
                  </span>
                </span>
              );
            })}
          </div>

          {phase === "ended" ? (
            <div className="game__end dash-end">
              <p className="game__end-big">{won ? t("dash.endWon") : t("dash.endLost")}</p>
              <p className="game__end-sub">
                {won ? t("dash.endWonSub", { total: TOTAL, score }) : t("dash.endLostSub", { score, best })}
              </p>
              {promptMoment && (
                <SharePrompt
                  moment={promptMoment}
                  variant="game"
                  onShare={() => setSheetMoment(promptMoment)}
                  onDismiss={() => setPromptMoment(null)}
                />
              )}
              <div className="dash-end__actions">
                <button className="btn btn--accent" onClick={handleStart}>
                  {won ? t("playAgain") : t("tryAgain", { ns: "common" })}
                </button>
                {runMoment && !promptMoment && <ShareLink onDark onClick={() => setSheetMoment(runMoment)} />}
              </div>
            </div>
          ) : (
            <>
              <div className="dash-board-wrap">
                <div
                  ref={boardRef}
                  className={
                    "dash-board" + (wobble ? " dash-board--wobble" : "") + (playing ? "" : " dash-board--idle")
                  }
                >
                  {SEDARIM.map((s, i) => {
                    const complete = s.masechtot.every((m) => caught.has(m.en));
                    return (
                      <div key={s.id} className="dash-lane" style={{ ["--hue" as string]: getSederHue(s.id) }}>
                        <div
                          ref={(el) => {
                            roadRefs.current[i] = el;
                          }}
                          className={"dash-road" + (playing && lane === i ? " dash-road--live" : "")}
                          aria-hidden="true"
                        />
                        <div className={"dash-gate" + (complete ? " dash-gate--complete" : "")}>{nameOf(s)}</div>
                      </div>
                    );
                  })}
                  {card && (
                    <div ref={runnerRef} className="dash-runner" data-card={card.name}>
                      <span className={"dash-runner__card" + (cardAnim ? ` dash-runner__card--${cardAnim}` : "")}>
                        {shown(card.name)}
                      </span>
                    </div>
                  )}
                </div>
                {phase === "ready" && (
                  <div className="game__start">
                    <button className="btn btn--accent" onClick={handleStart}>
                      {t("start")}
                    </button>
                  </div>
                )}
              </div>

              <div className={`dash-msg dash-msg--${status.tone}`} role="status">
                {status.text}
              </div>

              <div className="dash-controls">
                <button
                  className="dash-ctl"
                  disabled={!playing}
                  title={paused ? t("dash.resumeTitle") : t("dash.pauseTitle")}
                  aria-label={paused ? t("resume") : t("pause")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={togglePause}
                >
                  <Icon d={paused ? ICON.play : ICON.pause} />
                </button>
                <button
                  className="dash-ctl"
                  disabled={!playing}
                  title={t("dash.upTitle")}
                  aria-label={t("dash.upLabel")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => moveLane(-1)}
                >
                  <Icon d={ICON.up} />
                </button>
                <button
                  className="dash-ctl"
                  disabled={!playing}
                  title={t("dash.downTitle")}
                  aria-label={t("dash.downLabel")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => moveLane(1)}
                >
                  <Icon d={ICON.down} />
                </button>
                <button
                  className="dash-ctl dash-ctl--lock"
                  disabled={!playing}
                  title={t("dash.lockTitle")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={lockIn}
                >
                  <Icon d={ICON.lock} />
                  {t("dash.lock")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {sheetMoment && <ShareSheet moment={sheetMoment} onClose={() => setSheetMoment(null)} />}
    </div>
  );
}
