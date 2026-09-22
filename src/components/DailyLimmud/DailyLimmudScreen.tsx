import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SEDARIM, findMasechet } from "../../data/shas";
import { useDirection, useName } from "../../i18n";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { friendlyError } from "../../utils/friendlyError";
import { fetchMishnaTranslation, type TranslationAttribution } from "../../utils/translation";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress, type Pace, paceEquals, paceLabel } from "../../utils/useLearningProgress";
import { useLocalStorageState } from "../../utils/useLocalStorageState";
import { useOfflinePrefetch } from "../../utils/useOfflinePrefetch";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, recordGroupActivityForMasechet, type GroupPace } from "../../utils/useChevrusa";
import { useSiyumim } from "../../utils/useSiyumim";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { ConceptModal } from "../ConceptModal/ConceptModal";
import { NavIcon } from "../Icon/NavIcon";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { FlipCounter } from "../FlipCounter/FlipCounter";
import { buildJourneyScopes } from "../../utils/shasJourney";
import { groupDayItems } from "../../utils/dailyProjection";
import { useGroupContexts } from "../../utils/useGroupContexts";
import { stretchFromErev } from "../../utils/chagCalendar";
import { useToday } from "../../utils/useToday";
import { ChagPrintCard } from "../ChagPrint/ChagPrintCard";
import { LimmudStartPicker, MasechetOptions } from "./LimmudStartPicker";
import { masechetStartIndex as startIndexOf } from "../../utils/dailyProjection";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { useRunShare } from "../Share/useRunShare";
import { learningMoments } from "../Share/learningMoments";
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
  const { t } = useTranslation("dailyLimmud");
  return (
    <button className={"english-switch" + (on ? " english-switch--on" : "")} onClick={onToggle} aria-pressed={on}>
      <span className="english-switch__knob" />
      <span className="english-switch__label">{on ? t("englishSwitch.on") : t("englishSwitch.off")}</span>
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

// The quick-set shortcut lives here; the fuller by-amount/by-frequency
// control lives on My Siyumim (ProgressScreen) — both write the exact
// same progress.pace, so a choice made either place shows up as the
// active pill here and vice versa.
const PACE_OPTIONS: { value: Pace; labelKey: "optionOneMishna" | "optionTwoMishnayot" | "optionOnePerek" }[] = [
  { value: { unit: "mishnayot", amount: 1 }, labelKey: "optionOneMishna" },
  { value: { unit: "mishnayot", amount: 2 }, labelKey: "optionTwoMishnayot" },
  { value: { unit: "perakim", amount: 1 }, labelKey: "optionOnePerek" },
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

interface DailyLimmudScreenProps {
  onOpenNotes?: () => void;
  onOpenLogin?: () => void;
}

export function DailyLimmudScreen({ onOpenNotes, onOpenLogin }: DailyLimmudScreenProps) {
  const { t, i18n } = useTranslation(["dailyLimmud", "common"]);
  const name = useName();
  const dir = useDirection();
  const isHe = i18n.language === "he";
  const masechetName = (en: string) => {
    const m = findMasechet(en);
    return m ? name(m) : en;
  };
  // Points along the reading direction, as the English "▸" does.
  const crumbSep = dir === "rtl" ? "◂" : "▸";
  const { session } = useAuth();
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

  // Only offered once logged in, since groups require an account.
  const groupContexts = useGroupContexts();
  const localToday = useToday();
  // Kept current at local midnight — gone the moment erev ends.
  const erevStretch = stretchFromErev(localToday);
  const share = useRunShare();

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
      : groupDayItems(
          activeContext,
          progress.getMasechetPosition(activeContext),
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
      // Marking this item as loading is a legitimate reaction to
      // showEnglish/items changing, not a render-time derivation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // What this mark completes — a masechet, a seder, Shas, a streak
    // milestone, a chabura finishing together — judged before it lands.
    // The heaviest the prompt rules allow is offered; never a perek.
    share.finish(
      null,
      learningMoments({
        progress,
        marking: items,
        today: localDateStr(),
        chaburaName: !isSelf && activeChabura ? (activeChabura.name?.trim() || t("fallbackChaburaName")) : null,
      }),
    );

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
  const groupPaceShort: Record<GroupPace, string> = {
    "1": t("pace.mishnayotPerDay", { count: 1 }),
    "2": t("pace.groupTwoPerDay"),
    perek: t("pace.perakimPerDay", { count: 1 }),
  };
  const settingsSummary = [
    isSelf ? t("settings.yourOwnLearning") : (activeLabel ?? activeContext),
    firstItem ? masechetName(firstItem.masechetEn) : undefined,
    isSelf ? paceLabel(pace) : groupPaceShort[groupPace],
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
        <div className="screen-head limmud-head">
          <h1 className="screen-head__title">{t("title")}</h1>
          <div className="screen-head__aside limmud-streak">
            <span className="limmud-streak__dot" aria-hidden="true" />
            <span className="limmud-streak__num">{t("streak.days", { count: streak.current })}</span>
            <span className="limmud-streak__label">{t("streak.best", { count: streak.longest })}</span>
          </div>
        </div>

        {erevStretch && <ChagPrintCard stretch={erevStretch} />}

        {(groupContexts.length > 0 || isSelf) && (!finished || isSelf) && (
          <>
            <button
              className="btn btn--secondary btn--block limmud-settings-summary"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
            >
              <span className="limmud-settings-summary__dot" aria-hidden="true" />
              <span className="limmud-settings-summary__text">{settingsSummary}</span>
              <span className={"limmud-settings-summary__chevron" + (settingsOpen ? " limmud-settings-summary__chevron--open" : "")}>
                <NavIcon id="chevron" size={15} weight={2.2} />
              </span>
            </button>

            {isSelf && !settingsOpen && progress.position === 0 && progress.completions.length === 0 && (
              <button className="btn btn--quiet btn--compact limmud-start-hint" onClick={() => setSettingsOpen(true)}>
                {t("settings.startHint", { masechet: name(SEDARIM[0].masechtot[0]) })}
              </button>
            )}

            {settingsOpen && (
              <div className="limmud-settings">
                {groupContexts.length > 0 && (
                  <div className="limmud-control">
                    <p className="mishna-control__label">{t("settings.learningFor")}</p>
                    <div className="pill-row">
                      <button
                        className={"pill" + (activeContext === "self" ? " pill--active" : "")}
                        onClick={() => setContext("self")}
                      >
                        {t("settings.myOwnLearning")}
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
                        {m.userId === session?.user.id ? t("settings.you") : (m.firstName ?? m.username ?? t("settings.someone"))}
                      </span>
                    ))}
                  </div>
                )}

                {isSelf && (
                  <div className="limmud-control">
                    <p className="mishna-control__label">{t("settings.pace")}</p>
                    <div className="pill-row">
                      {PACE_OPTIONS.map((opt) => (
                        <button
                          key={`${opt.value.unit}-${opt.value.amount}`}
                          className={"pill" + (paceEquals(pace, opt.value) ? " pill--active" : "")}
                          onClick={() => handlePaceChange(opt.value)}
                        >
                          {t(`pace.${opt.labelKey}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isSelf && (
                  <div className="limmud-control">
                    <p className="mishna-control__label">{t("settings.startFrom")}</p>
                    <LimmudStartPicker
                      position={progress.position}
                      onStart={(index) => {
                        progress.startFrom(index);
                        setSettingsOpen(false);
                      }}
                    />
                  </div>
                )}
                {!isSelf && (
                  <p className="limmud-settings__fixed-note">
                    {activeChabura
                      ? t("settings.chaburaPaceNote")
                      : t("settings.chevrusaPaceNote")}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {isSelf && !finished && progress.justFinishedMasechet ? (
          <div className="note-banner note-banner--good limmud-finished">
            <p className="limmud-finished__text">{t("finished.masechet", { masechet: masechetName(progress.justFinishedMasechet) })}</p>
            <button className="restart limmud-finished__continue" onClick={progress.continueToNextMasechet}>
              {t("finished.continueTo", {
                masechet: MISHNA_SEQUENCE[progress.position]
                  ? masechetName(MISHNA_SEQUENCE[progress.position].masechetEn)
                  : "",
              })}
            </button>
            <label className="limmud-finished__pick">
              <span>{t("finished.orPickDifferent")}</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) progress.startFrom(startIndexOf(e.target.value));
                }}
              >
                <option value="">{t("finished.choose")}</option>
                <MasechetOptions />
              </select>
            </label>
            {share.prompt("cream")}
          </div>
        ) : finished ? (
          <div className="note-banner note-banner--good limmud-finished">
            {isSelf ? (
              <>
                <p className="limmud-finished__text">{t("finished.endOfShas")}</p>
                <label className="limmud-finished__pick">
                  <span>{t("finished.chooseNext")}</span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) progress.startFrom(startIndexOf(e.target.value));
                    }}
                  >
                    <option value="">{t("finished.choose")}</option>
                    <MasechetOptions />
                  </select>
                </label>
              </>
            ) : (
              <>
                <p className="limmud-finished__text">
                  {t("finished.group", {
                    masechet: masechetName(activeContext),
                    group: activeLabel ?? t("finished.thisGroup"),
                  })}
                </p>
                {nextMasechetName && (
                  <button
                    className="restart limmud-finished__continue"
                    disabled={switchBusy}
                    onClick={() => handleContinueTo(nextMasechetName)}
                  >
                    {switchBusy ? "…" : t("finished.continueTo", { masechet: masechetName(nextMasechetName) })}
                  </button>
                )}
                <label className="limmud-finished__pick">
                  <span>{t("finished.orPickDifferent")}</span>
                  <select
                    value={switchMasechet}
                    onChange={(e) => {
                      setSwitchMasechet(e.target.value);
                      if (e.target.value) handleContinueTo(e.target.value);
                    }}
                    disabled={switchBusy}
                  >
                    <option value="">{t("finished.choose")}</option>
                    {SEDARIM.map((seder) => (
                      <optgroup key={seder.id} label={name(seder)}>
                        {seder.masechtot.map((m) => (
                          <option key={m.en} value={m.en}>
                            {name(m)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </>
            )}
            {share.prompt("cream")}
          </div>
        ) : (
          <div className="limmud-body">
            <div className="limmud-reader">
              <div className="card limmud-card">
                {seder && firstItem && (
                  <p className="limmud-breadcrumb">
                    {!isSelf && activeLabel && (
                      <>
                        <span dir="ltr">{activeLabel}</span> {crumbSep}{" "}
                      </>
                    )}
                    {name(seder)} {crumbSep} {masechetName(firstItem.masechetEn)} {crumbSep}{" "}
                    {t("breadcrumb.perek", { num: hebrewNumeral(firstItem.perek) })}
                    {perekName ? ` (${perekName})` : ""}
                    {items.length === 1
                      ? ` ${crumbSep} ${t("breadcrumb.mishna", { num: isHe ? hebrewNumeral(firstItem.mishnah) : firstItem.mishnah })}`
                      : ""}
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
                            <span className="state state--loading">{t("common:loading")}</span>
                          ) : item.status === "error" ? (
                            <span className="state state--error" dir={dir}>
                              {friendlyError(item.error, "limmud-mishna")}
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
                                  {t("english.notLoading")}
                                  <button className="limmud-english-retry" onClick={() => retryEnglish(item)}>
                                    {t("common:tryAgain")}
                                  </button>
                                </p>
                              )}
                              {en.status === "ok" && (
                                <p className="limmud-mishna__english" lang="en" dir="ltr">
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
                {justMarked ? t("mark.done") : t("mark.action")}
              </button>

              {justMarked && confirmPerek && (
                <div className="limmud-confirm" key={confirmPerek.perek}>
                  <span className="limmud-confirm__letter" dir="rtl">
                    {hebrewNumeral(confirmPerek.perek)}
                  </span>
                  <span className="limmud-confirm__text">
                    <span className="limmud-confirm__head">{t("streak.confirmHead", { count: streak.current })}</span>
                    <span className="limmud-confirm__sub">
                      {confirmPerek.remaining === 0
                        ? t("mark.perekComplete", {
                            num: hebrewNumeral(confirmPerek.perek),
                            masechet: firstItem ? masechetName(firstItem.masechetEn) : "",
                          })
                        : t("mark.leftInPerek", { count: confirmPerek.remaining })}
                    </span>
                  </span>
                </div>
              )}

              {share.prompt("cream")}

              {justMarked && !session && onOpenLogin && streak.current >= 3 && (
                <NudgeStrip
                  text={t("nudge.text", { days: streak.current })}
                  actionLabel={t("nudge.action")}
                  onAction={onOpenLogin}
                  accentColor={getSederHueText(seder?.id)}
                />
              )}

              {isSelf && siyumim.myQueuedPerakim.length > 0 && (
                <section className="limmud-siyumim" aria-label={t("siyumim.ariaLabel")}>
                  <h2 className="section-title">{t("siyumim.title")}</h2>
                  <p className="limmud-siyumim__sub">
                    {t("siyumim.sub", { count: siyumim.myQueuedPerakim.length })}
                  </p>
                  {siyumim.myQueuedPerakim.map((claim) => (
                    <QueuedSiyumPerek key={claim.id} claim={claim} siyumim={siyumim} />
                  ))}
                </section>
              )}
            </div>

            <div className="limmud-notes">
              <FlipCounter scopes={journeyScopes} />

              <div className="limmud-notes__actions">
                <button className="limmud-notes__open" onClick={() => setNoteOpen(true)}>
                  <span className="limmud-notes__open-dot" aria-hidden="true" />
                  <span className="limmud-notes__open-text">
                    <span className="limmud-notes__open-title">{t("notes.namePerek")}</span>
                    <span className="limmud-notes__open-sub">
                      {firstItem && getPerekNote(firstItem.masechetEn, firstItem.perek) ? t("notes.viewNote") : t("notes.addNote")}
                    </span>
                  </span>
                </button>
                <button className="limmud-notes__open limmud-notes__open--concept" onClick={() => setConceptOpen(true)}>
                  <span className="limmud-notes__open-dot limmud-notes__open-dot--concept" aria-hidden="true" />
                  <span className="limmud-notes__open-text">
                    <span className="limmud-notes__open-title">{t("notes.flagConcept")}</span>
                    <span className="limmud-notes__open-sub">
                      {t("notes.savedToReview", { count: progress.concepts.length })}
                    </span>
                  </span>
                </button>
              </div>
              {onOpenNotes && (
                <button className="limmud-concept__open-all" onClick={onOpenNotes}>
                  {t("notes.openAll")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {share.sheet}
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
