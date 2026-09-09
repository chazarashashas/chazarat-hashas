import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName } from "../../data/perekInfo";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { getSederHue, getSederHueText } from "../../utils/sederHue";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress, type ConceptNote } from "../../utils/useLearningProgress";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
import { pluralize } from "../../utils/nudgeCopy";
import "./PerekNamesScreen.css";

type DocView = "notes" | "concepts";

interface PerekNamesScreenProps {
  /** Jumps to Explore Shas, where the actual mishnah text lives — offered
      from a perek's open notebook ("Read the mishnayos →") so writing
      about a perek and reading it are one tap apart. */
  onOpenText?: () => void;
}

function sederIdForMasechet(masechetEn: string): string {
  return SEDARIM.find((s) => s.masechtot.some((m) => m.en === masechetEn))?.id ?? SEDARIM[0].id;
}

function relativeDate(dateStr: string): string {
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return dateStr;
}

export function PerekNamesScreen({ onOpenText }: PerekNamesScreenProps) {
  const [docView, setDocView] = useState<DocView>("notes");
  const [selectedSederId, setSelectedSederId] = useState<string>(SEDARIM[0].id);
  const [selectedMasechetEn, setSelectedMasechetEn] = useState<string>(SEDARIM[0].masechtot[0].en);
  const [printOpen, setPrintOpen] = useState(false);
  const [expandedPerek, setExpandedPerek] = useState<number | null>(null);
  const { perekNotes, setPerekNotes, masechetSentences, setMasechetSentences, getPerekNotebook, setPerekNotebookEntry } =
    usePerekNotes();
  const { concepts } = useLearningProgress();
  const sortedConcepts = [...concepts].sort((a, b) => b.date.localeCompare(a.date));

  const selectedSeder = SEDARIM.find((s) => s.id === selectedSederId)!;
  const selectedMasechet =
    selectedSeder.masechtot.find((m) => m.en === selectedMasechetEn) ?? selectedSeder.masechtot[0];
  const activePerekNotes = perekNotes[selectedMasechet.en] ?? [];
  const namedCount = activePerekNotes.filter((n) => n && n.trim()).length;
  const progressPct = Math.round((namedCount / selectedMasechet.perakim) * 100);
  const filteredConcepts = sortedConcepts.filter((c) => c.masechetEn === selectedMasechet.en);

  function handleSelectSeder(sederId: string) {
    setSelectedSederId(sederId);
    setSelectedMasechetEn(SEDARIM.find((s) => s.id === sederId)!.masechtot[0].en);
    setExpandedPerek(null);
  }

  function handleSelectMasechet(masechetEn: string) {
    setSelectedMasechetEn(masechetEn);
    setExpandedPerek(null);
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
    setPerekNotes((prev) => {
      const next = { ...prev };
      delete next[selectedMasechet.en];
      return next;
    });
    setMasechetSentences((prev) => {
      const next = { ...prev };
      delete next[selectedMasechet.en];
      return next;
    });
  }

  function handleGoToConcept(c: ConceptNote) {
    setSelectedSederId(sederIdForMasechet(c.masechetEn));
    setSelectedMasechetEn(c.masechetEn);
    setExpandedPerek(null);
    setDocView("notes");
  }

  return (
    <div className="stage">
      <div className="panel notes-panel">
        <button className="restart-icon" title="Clear this masechet's notes" onClick={handleClear}>
          ↺
        </button>

        <div className="notes-header">
          <div className="notes-header__left">
            <h1 className="notes-header__title">Notes.</h1>
            <p className="notes-header__subtitle">
              Give each perek a name only you would think of, so it sticks — "the laws of Zimmun," "who
              is considered ne'eman."
            </p>
          </div>
          <div className="notes-header__right">
            <button className="notes-print-link" onClick={() => setPrintOpen(true)}>
              Print
            </button>
            <div className="docview-toggle">
              <button
                className={"docview-toggle__btn" + (docView === "notes" ? " docview-toggle__btn--active" : "")}
                onClick={() => setDocView("notes")}
              >
                Perakim
              </button>
              <button
                className={"docview-toggle__btn" + (docView === "concepts" ? " docview-toggle__btn--active" : "")}
                onClick={() => setDocView("concepts")}
              >
                Concepts
              </button>
            </div>
          </div>
        </div>

        {docView === "concepts" ? (
          <div className="concepts-tab">
            <div className="concepts-tab__head">
              <h2 className="concepts-tab__title">Concepts to Review</h2>
              <span className="concepts-tab__count">{pluralize(concepts.length, "saved", "saved")}</span>
            </div>
            {sortedConcepts.length === 0 ? (
              <p className="concepts-doc__empty">
                No concepts saved yet — add one from Daily Limmud while you're learning, and it'll
                show up here with the mishnah it came from.
              </p>
            ) : (
              <div className="concepts-tab__list">
                {sortedConcepts.map((c) => {
                  const sederId = sederIdForMasechet(c.masechetEn);
                  return (
                    <div
                      key={c.id}
                      className="concept-card"
                      style={{ ["--card-hue" as string]: getSederHue(sederId) }}
                    >
                      <div className="concept-card__head">
                        <p className="concept-card__title">{c.title}</p>
                        <span className="concept-card__date">{relativeDate(c.date)}</span>
                      </div>
                      {c.note && <p className="concept-card__body">{c.note}</p>}
                      <div className="concept-card__foot">
                        <span
                          className="source-pill"
                          style={{
                            ["--pill-hue" as string]: getSederHue(sederId),
                            ["--pill-ink" as string]: getSederHueText(sederId),
                          }}
                          dir="ltr"
                        >
                          {c.masechetEn} <span dir="rtl">{hebrewNumeral(c.perek)}:{hebrewNumeral(c.mishnah)}</span>
                        </span>
                        <button className="concept-card__goto" onClick={() => handleGoToConcept(c)}>
                          Go to it →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div
            className="notes-body"
            style={{
              ["--active-seder-hue" as string]: getSederHue(selectedSederId),
              ["--active-seder-ink" as string]: getSederHueText(selectedSederId),
            }}
          >
            <div className="seder-pill-row">
              {SEDARIM.map((seder) => {
                const active = selectedSederId === seder.id;
                return (
                  <button
                    key={seder.id}
                    className={"seder-pill" + (active ? " seder-pill--active" : "")}
                    style={active ? { background: getSederHue(seder.id), borderColor: getSederHue(seder.id) } : undefined}
                    onClick={() => handleSelectSeder(seder.id)}
                  >
                    <span className="seder-pill__he">{seder.he}</span>
                    <span className="seder-pill__en">{seder.en}</span>
                  </button>
                );
              })}
            </div>

            <div className="masechet-panel">
              <div
                className="masechet-grid"
                style={{ ["--masechet-count" as string]: String(selectedSeder.masechtot.length) }}
              >
                {selectedSeder.masechtot.map((m) => {
                  const count = (perekNotes[m.en] ?? []).filter((n) => n && n.trim()).length;
                  const active = selectedMasechetEn === m.en;
                  return (
                    <button
                      key={m.en}
                      title={m.en}
                      className={"masechet-chip" + (active ? " masechet-chip--active" : "")}
                      onClick={() => handleSelectMasechet(m.en)}
                    >
                      <span className="masechet-chip__label">{m.en}</span>
                      {count > 0 && <span className="masechet-chip__badge">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="concepts-band">
              <div className="concepts-band__head">
                <span className="concepts-band__title">Concepts to review</span>
                <button className="concepts-band__all" onClick={() => setDocView("concepts")}>
                  {pluralize(concepts.length, "saved", "saved")} in all →
                </button>
              </div>
              {filteredConcepts.length === 0 ? (
                <p className="concepts-band__empty">
                  Nothing saved from {selectedMasechet.en} yet. Anything you flag while learning lands
                  here, tagged with the mishnah it came from.
                </p>
              ) : (
                filteredConcepts.map((c) => (
                  <button key={c.id} className="concepts-band__row" onClick={() => setDocView("concepts")}>
                    <span className="concepts-band__row-title">{c.title}</span>
                    <span
                      className="source-pill"
                      style={{
                        ["--pill-hue" as string]: getSederHue(selectedSederId),
                        ["--pill-ink" as string]: getSederHueText(selectedSederId),
                      }}
                      dir="ltr"
                    >
                      {c.masechetEn} <span dir="rtl">{hebrewNumeral(c.perek)}:{hebrewNumeral(c.mishnah)}</span>
                    </span>
                    <span className="concepts-band__row-date">{relativeDate(c.date)}</span>
                  </button>
                ))
              )}
            </div>

            <div className="notes-page">
              <div className="notes-page__header">
                <div className="notes-page__id">
                  <h2 className="notes-page__masechet">{selectedMasechet.en}</h2>
                  <p className="notes-page__meta">
                    {selectedSeder.en} · {pluralize(selectedMasechet.perakim, "perek", "perakim")}
                  </p>
                </div>
                <div className="notes-page__progress">
                  <span className="notes-page__progress-text">
                    <strong>{namedCount}</strong> named of {selectedMasechet.perakim}
                  </span>
                  <div className="notes-progress-bar">
                    <div
                      className="notes-progress-bar__fill"
                      style={{ width: `${progressPct}%`, background: getSederHue(selectedSederId) }}
                    />
                  </div>
                </div>
              </div>

              <div className="notes-page__sentence">
                <label className="notes-page__sentence-label">This masechet, in your own words</label>
                <input
                  value={masechetSentences[selectedMasechet.en] ?? ""}
                  onChange={(e) => updateSentence(selectedMasechet.en, e.target.value)}
                  placeholder="This masechet is about…"
                />
              </div>

              <div className="notes-page__rows">
                {Array.from({ length: selectedMasechet.perakim }, (_, i) => i + 1).map((n) => {
                  const traditionalName = getPerekName(selectedMasechet.en, n);
                  const value = activePerekNotes[n - 1] ?? "";
                  const named = value.trim().length > 0;
                  const notebookValue = getPerekNotebook(selectedMasechet.en, n);
                  const hasNotebook = notebookValue.trim().length > 0;
                  const isExpanded = expandedPerek === n;
                  const moreLabel = isExpanded ? "Close" : hasNotebook ? "Notes" : "More notes";
                  return (
                    <div key={n} className="notes-row-wrap">
                      <div className="notes-row">
                        <span className={"notes-row__tile" + (named ? " notes-row__tile--named" : "")}>
                          {hebrewNumeral(n)}
                        </span>
                        <span className={"notes-row__rule" + (named ? " notes-row__rule--named" : "")} />
                        {traditionalName && (
                          <span className="notes-row__traditional" dir="rtl" title={traditionalName}>
                            {traditionalName}
                          </span>
                        )}
                        <input
                          className={"notes-row__input" + (named ? " notes-row__input--filled" : "")}
                          value={value}
                          onChange={(e) => updatePerekNote(selectedMasechet.en, n - 1, e.target.value)}
                          placeholder="Name this perek in your own words"
                        />
                        <button
                          className={"notes-row__more" + (isExpanded ? " notes-row__more--open" : "")}
                          onClick={() => setExpandedPerek(isExpanded ? null : n)}
                        >
                          {moreLabel}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="notes-expand">
                          <div className="notes-expand__head">
                            <span className="notes-expand__title">
                              Perek <span dir="rtl">{hebrewNumeral(n)}</span>
                              {traditionalName ? ` · ${traditionalName}` : ""}
                            </span>
                            <span className="notes-expand__saves">Saves as you type</span>
                          </div>
                          <textarea
                            className="notes-expand__textarea"
                            autoFocus
                            value={notebookValue}
                            onChange={(e) => setPerekNotebookEntry(selectedMasechet.en, n, e.target.value)}
                            placeholder="Write as much as you want…"
                          />
                          <div className="notes-expand__foot">
                            {onOpenText ? (
                              <button className="notes-expand__read" onClick={onOpenText}>
                                Read the mishnayos →
                              </button>
                            ) : (
                              <span />
                            )}
                            <button className="notes-expand__done" onClick={() => setExpandedPerek(null)}>
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      {printOpen && (
        <PrintNotesView initialMasechetEn={selectedMasechetEn} onClose={() => setPrintOpen(false)} />
      )}
    </div>
  );
}
