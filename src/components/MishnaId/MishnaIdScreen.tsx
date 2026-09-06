import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SEDARIM, type Seder, type Masechet } from "../../data/shas";
import { SEDER_TABS } from "../../data/sederTabs";
import { fetchRandomMishna } from "../../utils/sefaria";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useGameStats } from "../../utils/useGameStats";
import { getSederHue } from "../../utils/sederHue";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { TranslationReveal } from "../TranslationReveal/TranslationReveal";
import { TabBar } from "../TabBar/TabBar";
import "./MishnaIdScreen.css";

type ScopeType = "masechta" | "seder" | "all";
type Mode = "streak" | "quiz";
/** How many levels this round asks for, on top of the pool's own scope.
    Seder+Masechet is always the core "you located it" goal — there's no
    seder-only mode, since testing seder alone undercuts that. Perek is
    only ever offered as a bonus round on top, never a requirement. When
    the pool is already narrowed to one masechet, seder+masechet are given
    away by that choice, so this setting is moot — perek is the only thing
    left to test, and the UI doesn't ask. */
type Depth = "masechet" | "perek";

const QUIZ_LENGTH = 15;
const MAX_TEXT_FONT_SIZE = 17;
const MIN_TEXT_FONT_SIZE = 10;
const CARD_SECONDS = 60;
const TIME_BONUS_SECONDS = 10;

