import { useEffect, useState } from "react";
import { SEDARIM, type Masechet } from "../../data/shas";
import { SEDER_TABS } from "../../data/sederTabs";
import { TabBar } from "../TabBar/TabBar";
import { useGameStats } from "../../utils/useGameStats";
import "./RecallScreen.css";

function flatList(): Masechet[] {
  return SEDARIM.flatMap((s) => s.masechtot);
}

const ALL_MASECHTOT = flatList();
const SECONDS_PER_ITEM = 7;
const MIN_DURATION_SEC = 60;

/**
 * Folds the spelling variance between Sephardi/Modern and Ashkenazi
 * transliteration into one comparable form — soft tav as "s" vs "t"
 * (Ketubot/Kesubos, Shabbat/Shabbos), ch/h (Chullin/Hullin), c/k
 * (Succah/Sukkah), doubled letters (Makkot/Makos), and a droppable
 * final "h" (Chagigah/Chagiga) — so any reasonable spelling of a
 * masechet's name is accepted, not just the one spelling in the data.
 */
function normalize(s: string): string {
  let x = s
    .trim()
    .toLowerCase()
    .replace(/['’-]/g, "")
    .replace(/\s+/g, " ");
  x = x.replace(/ch/g, "h");
  x = x.replace(/c/g, "k");
  x = x.replace(/t/g, "s");
  x = x.replace(/ei/g, "e");
  x = x.replace(/(.)\1+/g, "$1");
  x = x.replace(/h+$/, "");
  return x;
}

/** A few common alternate full names that aren't just a spelling variant. */
const ALIASES: [alias: string, target: string][] = [["Pirkei Avot", "Avot"]];
const ALIAS_LOOKUP = new Map(ALIASES.map(([alias, target]) => [normalize(alias), target]));

// Self-check: if any two masechtot (or an alias) ever normalize to the same
// key, spelling-tolerant matching couldn't tell them apart — fail loudly
// rather than silently accept one guess for two different tractates.
(function checkNoCollisions() {
  const seen = new Map<string, string>();
  for (const m of ALL_MASECHTOT) {
    const key = normalize(m.en);
    const existing = seen.get(key);
    if (existing && existing !== m.en) {
      throw new Error(`Recall: "${m.en}" and "${existing}" both normalize to "${key}".`);
    }
    seen.set(key, m.en);
  }
  for (const [alias, target] of ALIASES) {
    const key = normalize(alias);
    const existing = seen.get(key);
    if (existing && existing !== target) {
      throw new Error(`Recall: alias "${alias}" collides with "${existing}".`);
    }
  }
})();

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "ready" | "playing" | "ended";

export function RecallScreen() {
  const { recordChazaraResult } = useGameStats();
  const [sederTab, setSederTab] = useState("all");
  const [phase, setPhase] = useState<Phase>("ready");
  const [guess, setGuess] = useState("");
  const [found, setFound] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);

  const targetList: Masechet[] =
    sederTab === "all" ? ALL_MASECHTOT : SEDARIM.find((s) => s.id === sederTab)!.masechtot;
  const scopeLabel = sederTab === "all" ? "All of Shas" : SEDARIM.find((s) => s.id === sederTab)!.en;
  const durationSec = Math.max(MIN_DURATION_SEC, targetList.length * SECONDS_PER_ITEM);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setPhase("ended");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "ended") recordChazaraResult(found.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleSederTabChange(next: string) {
    setSederTab(next);
    setPhase("ready");
    setFound(new Set());
    setGuess("");
    setTimeLeft(0);
  }

  function handleStart() {
    setFound(new Set());
    setGuess("");
    setTimeLeft(durationSec);
    setPhase("playing");
  }

  function handleRestartIcon() {
    setPhase("ready");
    setFound(new Set());
    setGuess("");
    setTimeLeft(0);
  }

  function handleGuessChange(value: string) {
    setGuess(value);
    const normalized = normalize(value);
    if (!normalized) return;
    const aliasTarget = ALIAS_LOOKUP.get(normalized);
    const match = targetList.find(
      (m) => !found.has(m.en) && (m.en === aliasTarget || normalize(m.en) === normalized),
    );
    if (!match) return;
    const next = new Set(found);
    next.add(match.en);
    setFound(next);
    setGuess("");
    if (next.size === targetList.length) {
      setPhase("ended");
    }
  }

  const missed = targetList.filter((m) => !found.has(m.en));

  return (
    <div className="stage">
      <div className="panel">
        <button className="restart-icon" title="Restart" onClick={handleRestartIcon}>
          ↺
        </button>
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Mishna Chazara</h1>
        <p className="panel__subtitle">Type every masechet you can remember before time runs out.</p>

        {phase !== "ended" && (
          <>
            <div className="recall-hud">
              <span className="recall-timer">{formatTime(phase === "playing" ? timeLeft : durationSec)}</span>
              <span className="recall-progress">
                {found.size} / {targetList.length}
              </span>
            </div>

            <div className="recall-board-wrap">
              <div className={"recall-board" + (phase !== "playing" ? " recall-board--blurred" : "")}>
                <input
                  className="recall-input"
                  autoFocus={phase === "playing"}
                  disabled={phase !== "playing"}
                  value={guess}
                  onChange={(e) => handleGuessChange(e.target.value)}
                  placeholder="Type a masechet…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <div className="recall-grid">
                  {targetList.map((m) => (
                    <div
                      key={m.en}
                      className={
                        "recall-chip" + (found.has(m.en) ? " recall-chip--found" : " recall-chip--pending")
                      }
                    >
                      {found.has(m.en) ? m.en : ""}
                    </div>
                  ))}
                </div>
              </div>

              {phase === "ready" && (
                <div className="recall-board-overlay">
                  <div className="recall-board-overlay__scope">
                    {scopeLabel} — {targetList.length} masechtot
                  </div>
                  <button className="restart" onClick={handleStart}>
                    Start chazara
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {phase === "ended" && (
          <div className="recall-center">
            <div className="recall-center__big">
              {found.size === targetList.length ? "All of them!" : "Time's up"}
            </div>
            <div className="recall-center__sub">
              You found {found.size} of {targetList.length} in {scopeLabel}.
            </div>
            {missed.length > 0 && (
              <div className="recall-missed">
                <p className="recall-missed__label">You missed:</p>
                <div className="recall-missed__list">
                  {missed.map((m) => (
                    <span key={m.en} className="recall-missed__item">
                      {m.en}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button className="restart" onClick={handleStart}>
              Try again
            </button>
          </div>
        )}
      </div>
      <TabBar tabs={SEDER_TABS} activeId={sederTab} onSelect={handleSederTabChange} />
    </div>
  );
}
