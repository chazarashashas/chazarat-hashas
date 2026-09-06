import { useState } from "react";
import { SEDARIM, type Masechet } from "../../data/shas";
import { SEDER_TABS } from "../../data/sederTabs";
import { TabBar } from "../TabBar/TabBar";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useAuth } from "../../utils/useAuth";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
import { PerekNotebookModal } from "../PerekNotebookModal/PerekNotebookModal";
import { NudgeStrip } from "../NudgeStrip/NudgeStrip";
import { nudgeCopy, pluralize } from "../../utils/nudgeCopy";
import "./PerekNamesScreen.css";

type DocView = "notes" | "concepts";

interface PerekNamesScreenProps {
  onOpenLogin?: () => void;
}

export function PerekNamesScreen({ onOpenLogin }: PerekNamesScreenProps) {
  const [docView, setDocView] = useState<DocView>("notes");
  // Opens straight to a seder's per-perek naming view (Zeraim/Berachot by
  // default) rather than the "all sedarim" masechet-summary tab — naming
  // perakim is the actual point of this screen, not the overview.
  const [sederTab, setSederTab] = useState(SEDARIM[0].id);
  const [selectedSederId, setSelectedSederId] = useState<string>(SEDARIM[0].id);
  const [selectedMasechetEn, setSelectedMasechetEn] = useState<string>(SEDARIM[0].masechtot[0].en);
  const [printOpen, setPrintOpen] = useState(false);
  const [notebookPerek, setNotebookPerek] = useState<number | null>(null);
  const { perekNotes, setPerekNotes, masechetSentences, setMasechetSentences, getPerekNotebook, setPerekNotebookEntry } =
    usePerekNotes();
  const { concepts } = useLearningProgress();
  const { isLoggedIn } = useAuth();
  const sortedConcepts = [...concepts].sort((a, b) => b.date.localeCompare(a.date));

  const noteCount = Object.values(perekNotes).reduce(
    (total, notes) => total + notes.filter((n) => n && n.trim()).length,
    0,
  );

  const activeSeder = SEDARIM.find((s) => s.id === sederTab);
  const sentenceSeder = SEDARIM.find((s) => s.id === selectedSederId)!;
  const selectedMasechet: Masechet | undefined = activeSeder?.masechtot.find(
    (m) => m.en === selectedMasechetEn,
  );

  function handleSederTabChange(next: string) {
    setSederTab(next);
    if (next === "all") {
      setSelectedSederId(SEDARIM[0].id);
    } else {
      const seder = SEDARIM.find((s) => s.id === next)!;
      setSelectedMasechetEn(seder.masechtot[0].en);
    }
  }

  function updatePerekNote(masechetEn: string, index: number, value: string) {
    setPerekNotes((prev) => {
      const existing = prev[masechetEn] ?? [];
      const next = [...existing];
      next[index] = value;
      return { ...prev, [masechetEn]: next };
    });
  }

  function updateSentence(masechetEn: string, value: string) {
    setMasechetSentences((prev) => ({ ...prev, [masechetEn]: value }));
  }

  function handleClear() {
    if (sederTab === "all") {
      setMasechetSentences((prev) => {
        const next = { ...prev };
        sentenceSeder.masechtot.forEach((m) => delete next[m.en]);
        return next;
      });
    } else if (selectedMasechet) {
      setPerekNotes((prev) => {
        const next = { ...prev };
        delete next[selectedMasechet.en];
        return next;
      });
    }
  }

  const activePerekNotes = selectedMasechet ? (perekNotes[selectedMasechet.en] ?? []) : [];

  return (
    <div className="stage">
      <div className="panel">
        <button className="restart-icon" title="Clear these notes" onClick={handleClear}>
          ↺
        </button>
        <button className="print-notes-trigger" onClick={() => setPrintOpen(true)}>
          Print notes
        </button>
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Mishna Notes</h1>
        <p className="panel__subtitle">
          The goal here: give each perek a name only you would think of, so it sticks. For example:
          "the laws of Zimmun," "who is considered ne'eman." Want to write more than a name? Open that
          perek's notebook.
        </p>

        {!isLoggedIn && onOpenLogin && (
          <NudgeStrip
            text={nudgeCopy(
              [
                noteCount > 0 ? pluralize(noteCount, "perek name", "perek names") : null,
                concepts.length > 0 ? pluralize(concepts.length, "concept", "concepts") : null,
              ],
              "on this device only.",
            )}
            actionLabel="Keep them →"
            onAction={onOpenLogin}
          />
        )}

        <div className="pill-row">
          <button
            className={"pill" + (docView === "notes" ? " pill--active" : "")}
            onClick={() => setDocView("notes")}
          >
            Perek Notes
          </button>
          <button
            className={"pill" + (docView === "concepts" ? " pill--active" : "")}
            onClick={() => setDocView("concepts")}
          >
            Concepts to Review
          </button>
        </div>

        {docView === "concepts" ? (
          <div className="concepts-doc">
            {sortedConcepts.length === 0 ? (
              <p className="concepts-doc__empty">
                No concepts saved yet — add one from Daily Limmud while you're learning, and it'll
                show up here with the mishnah it came from.
              </p>
            ) : (
              sortedConcepts.map((c) => (
                <div key={c.id} className="concept-card">
                  <div className="concept-card__head">
                    <span className="concept-card__title">{c.title}</span>
                    <span className="concept-card__source" dir="ltr">
                      {c.masechetEn} · Perek <span dir="rtl">{hebrewNumeral(c.perek)}</span>, Mishnah{" "}
                      <span dir="rtl">{hebrewNumeral(c.mishnah)}</span>
                    </span>
                  </div>
                  {c.note && <p className="concept-card__note">{c.note}</p>}
                  <span className="concept-card__date">{c.date}</span>
                </div>
              ))
            )}
          </div>
        ) : (
        <div className="perek-body">
          <div className="perek-tabs">
            {sederTab === "all"
              ? SEDARIM.map((seder) => (
                  <button
                    key={seder.id}
                    className={"perek-tab" + (selectedSederId === seder.id ? " perek-tab--active" : "")}
                    onClick={() => setSelectedSederId(seder.id)}
                  >
                    {seder.en}
                  </button>
                ))
              : activeSeder?.masechtot.map((m) => (
                  <button
                    key={m.en}
                    className={"perek-tab" + (selectedMasechetEn === m.en ? " perek-tab--active" : "")}
                    onClick={() => setSelectedMasechetEn(m.en)}
                  >
                    {m.en}
                  </button>
                ))}
          </div>

          <div className="perek-detail">
            {sederTab === "all" ? (
              <>
                <p className="perek-detail__label">
                  Use this space to describe each masechet, briefly, in your own words
                </p>
                {sentenceSeder.masechtot.map((m) => (
                  <div key={m.en} className="perek-row perek-row--sentence">
                    <span className="perek-row__label">{m.en}</span>
                    <input
                      value={masechetSentences[m.en] ?? ""}
                      onChange={(e) => updateSentence(m.en, e.target.value)}
                      placeholder="This masechet is about…"
                    />
                  </div>
                ))}
              </>
            ) : selectedMasechet ? (
              <>
                <p className="perek-detail__label">Mishna Notes — {selectedMasechet.en}</p>
                {Array.from({ length: selectedMasechet.perakim }, (_, i) => i + 1).map((n) => {
                  const hasNotebook = getPerekNotebook(selectedMasechet.en, n).trim().length > 0;
                  return (
                    <div key={n} className="perek-row">
                      <span className="perek-row__num" dir="rtl">
                        {hebrewNumeral(n)}
                      </span>
                      <input
                        value={activePerekNotes[n - 1] ?? ""}
                        onChange={(e) => updatePerekNote(selectedMasechet.en, n - 1, e.target.value)}
                        placeholder={`My name for Perek ${hebrewNumeral(n)}`}
                      />
                      <button
                        className={"perek-row__notebook-btn" + (hasNotebook ? " perek-row__notebook-btn--filled" : "")}
                        title={hasNotebook ? "Open notebook (has notes)" : "Open notebook"}
                        onClick={() => setNotebookPerek(n)}
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                          <path
                            d="M6 3.5h11a1 1 0 011 1v15a1 1 0 01-1 1H6a1 1 0 01-1-1v-15a1 1 0 011-1zM9 3.5v17M9 8h5M9 12h5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
        )}
      </div>
      {docView === "notes" && (
        <TabBar tabs={SEDER_TABS} activeId={sederTab} onSelect={handleSederTabChange} />
      )}
      {printOpen && (
        <PrintNotesView
          initialMasechetEn={sederTab !== "all" ? selectedMasechetEn : undefined}
          onClose={() => setPrintOpen(false)}
        />
      )}
      {notebookPerek !== null && selectedMasechet && (
        <PerekNotebookModal
          masechetEn={selectedMasechet.en}
          perek={notebookPerek}
          initialValue={getPerekNotebook(selectedMasechet.en, notebookPerek)}
          onSave={(value) => setPerekNotebookEntry(selectedMasechet.en, notebookPerek, value)}
          onClose={() => setNotebookPerek(null)}
        />
      )}
    </div>
  );
}
