import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SEDARIM, type Seder, type Masechet } from "../../data/shas";
import { useSederTabs } from "../../data/sederTabs";
import { fetchRandomMishna } from "../../utils/sefaria";
import { friendlyError } from "../../utils/friendlyError";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useGameStats } from "../../utils/useGameStats";
import { getSederHue } from "../../utils/sederHue";
import { useTranslation, Trans } from "react-i18next";
import { useDirection, useName } from "../../i18n";
import { useNavLabels } from "../../utils/navItems";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { TranslationReveal } from "../TranslationReveal/TranslationReveal";
import { TabBar } from "../TabBar/TabBar";
import { GameHud } from "../GameHud/GameHud";
import { useRunShare } from "../Share/useRunShare";
import { bestMoment } from "../Share/shareMoments";
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

/** The key of the grade's word in games:mishnaId.grade ("A" in English). */
function letterGrade(percent: number): "a" | "b" | "c" | "d" | "f" {
  if (percent >= 90) return "a";
  if (percent >= 80) return "b";
  if (percent >= 70) return "c";
  if (percent >= 60) return "d";
  return "f";
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
  // The thumb starts at the first option's side, so it slides the other way in Hebrew.
  const step = useDirection() === "rtl" ? -100 : 100;
  return (
    <div className={"switch" + (size ? " switch--" + size : "")}>
      <div
        className="switch__thumb"
        style={{ width: `${100 / options.length}%`, transform: `translateX(${index * step}%)` }}
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
  const { t, i18n } = useTranslation("games");
  const sederTabs = useSederTabs();
  const name = useName();
  const navLabels = useNavLabels();
  /** Perek numbers the way each language counts them: 3 / ג. */
  const perekNum = (n: number): string => (i18n.language === "he" ? hebrewNumeral(n) : String(n));
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
  const { stats, recordQuizResult } = useGameStats();
  const share = useRunShare();
  const timerRef = useRef<number | null>(null);
  const cardBoxRef = useRef<HTMLDivElement>(null);
  const cardTextRef = useRef<HTMLSpanElement>(null);

  const sederDone = Boolean(card.guessedSeder) || card.sederSkipped;
  const masechetDone = Boolean(card.guessedMasechet) || card.masechetSkipped;
  // The core goal — you've located the mishna's seder and masechet. Perek
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
          message: friendlyError(err, "mishna-quiz"),
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
    share.reset();
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
        const scopeLabel =
          scopeType === "all" ? "All of Shas" : scopeType === "seder" ? (SEDARIM.find((s) => s.id === scopeValue)?.en ?? scopeValue) : scopeValue;
        // A score above their best may prompt; any result can be shared.
        const moment = bestMoment("quiz", finalScore, QUIZ_LENGTH);
        share.finish(moment, [finalScore > 0 && finalScore > stats.quiz.bestScore ? moment : null]);
        recordQuizResult(finalScore, QUIZ_LENGTH, scopeLabel);
        return;
      }
    }
    prepareCard();
  }

  const questionNumber = Math.min(quizCardIndex + 1, QUIZ_LENGTH);

  return (
    <div className="stage">
      <div className="panel">
        <div className="mishna-panel-icons">
          {inPlay && (
            <button
              className="icon-btn"
              title={paused ? t("resume") : t("pause")}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶" : "⏸"}
            </button>
          )}
          <button className="icon-btn" title={t("restart")} onClick={() => prepareSession()}>
            ↺
          </button>
        </div>
        <h1 className="panel__title">{navLabels.item({ id: "mishna", label: "Mishna Quiz" })}</h1>

        <div className="mishna-controls-row">
          <div className="mishna-control">
            <p className="mishna-control__label">{t("mishnaId.modeLabel")}</p>
            <Switch
              size="sm"
              options={[
                { value: "streak", label: t("mishnaId.modeStreak") },
                { value: "quiz", label: t("mishnaId.modeQuiz") },
              ]}
              value={mode}
              onChange={handleModeChange}
            />
          </div>
          {scopeType !== "masechta" && (
            <div className="mishna-control">
              <p className="mishna-control__label">{t("mishnaId.practiceLabel")}</p>
              <Switch
                size="sm"
                options={[
                  { value: "masechet", label: t("mishnaId.practiceMasechet") },
                  { value: "perek", label: t("mishnaId.practicePerek") },
                ]}
                value={depth}
                onChange={handleDepthChange}
              />
            </div>
          )}
          {sederTab === "all" ? (
            <div className="mishna-control">
              <p className="mishna-control__label">{t("mishnaId.poolLabel")}</p>
              <select
                className="field__input mishna-narrow-select"
                value={narrowTo}
                onChange={(e) => handleNarrowChange(e.target.value)}
              >
                <option value="">{t("allOfShas")}</option>
                {SEDARIM.map((s) => (
                  <option key={s.id} value={s.id}>
                    {name(s)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            activeSeder && (
              <div className="mishna-control">
                <p className="mishna-control__label">{t("mishnaId.poolLabel")}</p>
                <select
                  className="field__input mishna-narrow-select"
                  value={narrowTo}
                  onChange={(e) => handleNarrowChange(e.target.value)}
                >
                  <option value="">{name(activeSeder)}</option>
                  {activeSeder.masechtot.map((m) => (
                    <option key={m.en} value={m.en}>
                      {name(m)}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {!quizFinished && (
          <GameHud
            doing={
              mode === "streak"
                ? t("mishnaId.hudStreak")
                : started
                  ? t("mishnaId.hudCard", { number: questionNumber, total: QUIZ_LENGTH })
                  : t("mishnaId.hudQuiz")
            }
            progress={inPlay ? 1 - secondsLeft / CARD_SECONDS : 0}
            worth={mode === "streak" ? `🔥 ${streak}` : `${quizScore}${quizBonus ? ` +${quizBonus}` : ""}`}
            urgent={inPlay && secondsLeft <= 10}
          />
        )}

        {quizFinished ? (
          <div className="mishna-summary">
            <div className="popup__mark">✓</div>
            <p className="mishna-summary__score">
              {quizScore} / {QUIZ_LENGTH}
            </p>
            {quizBonus > 0 && <p className="mishna-summary__bonus">{t("mishnaId.perekBonus", { bonus: quizBonus })}</p>}
            <p className="mishna-summary__grade">{t(`mishnaId.grade.${letterGrade((quizScore / QUIZ_LENGTH) * 100)}`)}</p>
            <p className="mishna-summary__label">{t("mishnaId.quizComplete")}</p>
            {share.prompt("cream")}
            <button className="restart" onClick={() => prepareSession()}>
              {t("playAgain")}
            </button>
            {share.link()}
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
                  <span className="mishna-card__loading">{t("loading", { ns: "common" })}</span>
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
                    {t("start")}
                  </button>
                </div>
              )}
              {started && paused && (
                <div className="mishna-card-overlay">
                  <span className="mishna-card__paused">{t("paused")}</span>
                </div>
              )}
            </div>

            {started && !paused && !coreSolved && !card.timedOut && !card.failed && (
              <p className="mishna-english-withheld">{t("mishnaId.englishWithheld")}</p>
            )}

            {!started || paused ? null : card.timedOut && !coreSolved ? (
              <div className="note-banner">
                {t("mishnaId.timesUp", { seder: name(card.seder), masechet: name(card.masechet), perek: perekNum(card.perek) })}
                <button className="mishna-note-link" onClick={() => setNoteOpen(true)}>
                  {getPerekNote(card.masechet.en, card.perek) ? t("mishnaId.viewNote") : t("mishnaId.addNote")}
                </button>
              </div>
            ) : card.failed && !coreSolved ? (
              <div className="note-banner">
                {t("mishnaId.notQuite", { seder: name(card.seder), masechet: name(card.masechet), perek: perekNum(card.perek) })}
                <button className="mishna-note-link" onClick={() => setNoteOpen(true)}>
                  {getPerekNote(card.masechet.en, card.perek) ? t("mishnaId.viewNote") : t("mishnaId.addNote")}
                </button>
              </div>
            ) : !sederDone ? (
              <div className="mishna-step">
                <div className="mishna-step-label">{t("mishnaId.whichSeder")}</div>
                <div className="pill-row pill-row--nowrap mishna-seder-choice">
                  {SEDARIM.map((s) => (
                    <button
                      key={s.id}
                      className={"pill mishna-seder-pill" + (wrongFlash === "seder:" + s.id ? " pill--reject" : "")}
                      style={{ ["--opt-hue" as string]: getSederHue(s.id) }}
                      onClick={() => guessSeder(s.id)}
                    >
                      {name(s)}
                    </button>
                  ))}
                </div>
              </div>
            ) : !masechetDone ? (
              <div className="mishna-step">
                <div className="mishna-step-label">{t("mishnaId.whichMasechet")}</div>
                <div className="pill-row">
                  {card.seder.masechtot.map((m) => (
                    <button
                      key={m.en}
                      className={"pill" + (wrongFlash === "masechet:" + m.en ? " pill--reject" : "")}
                      onClick={() => guessMasechet(m.en)}
                    >
                      {name(m)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="note-banner note-banner--good">
                  {perekRevealed
                    ? t("mishnaId.locatedWithPerek", {
                        seder: name(card.seder),
                        masechet: name(card.masechet),
                        perek: perekNum(card.perek),
                      })
                    : t("mishnaId.located", { seder: name(card.seder), masechet: name(card.masechet) })}
                  {perekRevealed && (
                    <button className="mishna-note-link" onClick={() => setNoteOpen(true)}>
                      {getPerekNote(card.masechet.en, card.perek) ? t("mishnaId.viewNote") : t("mishnaId.addNote")}
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
                      {t("mishnaId.bonusEarned", { perek: perekNum(card.guessedPerek) })}
                    </div>
                  ) : (
                    <div className="mishna-step">
                      <div className="mishna-step-label">
                        <Trans t={t} i18nKey="mishnaId.bonusQuestion" components={{ tag: <span className="bonus-tag" /> }} />
                      </div>
                      <div className="pill-row">
                        {Array.from({ length: card.masechet.perakim }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            className={"pill" + (wrongFlash === "perek:" + n ? " pill--reject" : "")}
                            onClick={() => guessPerek(n)}
                          >
                            {perekNum(n)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            )}

            {started && !paused && (coreSolved || card.timedOut || card.failed) && (
              <button className="restart" onClick={handleAdvance}>
                {mode === "quiz" && quizCardIndex + 1 >= QUIZ_LENGTH ? t("mishnaId.finishQuiz") : t("mishnaId.nextCard")}
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
      <TabBar tabs={sederTabs} activeId={sederTab} onSelect={handleSederTabChange} />
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
      {share.sheet}
    </div>
  );
}
