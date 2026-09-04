import { useCallback, useEffect, useRef, useState } from "react";
import { SEDARIM } from "../../data/shas";
import "./ShasDashScreen.css";

interface FlatMasechet {
  name: string;
  sederId: string;
}

function flatList(): FlatMasechet[] {
  return SEDARIM.flatMap((s) => s.masechtot.map((m) => ({ name: m.en, sederId: s.id })));
}

const ALL_MASECHTOT = flatList();

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Exponential ramp: starts slow, eases toward the floor without ever hitting
// a hard cap early — a linear ramp stops feeling like it's still speeding up.
const START_MS = 7500;
const FLOOR_MS = 2600;
const DECAY = 0.93;
function durationFor(score: number): number {
  return FLOOR_MS + (START_MS - FLOOR_MS) * Math.pow(DECAY, score);
}

type Phase = "ready" | "playing" | "ended";

function DestinationIcon() {
  return (
    <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true">
      <path d="M6 17 Q20 3 34 17" fill="none" stroke="#c99a2e" strokeWidth="4" strokeLinecap="round" />
      <rect x="7" y="16" width="5" height="20" rx="1" fill="#c99a2e" />
      <rect x="28" y="16" width="5" height="20" rx="1" fill="#c99a2e" />
      <rect x="16" y="25" width="8" height="11" fill="#1b3358" />
    </svg>
  );
}