function letterGrade(percent: number): string {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

interface FlatMasechet {
  seder: Seder;
  masechet: Masechet;
}

function flatList(): FlatMasechet[] {
  return SEDARIM.flatMap((seder) => seder.masechtot.map((masechet) => ({ seder, masechet })));
}

const ALL_MASECHTOT = flatList();

interface Card {
  seder: Seder;
  masechet: Masechet;
  perek: number;
  guessedSeder: string | null;
  guessedMasechet: string | null;
  guessedPerek: number | null;
  timedOut: boolean;
  /** Quiz mode only: one wrong core guess ends the card, no retries. */
  failed: boolean;
  /** Scope already tells the student the seder — skip that step in the guess flow. */
  sederSkipped: boolean;
  /** Scope already tells the student the masechet, or this round doesn't ask for it. */
  masechetSkipped: boolean;
}

function poolFor(scopeType: ScopeType, scopeValue: string): FlatMasechet[] {
  if (scopeType === "seder") return ALL_MASECHTOT.filter((m) => m.seder.id === scopeValue);
  if (scopeType === "masechta") return ALL_MASECHTOT.filter((m) => m.masechet.en === scopeValue);
  return ALL_MASECHTOT;
}

function newCard(scopeType: ScopeType, scopeValue: string): Card {
  const pool = poolFor(scopeType, scopeValue);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const perek = 1 + Math.floor(Math.random() * pick.masechet.perakim);
  return {
    seder: pick.seder,
    masechet: pick.masechet,
    perek,
    guessedSeder: null,
    guessedMasechet: null,
    guessedPerek: null,
    timedOut: false,
    failed: false,
    sederSkipped: scopeType === "seder" || scopeType === "masechta",
    masechetSkipped: scopeType === "masechta",
  };
}

type MishnaContentState =
  | { status: "loading" }
  | { status: "loaded"; textHe: string; mishnahNumber: number }
  | { status: "error"; message: string };

interface SwitchOption<T extends string> {
  value: T;
  label: string;
}

function Switch<T extends string>({
  options,
  value,
  onChange,
  size,
}: {
  options: SwitchOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm";
}) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div className={"switch" + (size ? " switch--" + size : "")}>
      <div
        className="switch__thumb"
        style={{ width: `${100 / options.length}%`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          className={"switch__option" + (o.value === value ? " switch__option--active" : "")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface MishnaIdScreenProps {
  onOpenNotes?: () => void;
}

export function MishnaIdScreen({ onOpenNotes }: MishnaIdScreenProps) {
  const [mode, setMode] = useState<Mode>("streak");
  const [sederTab, setSederTab] = useState<string>(ALL_MASECHTOT[0].seder.id);
  // Empty string = no narrowing yet, scope is the whole tab (all of Shas, or
  // the whole seder). Otherwise: a seder id (when sederTab is "all") or a
  // masechet name (when sederTab is a specific seder).
  const [narrowTo, setNarrowTo] = useState<string>("");
  const [depth, setDepth] = useState<Depth>("masechet");

  const scopeType: ScopeType =
    sederTab === "all" ? (narrowTo ? "seder" : "all") : narrowTo ? "masechta" : "seder";
  const scopeValue = sederTab === "all" ? narrowTo : narrowTo || sederTab;
  const activeSeder = SEDARIM.find((s) => s.id === sederTab);
  const [card, setCard] = useState<Card>(() => newCard("seder", ALL_MASECHTOT[0].seder.id));
  const [content, setContent] = useState<MishnaContentState>({ status: "loading" });
  const [secondsLeft, setSecondsLeft] = useState(CARD_SECONDS);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [streak, setStreak] = useState(0);
  const [quizCardIndex, setQuizCardIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizBonus, setQuizBonus] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [textFontSize, setTextFontSize] = useState(MAX_TEXT_FONT_SIZE);
  const [noteOpen, setNoteOpen] = useState(false);
  const { getPerekNote, setPerekNote } = usePerekNotes();
  const { recordQuizResult } = useGameStats();
  const timerRef = useRef<number | null>(null);
  const cardBoxRef = useRef<HTMLDivElement>(null);
  const cardTextRef = useRef<HTMLSpanElement>(null);

  const sederDone = Boolean(card.guessedSeder) || card.sederSkipped;
  const masechetDone = Boolean(card.guessedMasechet) || card.masechetSkipped;
  // The core goal — you've located the mishnah's seder and masechet. Perek
  // is never required to reach this; it's an optional bonus round on top.
  const coreSolved = sederDone && masechetDone;
  // Once the pool is narrowed to one masechet, seder+masechet are given
  // away by that choice — perek is the only thing left to test, so treat
  // it as the effective depth regardless of the Practice control (which
  // is hidden in that case anyway).
  const effectiveDepth: Depth = scopeType === "masechta" ? "perek" : depth;
  const bonusAvailable = effectiveDepth === "perek" && coreSolved;
  // Don't give away the perek before the bonus round is attempted — once
  // it's not being tested (or has been), it's fine to reveal.
  const perekRevealed = !bonusAvailable || Boolean(card.guessedPerek);
  const inPlay = started && !coreSolved && !card.timedOut && !card.failed && !quizFinished;

  useEffect(() => {
    let cancelled = false;
    fetchRandomMishna(card.masechet.en, card.perek)
      .then((result) => {
        if (cancelled) return;
        setContent({ status: "loaded", textHe: result.textHe, mishnahNumber: result.mishnahNumber });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setContent({
          status: "error",
          message: err instanceof Error ? err.message : "Couldn't load this mishnah.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [card.masechet.en, card.perek]);

  // The card box is a fixed size — never scroll it. Whenever new text loads,
  // start back at the max font size (React's own pattern for resetting
  // derived state when a value changes: adjust it during render, not in an
  // effect), then a layout effect shrinks it one step at a time until it fits.
  const [measuredContent, setMeasuredContent] = useState(content);
  if (measuredContent !== content) {
    setMeasuredContent(content);
    setTextFontSize(MAX_TEXT_FONT_SIZE);
  }

  useLayoutEffect(() => {
    if (content.status !== "loaded") return;
    const box = cardBoxRef.current;
    const text = cardTextRef.current;
    if (!box || !text) return;
    if (text.scrollHeight > box.clientHeight && textFontSize > MIN_TEXT_FONT_SIZE) {
      setTextFontSize((s) => s - 1);
    }
  }, [content, textFontSize]);

  useEffect(() => {
    if (!inPlay || paused) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerRef.current!);
          timerRef.current = null;
          setCard((c) => ({ ...c, timedOut: true }));
          setStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [inPlay, paused]);

  /** Loads a fresh card without touching whether the session has been started. */
  function prepareCard(nextScopeType = scopeType, nextScopeValue = scopeValue) {
    setCard(newCard(nextScopeType, nextScopeValue));
    setContent({ status: "loading" });
    setSecondsLeft(CARD_SECONDS);
    setPaused(false);
    setNoteOpen(false);
  }

  /** Resets the whole session: back to the Start button, streak/quiz progress cleared. */
  function prepareSession(nextScopeType = scopeType, nextScopeValue = scopeValue) {
    prepareCard(nextScopeType, nextScopeValue);
    setStarted(false);
    setStreak(0);
    setQuizCardIndex(0);
    setQuizScore(0);
    setQuizBonus(0);
    setQuizFinished(false);
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    prepareSession();
  }

  function handleSederTabChange(next: string) {
    setSederTab(next);
    setNarrowTo("");
    const nextScopeType: ScopeType = next === "all" ? "all" : "seder";
    const nextScopeValue = next === "all" ? "" : next;
    prepareSession(nextScopeType, nextScopeValue);
  }

  function handleNarrowChange(value: string) {
    setNarrowTo(value);
    const nextScopeType: ScopeType = sederTab === "all" ? "seder" : "masechta";
    prepareSession(nextScopeType, value);
  }

  function handleDepthChange(next: Depth) {
    setDepth(next);
    prepareSession();
  }

  function handleWrongGuess(key: string) {
    setWrongFlash(key);
    setStreak(0);
    window.setTimeout(() => setWrongFlash((prev) => (prev === key ? null : prev)), 300);
    if (mode === "quiz") {
      setCard((c) => ({ ...c, failed: true }));
    } else {
      setSecondsLeft((s) => Math.max(0, s - TIME_BONUS_SECONDS));
    }
  }

  function bumpTime() {
    setSecondsLeft((s) => s + TIME_BONUS_SECONDS);
  }

  function guessSeder(id: string) {
    if (id === card.seder.id) {
      setCard((c) => ({ ...c, guessedSeder: id }));
      bumpTime();
    } else {
      handleWrongGuess("seder:" + id);
    }
  }
  function guessMasechet(en: string) {
    if (en === card.masechet.en) {
      setCard((c) => ({ ...c, guessedMasechet: en }));
      bumpTime();
    } else {
      handleWrongGuess("masechet:" + en);
    }
  }
  /** Bonus round only — a miss here never costs a streak, time, or the card. */
  function guessPerek(n: number) {
    const key = "perek:" + n;
    if (n === card.perek) {
      setCard((c) => ({ ...c, guessedPerek: n }));
      setStreak((s) => s + 1);
    } else {
      setWrongFlash(key);
      window.setTimeout(() => setWrongFlash((prev) => (prev === key ? null : prev)), 300);
    }
  }

  function handleAdvance() {
    if (mode === "quiz") {
      const scoreDelta = coreSolved ? 1 : 0;
      const nextIndex = quizCardIndex + 1;
      const finalScore = quizScore + scoreDelta;
      setQuizScore((s) => s + scoreDelta);
      if (card.guessedPerek) setQuizBonus((b) => b + 1);
      setQuizCardIndex(nextIndex);
      if (nextIndex >= QUIZ_LENGTH) {
        setQuizFinished(true);
        recordQuizResult(finalScore, QUIZ_LENGTH);
        return;
      }
    }
    prepareCard();
  }

  const questionNumber = Math.min(quizCardIndex + 1, QUIZ_LENGTH);

  return (
    <div className="stage">
      <div className="panel mishna-panel">
        <div className="mishna-panel-icons">
          {inPlay && (
            <button
              className="icon-btn"
              title={paused ? "Resume" : "Pause"}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶" : "⏸"}
            </button>
          )}
          <button className="icon-btn" title="Restart" onClick={() => prepareSession()}>
            ↺
          </button>
        </div>
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Mishna Quiz</h1>
        <p className="panel__subtitle">
          {scopeType === "masechta"
            ? "Seder and masechet are given — name the perek."
            : "Read the mishnah and locate it. Seder and masechet are the goal — perek is bonus."}
        </p>

        <div className="mishna-controls-row">
          <div className="mishna-control">
            <p className="mishna-control__label">Mode</p>
            <Switch
              size="sm"
              options={[
                { value: "streak", label: "🔥 Streak" },
                { value: "quiz", label: "Quiz" },
              ]}
              value={mode}
              onChange={handleModeChange}
            />
          </div>
          {scopeType !== "masechta" && (
            <div className="mishna-control">
              <p className="mishna-control__label">Practice</p>
              <Switch
                size="sm"
                options={[
                  { value: "masechet", label: "Masechet" },
                  { value: "perek", label: "Perek" },
                ]}
                value={depth}
                onChange={handleDepthChange}
              />
            </div>
          )}
          {sederTab === "all" ? (
            <div className="mishna-control">
              <p className="mishna-control__label">Pool</p>
              <select
                className="mishna-narrow-select"
                value={narrowTo}
                onChange={(e) => handleNarrowChange(e.target.value)}
              >
                <option value="">All of Shas</option>
                {SEDARIM.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.en}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            activeSeder && (
              <div className="mishna-control">
                <p className="mishna-control__label">Pool</p>
                <select
                  className="mishna-narrow-select"
                  value={narrowTo}
                  onChange={(e) => handleNarrowChange(e.target.value)}
                >
                  <option value="">{activeSeder.en}</option>
                  {activeSeder.masechtot.map((m) => (
                    <option key={m.en} value={m.en}>
                      {m.en}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {mode === "streak" ? (
          <p className="mishna-streak">Streak: {streak}</p>
        ) : (
          <p className="mishna-streak">
            {started
              ? `Card ${questionNumber} of ${QUIZ_LENGTH} · Score ${quizScore}${quizBonus ? ` · +${quizBonus} bonus` : ""}`
              : `${QUIZ_LENGTH} questions`}
          </p>
        )}

        {inPlay && (
          <div className={"timer-pill" + (secondsLeft <= 10 ? " timer-pill--urgent" : "")}>
            {secondsLeft}s
          </div>
        )}

        {quizFinished ? (
          <div className="mishna-summary">
            <div className="popup__mark">✓</div>
            <p className="mishna-summary__score">
              {quizScore} / {QUIZ_LENGTH}
            </p>
            {quizBonus > 0 && <p className="mishna-summary__bonus">★ {quizBonus} perek bonus</p>}
            <p className="mishna-summary__grade">{letterGrade((quizScore / QUIZ_LENGTH) * 100)}</p>
            <p className="mishna-summary__label">Quiz complete</p>
            <button className="restart" onClick={() => prepareSession()}>
              New quiz
            </button>
          </div>
        ) : (
          <>
            <div className="mishna-card-wrap">
              <div
                ref={cardBoxRef}
                className={"mishna-card" + (!started || paused ? " mishna-card--blurred" : "")}
                dir="rtl"
              >
                {content.status === "loading" ? (
                  <span className="mishna-card__loading">Loading…</span>
                ) : content.status === "error" ? (
                  <span className="mishna-card__error" dir="ltr">
                    {content.message}
                  </span>
                ) : (
                  <span ref={cardTextRef} className="mishna-card__text" style={{ fontSize: textFontSize }}>
                    {content.textHe}
                  </span>
                )}
              </div>
              {!started && (
                <div className="mishna-card-overlay">
                  <button className="restart" onClick={() => setStarted(true)}>
                    Start
                  </button>
                </div>
              )}
              {started && paused && (
                <div className="mishna-card-overlay">
                  <span className="mishna-card__paused">Paused</span>
                </div>
              )}
            </div>

            {started && !paused && !coreSolved && !card.timedOut && !card.failed && (
              <p className="mishna-english-withheld">English becomes available once you have located it.</p>
            )}

            {!started || paused ? null : card.timedOut && !coreSolved ? (
              <div className="note-banner">
                Time's up — it was {card.seder.en} › {card.masechet.en} › Perek {card.perek}.
                <button className="mishna-note-link" onClick={() => setNoteOpen(true)}>
                  {getPerekNote(card.masechet.en, card.perek) ? "View note" : "Add note"}
                </button>
              </div>
            ) : card.failed && !coreSolved ? (
              <div className="note-banner">
                Not quite — it was {card.seder.en} › {card.masechet.en} › Perek {card.perek}.
                <button className="mishna-note-link" onClick={() => setNoteOpen(true)}>
                  {getPerekNote(card.masechet.en, card.perek) ? "View note" : "Add note"}
                </button>
              </div>
            ) : !sederDone ? (
              <div className="mishna-step">
                <div className="mishna-step-label">Which seder?</div>
                <div className="pill-row pill-row--nowrap mishna-seder-choice">
                  {SEDARIM.map((s) => (
                    <button
                      key={s.id}
                      className={"pill mishna-seder-pill" + (wrongFlash === "seder:" + s.id ? " pill--reject" : "")}
                      style={{ ["--opt-hue" as string]: getSederHue(s.id) }}
                      onClick={() => guessSeder(s.id)}
                    >
                      {s.en}
                    </button>
                  ))}
                </div>
              </div>
            ) : !masechetDone ? (
              <div className="mishna-step">
                <div className="mishna-step-label">Which masechet?</div>
                <div className="pill-row">
                  {card.seder.masechtot.map((m) => (
                    <button
                      key={m.en}
                      className={"pill" + (wrongFlash === "masechet:" + m.en ? " pill--reject" : "")}
                      onClick={() => guessMasechet(m.en)}
                    >
                      {m.en}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="note-banner note-banner--good">
                  Located — {card.seder.en} › {card.masechet.en}
                  {perekRevealed ? ` › Perek ${card.perek}.` : "."}
                  {perekRevealed && (
                    <button className="mishna-note-link" onClick={() => setNoteOpen(true)}>
                      {getPerekNote(card.masechet.en, card.perek) ? "View note" : "Add note"}
                    </button>
                  )}
                  {content.status === "loaded" && (
                    <div className="mishna-located-english">
                      <TranslationReveal
                        key={`${card.masechet.en}.${card.perek}.${content.mishnahNumber}`}
                        masechetEn={card.masechet.en}
                        perek={card.perek}
                        mishnah={content.mishnahNumber}
                      />
                    </div>
                  )}
                </div>
                {bonusAvailable &&
                  (card.guessedPerek ? (
                    <div className="note-banner note-banner--bonus">
                      ★ Perek {card.guessedPerek} — bonus earned!
                    </div>
                  ) : (
                    <div className="mishna-step">
                      <div className="mishna-step-label">
                        Bonus: which perek? <span className="bonus-tag">extra credit</span>
                      </div>
                      <div className="pill-row">
                        {Array.from({ length: card.masechet.perakim }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            className={"pill" + (wrongFlash === "perek:" + n ? " pill--reject" : "")}
                            onClick={() => guessPerek(n)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            )}

            {started && !paused && (coreSolved || card.timedOut || card.failed) && (
              <button className="restart" onClick={handleAdvance}>
                {mode === "quiz" && quizCardIndex + 1 >= QUIZ_LENGTH ? "Finish quiz" : "Next card"}
              </button>
            )}
          </>
        )}

        {!quizFinished && started && (
          <div className="mishna-checks">
            <div className={"mishna-checks__c" + (card.guessedSeder ? " mishna-checks__c--done" : "")}>✓</div>
            <div className={"mishna-checks__c" + (card.guessedMasechet ? " mishna-checks__c--done" : "")}>
              ✓
            </div>
            {effectiveDepth === "perek" && (
              <div
                className={
                  "mishna-checks__c mishna-checks__c--bonus" +
                  (card.guessedPerek ? " mishna-checks__c--done" : "")
                }
              >
                ★
              </div>
            )}
          </div>
        )}
      </div>
      <TabBar tabs={SEDER_TABS} activeId={sederTab} onSelect={handleSederTabChange} />
      {noteOpen && (
        <PerekNoteModal
          masechetEn={card.masechet.en}
          perek={card.perek}
          initialValue={getPerekNote(card.masechet.en, card.perek)}
          onSave={(value) => setPerekNote(card.masechet.en, card.perek, value)}
          onClose={() => setNoteOpen(false)}
          onOpenNotes={onOpenNotes}
        />
      )}
    </div>
  );
}
