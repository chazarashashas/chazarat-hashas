import { useEffect, useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { fetchMishnaTranslation, type TranslationAttribution } from "../../utils/translation";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress, type Pace } from "../../utils/useLearningProgress";
import { useLocalStorageState } from "../../utils/useLocalStorageState";
import { useOfflinePrefetch } from "../../utils/useOfflinePrefetch";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, recordGroupActivityForMasechet } from "../../utils/useChevrusa";
import { useSiyumim } from "../../utils/useSiyumim";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { ConceptModal } from "../ConceptModal/ConceptModal";
import { NavIcon } from "../Icon/NavIcon";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { FlipCounter } from "../FlipCounter/FlipCounter";
import { buildJourneyScopes } from "../../utils/shasJourney";
import { QueuedSiyumPerek } from "./QueuedSiyumPerek";
import { NudgeStrip } from "../NudgeStrip/NudgeStrip";
import { TranslationAttributionLine } from "../TranslationAttribution/TranslationAttribution";
import { getSederHueText } from "../../utils/sederHue";
import { localDateStr } from "../../utils/localDate";
import "./DailyLimmudScreen.css";

type EnglishItemState =
  | { status: "loading" }
  | { status: "ok"; text: string; attribution: TranslationAttribution }
  | { status: "error" }
  | { status: "unavailable" };

function englishKey(item: { masechetEn: string; perek: number; mishnah: number }): string {
  return `${item.masechetEn}.${item.perek}.${item.mishnah}`;
}

/** The track-and-knob switch that turns Daily Limmud's stacked English on
    or off — this is the only control in the app that writes the
    `showEnglish` preference (Explore Shas's reveal is per view and never
    touches it). Styled as a setting, not a link, since that's what it is. */
function EnglishSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button className={"english-switch" + (on ? " english-switch--on" : "")} onClick={onToggle} aria-pressed={on}>
      <span className="english-switch__knob" />
      <span className="english-switch__label">{on ? "English on" : "English"}</span>
    </button>
  );
}

interface MishnaItem {
  masechetEn: string;
  perek: number;
  mishnah: number;
}

interface MishnaContent extends MishnaItem {
  status: "loading" | "loaded" | "error";
  textHe?: string;
  error?: string;
}

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: "1", label: "1 Mishnah/day" },
  { value: "2", label: "2 Mishnayot/day" },
  { value: "perek", label: "1 Perek/day" },
];

const ALL_MASECHTOT = SEDARIM.flatMap((s) => s.masechtot.map((m) => ({ ...m, sederId: s.id })));

function findSederId(masechetEn: string): string | undefined {
  return ALL_MASECHTOT.find((m) => m.en === masechetEn)?.sederId;
}

function findPerakim(masechetEn: string): number {
  return ALL_MASECHTOT.find((m) => m.en === masechetEn)?.perakim ?? 1;
}

/** The next masechet in Shas order after this one — Berachot through
    Uktzin, same order Daily Limmud's own sequential reading follows.
    Null once you're at the very end (Uktzin). */
function nextMasechet(masechetEn: string): string | null {
  const index = ALL_MASECHTOT.findIndex((m) => m.en === masechetEn);
  if (index === -1 || index + 1 >= ALL_MASECHTOT.length) return null;
  return ALL_MASECHTOT[index + 1].en;
}

/** Builds the mishnah range for a masechet context at a given pace,
    starting from `start` — same idea as the global sequential range,
    but scoped to one masechet and using that group's own agreed pace
    (chosen once when the chevrusa/chabura was created) rather than a
    hardcoded single mishnah, so switching context in Daily Limmud
    "automatically" reflects however that group decided to pace itself. */
function buildMasechetRange(masechetEn: string, start: MishnaItem, pace: Pace, totalPerakim: number): MishnaItem[] {
  if (start.perek > totalPerakim) return [];
  const items: MishnaItem[] = [{ masechetEn, perek: start.perek, mishnah: start.mishnah }];
  if (pace === "1") return items;

  if (pace === "2") {
    const count = getMishnayotCount(masechetEn, start.perek);
    const next =
      start.mishnah < count
        ? { perek: start.perek, mishnah: start.mishnah + 1 }
        : { perek: start.perek + 1, mishnah: 1 };
    if (next.perek <= totalPerakim) items.push({ masechetEn, ...next });
    return items;
  }

  // pace === "perek": the rest of this perek
  const count = getMishnayotCount(masechetEn, start.perek);
  for (let mi = start.mishnah + 1; mi <= count; mi++) items.push({ masechetEn, perek: start.perek, mishnah: mi });
  return items;
}