export function ShasDashScreen() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [card, setCard] = useState<FlatMasechet | null>(null);
  const [lane, setLane] = useState(2);
  const [msg, setMsg] = useState("Steer with ↑ / ↓ to line it up with the right seder.");
  const [flash, setFlash] = useState<{ laneIndex: number; correct: boolean } | null>(null);
  const [cardAnimClass, setCardAnimClass] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [caught, setCaught] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);

  // Refs mirror the latest values for use inside the rAF loop and keydown
  // handler, where React state closures would otherwise go stale.
  const laneRef = useRef(2);
  const cardRef = useRef<FlatMasechet | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const bestScoreRef = useRef(0);
  const runningRef = useRef(false);
  const shuffleBagRef = useRef<FlatMasechet[]>([]);
  const lastCardNameRef = useRef<string | null>(null);
  const cardIdRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseBeganAtRef = useRef(0);
  const forceResolveRef = useRef(false);
  const caughtRef = useRef<Set<string>>(new Set());

  // Shuffle-bag draw, not independent Math.random() picks each time — that
  // was letting the same masechet (Rosh Hashanah, repeatedly) come up far
  // more than it should. A fresh bag is only reshuffled once exhausted, and
  // we swap the top card if it would repeat the very last one drawn.
  const nextCard = useCallback((): FlatMasechet => {
    if (shuffleBagRef.current.length === 0) {
      shuffleBagRef.current = shuffle(ALL_MASECHTOT);
      if (
        lastCardNameRef.current &&
        shuffleBagRef.current[0].name === lastCardNameRef.current &&
        shuffleBagRef.current.length > 1
      ) {
        const tmp = shuffleBagRef.current[0];
        shuffleBagRef.current[0] = shuffleBagRef.current[1];
        shuffleBagRef.current[1] = tmp;
      }
    }
    const picked = shuffleBagRef.current.shift()!;
    lastCardNameRef.current = picked.name;
    return picked;
  }, []);

  function moveLane(delta: number) {
    if (!runningRef.current || !cardRef.current) return;
    const next = Math.max(0, Math.min(5, laneRef.current + delta));
    if (next === laneRef.current) return;
    laneRef.current = next;
    setLane(next);
  }

  /**
   * Freezes (or resumes) the current card's slide in place — a thinking
   * break. Works even in the brief gap between one card resolving and the
   * next spawning, so a press there still "sticks" for the next card
   * instead of being silently dropped.
   */
  function togglePause() {
    if (!runningRef.current) return;
    if (pausedRef.current) {
      startTimeRef.current += performance.now() - pauseBeganAtRef.current;
      pausedRef.current = false;
      setPaused(false);
    } else {
      pauseBeganAtRef.current = performance.now();
      pausedRef.current = true;
      setPaused(true);
    }
  }

  /** Commits to the current lane right away instead of waiting for the slide to finish. */
  function resolveNow() {
    if (!runningRef.current || !cardRef.current) return;
    if (pausedRef.current) {
      pausedRef.current = false;
      setPaused(false);
    }
    forceResolveRef.current = true;
  }

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (!runningRef.current) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveLane(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveLane(1);
      } else if (e.key === "ArrowLeft" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (e.repeat) return;
        togglePause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.repeat) return;
        resolveNow();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cardIdRef.current += 1;
    };
  }, []);

  // resolveArrival and spawnCard call each other (spawnCard's animation ends
  // by calling resolveArrival; resolveArrival schedules the next spawnCard).
  // spawnCard is a useCallback so the animation-start timestamp read is
  // clearly an event-driven side effect, not part of render — it reaches
  // resolveArrival through a ref to avoid a circular closure dependency.
  const resolveArrivalRef = useRef<(thisId: number) => void>(() => {});

  const spawnCard = useCallback(() => {
    const picked = nextCard();
    cardRef.current = picked;
    laneRef.current = 2;
    cardIdRef.current += 1;
    const thisId = cardIdRef.current;
    setCard(picked);
    setLane(2);
    setCardAnimClass(null);

    const dur = durationFor(scoreRef.current);
    startTimeRef.current = performance.now();
    forceResolveRef.current = false;
    function step(now: number) {
      if (cardIdRef.current !== thisId) return;
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const lanesEl = lanesRef.current;
      const textEl = runnerRef.current;
      if (!lanesEl || !textEl) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const maxLeft = lanesEl.clientWidth - 68 - textEl.offsetWidth - 18;
      const t = forceResolveRef.current ? 1 : Math.min(1, (now - startTimeRef.current) / dur);
      textEl.style.left = 10 + t * maxLeft + "px";
      if (t >= 1) {
        forceResolveRef.current = false;
        resolveArrivalRef.current(thisId);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }, [nextCard]);

  function resolveArrival(thisId: number) {
    if (cardIdRef.current !== thisId) return;
    const thisCard = cardRef.current;
    if (!thisCard) return;
    const landedSederId = SEDARIM[laneRef.current].id;
    const correct = landedSederId === thisCard.sederId;

    if (correct) {
      comboRef.current += 1;
      const gain = Math.max(1, comboRef.current);
      scoreRef.current += gain;
      if (scoreRef.current > bestScoreRef.current) bestScoreRef.current = scoreRef.current;
      caughtRef.current.add(thisCard.name);
      setCaught(new Set(caughtRef.current));
      setMsg("On you go!");
      setCardAnimClass("catch-pop");
    } else {
      comboRef.current = 0;
      livesRef.current -= 1;
      setMsg(`Wrong turn — ${thisCard.name} isn't in ${SEDARIM[laneRef.current].en}.`);
      setCardAnimClass("miss-fade");
      setShaking(true);
      window.setTimeout(() => setShaking(false), 350);
    }
    setScore(scoreRef.current);
    setLives(livesRef.current);
    setCombo(comboRef.current);
    setBestScore(bestScoreRef.current);
    setFlash({ laneIndex: laneRef.current, correct });

    const wasLastLife = livesRef.current <= 0;
    const allCaught = caughtRef.current.size === ALL_MASECHTOT.length;
    cardRef.current = null;
    cardIdRef.current += 1;
    setCard(null);

    window.setTimeout(() => {
      setFlash(null);
      if (allCaught) {
        endGame(true);
        return;
      }
      if (wasLastLife && !correct) {
        endGame(false);
        return;
      }
      if (runningRef.current) spawnCard();
    }, 380);
  }

  function endGame(didWin: boolean) {
    runningRef.current = false;
    setWon(didWin);
    setPhase("ended");
  }

  function handleStart() {
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    runningRef.current = true;
    pausedRef.current = false;
    shuffleBagRef.current = [];
    lastCardNameRef.current = null;
    caughtRef.current = new Set();
    setScore(0);
    setLives(3);
    setCombo(0);
    setPaused(false);
    setCaught(new Set());
    setWon(false);
    setPhase("playing");
    setMsg("On the road!");
    spawnCard();
  }

  function handleRestartIcon() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    cardIdRef.current += 1;
    runningRef.current = false;
    pausedRef.current = false;
    forceResolveRef.current = false;
    cardRef.current = null;
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    laneRef.current = 2;
    caughtRef.current = new Set();
    setPhase("ready");
    setScore(0);
    setLives(3);
    setCombo(0);
    setPaused(false);
    setCaught(new Set());
    setWon(false);
    setCard(null);
    setLane(2);
    setFlash(null);
    setCardAnimClass(null);
    setMsg("Steer with ↑ / ↓ to line it up with the right seder.");
  }

  useEffect(() => {
    resolveArrivalRef.current = resolveArrival;
  });

  return (
    <div className="stage dash-stage">
      <div className={"panel dash-panel" + (shaking ? " dash-panel--shake" : "")}>
        <button
          className="restart-icon"
          title="Restart"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRestartIcon}
        >
          ↺
        </button>
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Shas Dash</h1>
        <p className="dash-story">The road to the Beit Hamikdash — steer each masechet into its seder</p>

        {phase === "ended" && (
          <div className="dash-center">
            <div className="dash-center__big">{won ? "All of Shas!" : "Trip cut short"}</div>
            <div className="dash-center__sub">
              {won
                ? `You caught every masechet in Shas — final score ${score}.`
                : `You made it ${score} stops toward the Beit Hamikdash. Best this session: ${bestScore}.`}
            </div>
            <button className="restart" onClick={handleStart}>
              {won ? "Play again" : "Try again"}
            </button>
          </div>
        )}

        {phase !== "ended" && (
          <>
            <div className="dash-instructions">
              ↑ / ↓ to steer · → to lock in now · space / ← to pause
            </div>

            <div className="dash-board-wrap">
              <div className={"dash-board" + (phase !== "playing" ? " dash-board--blurred" : "")}>
                <div className="dash-hud">
                  <div className="dash-lives">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={i < lives ? "" : "dash-lives__lost"}>
                        ♥
                      </span>
                    ))}
                  </div>
                  <div className="dash-score-block">
                    <div className="dash-score">{score}</div>
                    <div className="dash-best">Best: {bestScore}</div>
                  </div>
                </div>

                <div className="dash-combo-row">
                  <span className={"dash-combo" + (combo >= 2 ? " dash-combo--show" : "")}>
                    Combo ×{Math.max(1, combo)}
                  </span>
                </div>

                <div className="dash-destination">
                  <DestinationIcon />
                </div>

                <div className="dash-play-row">
                  <div className="dash-lanes-wrap">
                    <div className="dash-lanes" ref={lanesRef}>
                      {SEDARIM.map((seder, i) => {
                        const done = seder.masechtot.filter((m) => caught.has(m.en)).length;
                        const total = seder.masechtot.length;
                        const complete = done === total;
                        return (
                          <div
                            key={seder.id}
                            className={"dash-lane" + (lane === i ? " dash-lane--current" : "")}
                          >
                            {card && lane === i && (
                              <span
                                ref={runnerRef}
                                className={
                                  "dash-runner" + (cardAnimClass ? " dash-runner--" + cardAnimClass : "")
                                }
                              >
                                {card.name}
                              </span>
                            )}
                            <div
                              className={
                                "dash-bucket" +
                                (flash?.laneIndex === i
                                  ? flash.correct
                                    ? " dash-bucket--correct"
                                    : " dash-bucket--wrong"
                                  : "") +
                                (complete ? " dash-bucket--complete" : "")
                              }
                            >
                              <span className="dash-bucket__name">{seder.en}</span>
                              <span className="dash-bucket__count">
                                {done}/{total}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {paused && phase === "playing" && (
                      <button
                        className="dash-paused-overlay"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={togglePause}
                      >
                        Paused — tap to resume
                      </button>
                    )}
                  </div>

                  <div className="dash-steer">
                    <button
                      className="dash-steer__btn"
                      disabled={phase !== "playing"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => moveLane(-1)}
                    >
                      ▲
                    </button>
                    <button
                      className="dash-steer__btn"
                      disabled={phase !== "playing"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => moveLane(1)}
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <div className="dash-msg">{msg}</div>
              </div>

              {phase === "ready" && (
                <div className="dash-board-overlay">
                  <button className="restart" onMouseDown={(e) => e.preventDefault()} onClick={handleStart}>
                    Start the journey
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
