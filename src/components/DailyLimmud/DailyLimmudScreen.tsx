import { useEffect, useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress, type Pace } from "../../utils/useLearningProgress";
import { useAuth } from "../../utils/useAuth";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import "./DailyLimmudScreen.css";

interface MishnaContent {
  masechetEn: string;
  perek: number;
  mishnah: number;
  status: "loading" | "loaded" | "error";
  textHe?: string;
  error?: string;
}

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: "1", label: "1 Mishnah/day" },
  { value: "2", label: "2 Mishnayot/day" },
  { value: "perek", label: "1 Perek/day" },
];

interface DailyLimmudScreenProps {
  onOpenNotes?: () => void;
}

export function DailyLimmudScreen({ onOpenNotes }: DailyLimmudScreenProps) {
  const { firstName, username } = useAuth();
  const progress = useLearningProgress();
  const { todaysItems, finishedShas, pace, setPace, markTodayLearned, addConcept, streak } = progress;
  const { getPerekNote, setPerekNote } = usePerekNotes();

  const [contents, setContents] = useState<MishnaContent[]>([]);
  const [justMarked, setJustMarked] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [conceptTitle, setConceptTitle] = useState("");
  const [conceptNote, setConceptNote] = useState("");
  const [conceptSaved, setConceptSaved] = useState(false);

  const rangeKey = todaysItems.map((i) => `${i.masechetEn}.${i.perek}.${i.mishnah}`).join("|");

  // Reset to loading placeholders (or empty, once Shas is finished) the
  // moment the range changes — adjusted during render, React's own
  // pattern for this, rather than as a synchronous setState in the effect
  // below (which only needs to kick off the async fetch).
  const [renderedKey, setRenderedKey] = useState<string | null>(null);
  if (renderedKey !== rangeKey) {
    setRenderedKey(rangeKey);
    setContents(todaysItems.map((i) => ({ ...i, status: "loading" as const })));
  }

  useEffect(() => {
    if (todaysItems.length === 0) return;
    let cancelled = false;
    Promise.all(
      todaysItems.map(async (item) => {
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
    // rangeKey captures every field of todaysItems that matters for refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  function handleMarkLearned() {
    markTodayLearned();
    setJustMarked(true);
    window.setTimeout(() => setJustMarked(false), 2200);
  }

  function handlePaceChange(next: Pace) {
    setPace(next);
  }

  function handleSaveConcept() {
    if (!conceptTitle.trim() || firstItem == null) return;
    addConcept(
      conceptTitle.trim(),
      conceptNote.trim(),
      firstItem.masechetEn,
      firstItem.perek,
      firstItem.mishnah,
    );
    setConceptTitle("");
    setConceptNote("");
    setConceptSaved(true);
    window.setTimeout(() => setConceptSaved(false), 1800);
  }

  const firstItem = todaysItems[0];
  const seder = firstItem ? SEDARIM.find((s) => s.id === firstItem.sederId) : undefined;
  const perekName = firstItem ? getPerekName(firstItem.masechetEn, firstItem.perek) : null;

  // Group contents by perek for display — almost always one group, except
  // right at a perek boundary under the 1- or 2-mishnah paces.
  const groups: { masechetEn: string; perek: number; items: MishnaContent[] }[] = [];
  for (const c of contents) {
    const last = groups[groups.length - 1];
    if (last && last.masechetEn === c.masechetEn && last.perek === c.perek) last.items.push(c);
    else groups.push({ masechetEn: c.masechetEn, perek: c.perek, items: [c] });
  }

  return (
    <div className="stage limmud-stage">
      <div className="panel limmud-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Daily Limmud</h1>
        {(firstName || username) && (
          <p className="limmud-welcome">Welcome back, {firstName ?? username}!</p>
        )}
        <p className="panel__subtitle">
          Your next portion of Mishnayot, straight through Shas in order — Berachot to Uktzin.
        </p>

        <div className="limmud-controls">
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
          <div className="limmud-streak">
            <span className="limmud-streak__num">🔥{streak.current}</span>
            <span className="limmud-streak__label">day streak · best {streak.longest}</span>
          </div>
        </div>

        {finishedShas ? (
          <div className="note-banner note-banner--good limmud-finished">
            You've reached the end of Shas in Daily Limmud! Restart from the beginning any time, or
            switch pace above.
          </div>
        ) : (
          <div className="limmud-body">
            <div className="limmud-reader">
              {seder && firstItem && (
                <p className="limmud-breadcrumb">
                  {seder.en} ▸ {firstItem.masechetEn} ▸ Perek {hebrewNumeral(firstItem.perek)}
                  {perekName ? ` (${perekName})` : ""}
                  {todaysItems.length === 1 ? ` ▸ Mishnah ${firstItem.mishnah}` : ""}
                </p>
              )}

              {groups.map((g) => (
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
