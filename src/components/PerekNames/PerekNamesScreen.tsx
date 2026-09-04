import { useState } from "react";
import { SEDARIM, type Masechet } from "../../data/shas";
import { SEDER_TABS } from "../../data/sederTabs";
import { TabBar } from "../TabBar/TabBar";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import "./PerekNamesScreen.css";

export function PerekNamesScreen() {
  const [sederTab, setSederTab] = useState("all");
  const [selectedSederId, setSelectedSederId] = useState<string>(SEDARIM[0].id);
  const [selectedMasechetEn, setSelectedMasechetEn] = useState<string>(SEDARIM[0].masechtot[0].en);
  const [perekNotes, setPerekNotes] = useState<Record<string, string[]>>({});
  const [masechetSentences, setMasechetSentences] = useState<Record<string, string>>({});

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
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">My Mishna</h1>
        <p className="panel__subtitle">
          Pick a masechet, then give each perek a nickname to help it stick. For example: "the laws of
          Zimmun," "who is considered ne'eman."
        </p>

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
                  Use this space to describe each masechta, briefly, in your own words
                </p>
                {sentenceSeder.masechtot.map((m) => (
                  <div key={m.en} className="perek-row perek-row--sentence">
                    <span className="perek-row__label">{m.en}</span>
                    <input
                      value={masechetSentences[m.en] ?? ""}
                      onChange={(e) => updateSentence(m.en, e.target.value)}
                      placeholder="Write your notes here"
                    />
                  </div>
                ))}
              </>
            ) : selectedMasechet ? (
              <>
                <p className="perek-detail__label">My Mishna — {selectedMasechet.en}</p>
                {Array.from({ length: selectedMasechet.perakim }, (_, i) => i + 1).map((n) => (
                  <div key={n} className="perek-row">
                    <span className="perek-row__num" dir="rtl">
                      {hebrewNumeral(n)}
                    </span>
                    <input
                      value={activePerekNotes[n - 1] ?? ""}
                      onChange={(e) => updatePerekNote(selectedMasechet.en, n - 1, e.target.value)}
                      placeholder={`My name for Perek ${hebrewNumeral(n)}`}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>
      </div>
      <TabBar tabs={SEDER_TABS} activeId={sederTab} onSelect={handleSederTabChange} />
    </div>
  );
}
