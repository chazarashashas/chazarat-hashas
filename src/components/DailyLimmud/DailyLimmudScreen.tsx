import { useEffect, useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress, type Pace } from "../../utils/useLearningProgress";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, recordGroupActivityForMasechet } from "../../utils/useChevrusa";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import "./DailyLimmudScreen.css";

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
}

export function DailyLimmudScreen({ onOpenNotes }: DailyLimmudScreenProps) {
  const { firstName, username, session } = useAuth();
  const progress = useLearningProgress();
  const { pace, setPace, streak } = progress;
  const { getPerekNote, setPerekNote } = usePerekNotes();
  const { groups, updateGroupMasechet } = useChevrusa();
  const [switchMasechet, setSwitchMasechet] = useState("");
  const [switchBusy, setSwitchBusy] = useState(false);

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
  const [noteOpen, setNoteOpen] = useState(false);
  const [conceptTitle, setConceptTitle] = useState("");
  const [conceptNote, setConceptNote] = useState("");
  const [conceptSaved, setConceptSaved] = useState(false);

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

  function handleMarkLearned() {
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
    setJustMarked(true);
    window.setTimeout(() => setJustMarked(false), 2200);
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

  function handleSaveConcept() {
    if (!conceptTitle.trim() || firstItem == null) return;
    progress.addConcept(conceptTitle.trim(), conceptNote.trim(), firstItem.masechetEn, firstItem.perek, firstItem.mishnah);
    setConceptTitle("");
    setConceptNote("");
    setConceptSaved(true);
    window.setTimeout(() => setConceptSaved(false), 1800);
  }

  const firstItem = items[0];
  const seder = firstItem ? SEDARIM.find((s) => s.id === (isSelf ? (firstItem as { sederId?: string }).sederId : findSederId(firstItem.masechetEn))) : undefined;
  const perekName = firstItem ? getPerekName(firstItem.masechetEn, firstItem.perek) : null;
  const activeLabel = groupContexts.find((g) => g.masechetEn === activeContext)?.label;
  const nextMasechetName = !isSelf && groupFinished ? nextMasechet(activeContext) : null;

  // Group contents by perek for display — almost always one group, except
  // right at a perek boundary under the 1- or 2-mishnah paces.
  const perekGroups: { masechetEn: string; perek: number; items: MishnaContent[] }[] = [];
  for (const c of contents) {
    const last = perekGroups[perekGroups.length - 1];
    if (last && last.masechetEn === c.masechetEn && last.perek === c.perek) last.items.push(c);
    else perekGroups.push({ masechetEn: c.masechetEn, perek: c.perek, items: [c] });
  }

  return (
    <div className="stage limmud-stage">
      <div className="panel limmud-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Daily Limmud</h1>
        {(firstName || username) && <p className="limmud-welcome">Welcome back, {firstName ?? username}!</p>}
        <p className="panel__subtitle">
          Your next portion of Mishnayot, straight through Shas in order — Berachot to Uktzin.
        </p>

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

        <div className="limmud-controls">
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
          <div className="limmud-streak">
            <span className="limmud-streak__num">🔥{streak.current}</span>
            <span className="limmud-streak__label">day streak · best {streak.longest}</span>
          </div>
        </div>

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
                  {g.items.map((item) => (
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
                    </div>
                  ))}
                </div>
              ))}

              <button
                className={"restart limmud-mark-btn" + (justMarked ? " limmud-mark-btn--done" : "")}
                onClick={handleMarkLearned}
              >
                {justMarked ? "✓ Marked as learned!" : "Mark as learned"}
              </button>
            </div>

            <div className="limmud-notes">
              <p className="limmud-notes__label">Notes for this perek</p>
              <button className="limmud-notes__open" onClick={() => setNoteOpen(true)}>
                {firstItem && getPerekNote(firstItem.masechetEn, firstItem.perek) ? "📝 View note" : "📝 Add note"}
              </button>

              <p className="limmud-notes__label limmud-notes__label--concepts">Concepts to review</p>
              <input
                className="limmud-concept__input"
                value={conceptTitle}
                onChange={(e) => setConceptTitle(e.target.value)}
                placeholder="Concept name"
              />
              <textarea
                className="limmud-concept__textarea"
                value={conceptNote}
                onChange={(e) => setConceptNote(e.target.value)}
                placeholder="What to remember about it"
              />
              <button className="limmud-concept__save" onClick={handleSaveConcept}>
                {conceptSaved ? "✓ Saved" : "Save concept"}
              </button>
              {onOpenNotes && (
                <button className="limmud-concept__open-all" onClick={onOpenNotes}>
                  → View all concepts in Mishna Notes
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
    </div>
  );
}