interface DailyLimmudScreenProps {
  onOpenNotes?: () => void;
  onOpenLogin?: () => void;
}

export function DailyLimmudScreen({ onOpenNotes, onOpenLogin }: DailyLimmudScreenProps) {
  const { firstName, username, session } = useAuth();
  const progress = useLearningProgress();
  const { pace, setPace, streak } = progress;
  useOfflinePrefetch(progress.position, pace, progress.finishedShas);
  const { getPerekNote, setPerekNote } = usePerekNotes();
  const { groups, updateGroupMasechet } = useChevrusa();
  const siyumim = useSiyumim();
  const [switchMasechet, setSwitchMasechet] = useState("");
  const [switchBusy, setSwitchBusy] = useState(false);
  // The only place this flag is written — Explore Shas's reveal is per
  // view and never touches it, so it never turns itself on elsewhere.
  const [showEnglish, setShowEnglish] = useLocalStorageState<boolean>("showEnglish", false);
  const [englishByKey, setEnglishByKey] = useState<Record<string, EnglishItemState>>({});

  // Every distinct masechet you have an active chevrusa/chabura on —
  // grouped by masechet (not by group), since your real progress
  // through a masechet is one fact even if two groups happen to share
  // it. Only offered once logged in, since groups require an account.
  // Named by who you're learning it with, so it reads like "Chevrusa
  // with Dovid" rather than an anonymous masechet name.
  const groupContexts: { masechetEn: string; label: string; pace: Pace }[] = [];
  {
    const byMasechet = new Map<string, { descriptor: string; pace: Pace }[]>();
    for (const g of groups) {
      let descriptor: string;
      if (!g.isChabura) {
        const partner = g.members.find((m) => m.userId !== session?.user.id);
        const partnerName = partner ? (partner.firstName ?? partner.username ?? null) : null;
        descriptor = partnerName ? `Chevrusa with ${partnerName}` : "Chevrusa";
      } else {
        descriptor = g.name?.trim() || (g.isClass ? "Class" : "Chabura");
      }
      byMasechet.set(g.masechetEn, [...(byMasechet.get(g.masechetEn) ?? []), { descriptor, pace: g.pace }]);
    }
    for (const [masechetEn, entries] of byMasechet) {
      groupContexts.push({
        masechetEn,
        label:
          entries.length > 1 ? `${masechetEn} (${entries.length} groups)` : `${entries[0].descriptor} — ${masechetEn}`,
        pace: entries[0].pace,
      });
    }
  }

  const [context, setContext] = useState<string>("self");
  const activeContext = context === "self" || groupContexts.some((g) => g.masechetEn === context) ? context : "self";

  const [contents, setContents] = useState<MishnaContent[]>([]);
  const [justMarked, setJustMarked] = useState(false);
  const [confirmPerek, setConfirmPerek] = useState<{ perek: number; remaining: number } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isSelf = activeContext === "self";
  const groupFinished = !isSelf && progress.getMasechetPosition(activeContext).perek > findPerakim(activeContext);
  const groupPace = groupContexts.find((g) => g.masechetEn === activeContext)?.pace ?? "1";

  const items: MishnaItem[] = isSelf
    ? progress.todaysItems
    : groupFinished
      ? []
      : buildMasechetRange(
          activeContext,
          { masechetEn: activeContext, ...progress.getMasechetPosition(activeContext) },
          groupPace,
          findPerakim(activeContext),
        );

  const finished = isSelf ? progress.finishedShas : groupFinished;

  const rangeKey = activeContext + "|" + items.map((i) => `${i.masechetEn}.${i.perek}.${i.mishnah}`).join("|");

  // Reset to loading placeholders (or empty) the moment the range
  // changes — adjusted during render, React's own pattern for this,
  // rather than a synchronous setState in the effect below (which only
  // needs to kick off the async fetch).
  const [renderedKey, setRenderedKey] = useState<string | null>(null);
  if (renderedKey !== rangeKey) {
    setRenderedKey(rangeKey);
    setContents(items.map((i) => ({ ...i, status: "loading" as const })));
  }

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    Promise.all(
      items.map(async (item) => {
        try {
          const textHe = await fetchMishna(item.masechetEn, item.perek, item.mishnah);
          return { ...item, status: "loaded" as const, textHe };
        } catch (err) {
          return {
            ...item,
            status: "error" as const,
            error: err instanceof Error ? err.message : "Couldn't load this mishnah.",
          };
        }
      }),
    ).then((results) => {
      if (!cancelled) setContents(results);
    });
    return () => {
      cancelled = true;
    };
    // rangeKey captures every field of items that matters for refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  // Fetches English independently per item, only while the switch is on,
  // and only for items not already fetched (or in flight) — a failed or
  // slow translation for one mishnah never blocks another's, or the
  // Hebrew above, which loads on its own regardless of this effect.
  useEffect(() => {
    if (!showEnglish || items.length === 0) return;
    let cancelled = false;
    for (const item of items) {
      const key = englishKey(item);
      if (englishByKey[key]) continue;
      setEnglishByKey((prev) => ({ ...prev, [key]: { status: "loading" } }));
      fetchMishnaTranslation(item.masechetEn, item.perek, item.mishnah).then((result) => {
        if (cancelled) return;
        setEnglishByKey((prev) => ({
          ...prev,
          [key]:
            result.status === "ok"
              ? { status: "ok", text: result.text, attribution: result.attribution }
              : result.status === "unavailable"
                ? { status: "unavailable" }
                : { status: "error" },
        }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnglish, rangeKey]);

  function retryEnglish(item: MishnaItem) {
    const key = englishKey(item);
    setEnglishByKey((prev) => ({ ...prev, [key]: { status: "loading" } }));
    fetchMishnaTranslation(item.masechetEn, item.perek, item.mishnah).then((result) => {
      setEnglishByKey((prev) => ({
        ...prev,
        [key]:
          result.status === "ok"
            ? { status: "ok", text: result.text, attribution: result.attribution }
            : result.status === "unavailable"
              ? { status: "unavailable" }
              : { status: "error" },
      }));
    });
  }

  function handleMarkLearned() {
    if (!firstItem) return;

    // Captured before the mark lands, while `items`/`isCompleted` still
    // reflect the pre-mark state — needed for "what's left in the perek"
    // in the confirmation banner, since `firstItem` itself moves on to
    // the next perek/masechet the instant position advances.
    const perekTotal = getMishnayotCount(firstItem.masechetEn, firstItem.perek);
    let doneBefore = 0;
    for (let mi = 1; mi <= perekTotal; mi++) {
      if (progress.isCompleted({ masechetEn: firstItem.masechetEn, perek: firstItem.perek, mishnah: mi })) {
        doneBefore++;
      }
    }
    const markingNow = items.filter((i) => i.perek === firstItem.perek).length;
    const remaining = Math.max(0, perekTotal - doneBefore - markingNow);

    if (isSelf) {
      progress.markTodayLearned();
      const masechetEn = items[0]?.masechetEn;
      if (session && masechetEn) recordGroupActivityForMasechet(session.user.id, masechetEn);
    } else {
      for (const item of items) {
        progress.markMasechetMishnaLearned(item.masechetEn, item.perek, item.mishnah);
      }
      const masechetEn = items[0]?.masechetEn;
      if (session && masechetEn) recordGroupActivityForMasechet(session.user.id, masechetEn);
    }
    setConfirmPerek({ perek: firstItem.perek, remaining });
    setJustMarked(true);
    window.setTimeout(() => setJustMarked(false), 4000);
  }

  function handlePaceChange(next: Pace) {
    setPace(next);
  }

  /** Moves every group currently pinned to the just-finished masechet
      on to a new one — the shared fact everyone in that chevrusa/chabura
      is learning, not just this device's view of it. */
  async function handleContinueTo(newMasechetEn: string) {
    setSwitchBusy(true);
    const affectedGroups = groups.filter((g) => g.masechetEn === activeContext);
    await Promise.all(affectedGroups.map((g) => updateGroupMasechet(g.id, newMasechetEn)));
    setSwitchBusy(false);
    setSwitchMasechet("");
    setContext(newMasechetEn);
  }

  function handleSaveConcept(title: string, note: string) {
    if (firstItem == null) return;
    progress.addConcept(title, note, firstItem.masechetEn, firstItem.perek, firstItem.mishnah);
  }

  const firstItem = items[0];
  const seder = firstItem ? SEDARIM.find((s) => s.id === (isSelf ? (firstItem as { sederId?: string }).sederId : findSederId(firstItem.masechetEn))) : undefined;
  const perekName = firstItem ? getPerekName(firstItem.masechetEn, firstItem.perek) : null;
  const activeLabel = groupContexts.find((g) => g.masechetEn === activeContext)?.label;
  const nextMasechetName = !isSelf && groupFinished ? nextMasechet(activeContext) : null;

  const activeChabura = !isSelf ? groups.find((g) => g.masechetEn === activeContext && g.isChabura) : undefined;
  const today = localDateStr();

  // The collapsed settings line — "Learning for" and "Pace" used to be two
  // pill rows shown above the mishnah every day, for a choice most people
  // set once. One line states the current setting; tapping it opens the
  // pickers below instead.
  const paceShort: Record<Pace, string> = { "1": "1 mishnah/day", "2": "2/day", perek: "1 perek/day" };
  const settingsSummary = [
    isSelf ? "Your own learning" : (activeLabel ?? activeContext),
    firstItem?.masechetEn,
    paceShort[isSelf ? pace : groupPace],
  ]
    .filter(Boolean)
    .join(" · ");
  const journeyScopes = buildJourneyScopes(progress, isSelf ? undefined : activeContext);

  // Group contents by perek for display — almost always one group, except
  // right at a perek boundary under the 1- or 2-mishnah paces.
  const perekGroups: { masechetEn: string; perek: number; items: MishnaContent[] }[] = [];
  for (const c of contents) {
    const last = perekGroups[perekGroups.length - 1];
    if (last && last.masechetEn === c.masechetEn && last.perek === c.perek) last.items.push(c);
    else perekGroups.push({ masechetEn: c.masechetEn, perek: c.perek, items: [c] });
  }

  // One credit line next to the switch, not one per mishnah — in practice
  // every item in view shares the same translation version.
  const sharedEnglishAttribution = items
    .map((i) => englishByKey[englishKey(i)])
    .find((s): s is Extract<EnglishItemState, { status: "ok" }> => s?.status === "ok")?.attribution;

  return (
    <div className="stage limmud-stage">
      <div className="panel limmud-panel">
        <div className="limmud-head">
          <div className="limmud-head__text">
            <h1 className="panel__title limmud-head__title">Today's limmud</h1>
            {(firstName || username) ? (
              <p className="panel__subtitle limmud-head__sub">Welcome back, {firstName ?? username}.</p>
            ) : (
              <p className="panel__subtitle limmud-head__sub">
                Your next portion of Mishnayot, straight through Shas in order.
              </p>
            )}
          </div>
          <div className="limmud-streak">
            <span className="limmud-streak__dot" aria-hidden="true" />
            <span className="limmud-streak__num">{streak.current} days</span>
            <span className="limmud-streak__label">best {streak.longest}</span>
          </div>
        </div>

        {(groupContexts.length > 0 || isSelf) && !finished && (
          <>
            <button
              className="limmud-settings-summary"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
            >
              <span className="limmud-settings-summary__dot" aria-hidden="true" />
              <span className="limmud-settings-summary__text">{settingsSummary}</span>
              <span className={"limmud-settings-summary__chevron" + (settingsOpen ? " limmud-settings-summary__chevron--open" : "")}>
                <NavIcon id="chevron" size={15} weight={2.2} />
              </span>
            </button>

            {settingsOpen && (
              <div className="limmud-settings">
                {groupContexts.length > 0 && (
                  <div className="limmud-control">
                    <p className="mishna-control__label">Learning for</p>
                    <div className="pill-row">
                      <button
                        className={"pill" + (activeContext === "self" ? " pill--active" : "")}
                        onClick={() => setContext("self")}
                      >
                        My own learning
                      </button>
                      {groupContexts.map((g) => (
                        <button
                          key={g.masechetEn}
                          className={"pill" + (activeContext === g.masechetEn ? " pill--active" : "")}
                          onClick={() => setContext(g.masechetEn)}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeChabura && (
                  <div className="limmud-chabura-members">
                    {activeChabura.members.map((m) => (
                      <span key={m.userId} className="limmud-chabura-member">
                        <span
                          className={
                            "limmud-chabura-member__dot" +
                            (m.lastLearnedDate === today ? " limmud-chabura-member__dot--done" : "")
                          }
                        />
                        {m.userId === session?.user.id ? "You" : (m.firstName ?? m.username ?? "Someone")}
                      </span>
                    ))}
                  </div>
                )}

                {isSelf && (
                  <div className="limmud-control">
                    <p className="mishna-control__label">Pace</p>
                    <div className="pill-row">
                      {PACE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          className={"pill" + (pace === opt.value ? " pill--active" : "")}
                          onClick={() => handlePaceChange(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!isSelf && (
                  <p className="limmud-settings__fixed-note">
                    {activeChabura
                      ? "The shiur sets its own pace — the same for everyone in it."
                      : "A chevrusa's pace was agreed when it started."}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {finished ? (
          <div className="note-banner note-banner--good limmud-finished">
            {isSelf ? (
              "You've reached the end of Shas in Daily Limmud! Restart from the beginning any time, or switch pace above."
            ) : (
              <>
                <p className="limmud-finished__text">
                  You've finished {activeContext}! Nothing left to learn for {activeLabel ?? "this chevrusa/chabura"}.
                </p>
                {nextMasechetName && (
                  <button
                    className="restart limmud-finished__continue"
                    disabled={switchBusy}
                    onClick={() => handleContinueTo(nextMasechetName)}
                  >
                    {switchBusy ? "…" : `Continue to ${nextMasechetName}`}
                  </button>
                )}
                <label className="limmud-finished__pick">
                  <span>or pick a different masechet:</span>
                  <select
                    value={switchMasechet}
                    onChange={(e) => {
                      setSwitchMasechet(e.target.value);
                      if (e.target.value) handleContinueTo(e.target.value);
                    }}
                    disabled={switchBusy}
                  >
                    <option value="">Choose…</option>
                    {SEDARIM.map((seder) => (
                      <optgroup key={seder.id} label={seder.en}>
                        {seder.masechtot.map((m) => (
                          <option key={m.en} value={m.en}>
                            {m.en}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        ) : (
          <div className="limmud-body">
            <div className="limmud-reader">
              <div className="limmud-card">
                {seder && firstItem && (
                  <p className="limmud-breadcrumb">
                    {!isSelf && activeLabel && <span dir="ltr">{activeLabel} ▸ </span>}
                    {seder.en} ▸ {firstItem.masechetEn} ▸ Perek {hebrewNumeral(firstItem.perek)}
                    {perekName ? ` (${perekName})` : ""}
                    {items.length === 1 ? ` ▸ Mishnah ${firstItem.mishnah}` : ""}
                  </p>
                )}

                {perekGroups.map((g) => (
                  <div key={`${g.masechetEn}-${g.perek}`} className="limmud-perek-block">
                    {g.items.map((item) => {
                      const en = englishByKey[englishKey(item)];
                      return (
                        <div key={item.mishnah} className="limmud-mishna">
                          <p className="limmud-mishna__title" dir="rtl">
                            משנה {hebrewNumeral(item.mishnah)}
                          </p>
                          {item.status === "loading" ? (
                            <span className="limmud-mishna__loading">Loading…</span>
                          ) : item.status === "error" ? (
                            <span className="limmud-mishna__error" dir="ltr">
                              {item.error}
                            </span>
                          ) : (
                            <p className="limmud-mishna__text" dir="rtl">
                              {item.textHe}
                            </p>
                          )}

                          {showEnglish && item.status === "loaded" && en && en.status !== "unavailable" && (
                            <>
                              <div className="limmud-mishna__hairline" />
                              {en.status === "loading" && (
                                <div className="limmud-english-skeleton" aria-hidden="true">
                                  <span className="limmud-english-skeleton__bar" style={{ width: "100%" }} />
                                  <span className="limmud-english-skeleton__bar" style={{ width: "92%" }} />
                                  <span className="limmud-english-skeleton__bar" style={{ width: "64%" }} />
                                </div>
                              )}
                              {en.status === "error" && (
                                <p className="limmud-english-error">
                                  English is not loading right now.
                                  <button className="limmud-english-retry" onClick={() => retryEnglish(item)}>
                                    Try again
                                  </button>
                                </p>
                              )}
                              {en.status === "ok" && (
                                <p className="limmud-mishna__english" dir="ltr">
                                  {en.text}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div className="limmud-english-row">
                  <EnglishSwitch on={showEnglish} onToggle={() => setShowEnglish((v) => !v)} />
                  {showEnglish && sharedEnglishAttribution && (
                    <TranslationAttributionLine attribution={sharedEnglishAttribution} variant="short" />
                  )}
                </div>
              </div>

              <button
                className={"restart limmud-mark-btn" + (justMarked ? " limmud-mark-btn--done" : "")}
                onClick={handleMarkLearned}
                disabled={justMarked}
              >
                {justMarked ? "Marked as learned" : "Mark as learned"}
              </button>

              {justMarked && confirmPerek && (
                <div className="limmud-confirm" key={confirmPerek.perek}>
                  <span className="limmud-confirm__letter" dir="rtl">
                    {hebrewNumeral(confirmPerek.perek)}
                  </span>
                  <span className="limmud-confirm__text">
                    <span className="limmud-confirm__head">Streak day {streak.current}</span>
                    <span className="limmud-confirm__sub">
                      {confirmPerek.remaining === 0
                        ? `Perek ${hebrewNumeral(confirmPerek.perek)} of ${firstItem?.masechetEn ?? ""} complete. Comes back in Review tomorrow.`
                        : `${confirmPerek.remaining} mishnah${confirmPerek.remaining === 1 ? "" : "s"} left in this perek. Comes back in Review tomorrow.`}
                    </span>
                  </span>
                </div>
              )}

              {justMarked && !session && onOpenLogin && streak.current >= 3 && (
                <NudgeStrip
                  text={`${streak.current} days is worth keeping.`}
                  actionLabel="Save my streak →"
                  onAction={onOpenLogin}
                  accentColor={getSederHueText(seder?.id)}
                />
              )}

              {isSelf &&
                siyumim.myQueuedPerakim.map((claim) => (
                  <QueuedSiyumPerek key={claim.id} claim={claim} siyumim={siyumim} />
                ))}
            </div>

            <div className="limmud-notes">
              <FlipCounter scopes={journeyScopes} />

              <div className="limmud-notes__actions">
                <button className="limmud-notes__open" onClick={() => setNoteOpen(true)}>
                  <span className="limmud-notes__open-dot" aria-hidden="true" />
                  <span className="limmud-notes__open-text">
                    <span className="limmud-notes__open-title">Name this perek</span>
                    <span className="limmud-notes__open-sub">
                      {firstItem && getPerekNote(firstItem.masechetEn, firstItem.perek) ? "View note" : "Add note"}
                    </span>
                  </span>
                </button>
                <button className="limmud-notes__open limmud-notes__open--concept" onClick={() => setConceptOpen(true)}>
                  <span className="limmud-notes__open-dot limmud-notes__open-dot--concept" aria-hidden="true" />
                  <span className="limmud-notes__open-text">
                    <span className="limmud-notes__open-title">Flag a concept</span>
                    <span className="limmud-notes__open-sub">
                      {progress.concepts.length} saved to review
                    </span>
                  </span>
                </button>
              </div>
              {onOpenNotes && (
                <button className="limmud-concept__open-all" onClick={onOpenNotes}>
                  → View or print all your notes in Mishna Notes
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {noteOpen && firstItem && (
        <PerekNoteModal
          masechetEn={firstItem.masechetEn}
          perek={firstItem.perek}
          initialValue={getPerekNote(firstItem.masechetEn, firstItem.perek)}
          onSave={(value) => setPerekNote(firstItem.masechetEn, firstItem.perek, value)}
          onClose={() => setNoteOpen(false)}
          onOpenNotes={onOpenNotes}
        />
      )}
      {conceptOpen && firstItem && (
        <ConceptModal
          masechetEn={firstItem.masechetEn}
          perek={firstItem.perek}
          onSave={handleSaveConcept}
          onClose={() => setConceptOpen(false)}
          onOpenNotes={onOpenNotes}
        />
      )}
    </div>
  );
}
