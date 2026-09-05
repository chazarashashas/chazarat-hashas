import { useState } from "react";
import { SEDARIM, type Masechet } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import "./MapOfShasScreen.css";

type Level = "sedarim" | "masechtot" | "perakim" | "mishnayot" | "text";

interface TextState {
  status: "idle" | "loading" | "loaded" | "error";
  text: string;
  error: string;
}

const IDLE_TEXT: TextState = { status: "idle", text: "", error: "" };

function PercentBadge({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return <span className={"map-badge" + (percent === 100 ? " map-badge--done" : "")}>{percent}%</span>;
}

interface MapOfShasScreenProps {
  onOpenNotes?: () => void;
}

/**
 * Explorable Seder → Masechet → Perek → Mishnah drill-down, with progress
 * percentages layered on from the same completions store Daily Limmud and
 * Progress use — a visual sense of where in Shas you are, not just a list.
 */
export function MapOfShasScreen({ onOpenNotes }: MapOfShasScreenProps) {
  const progress = useLearningProgress();
  const { getPerekNote, setPerekNote } = usePerekNotes();

  const [level, setLevel] = useState<Level>("sedarim");
  const [sederId, setSederId] = useState<string | null>(null);
  const [masechet, setMasechet] = useState<Masechet | null>(null);
  const [perek, setPerek] = useState<number | null>(null);
  const [mishnah, setMishnah] = useState<number | null>(null);
  const [textState, setTextState] = useState<TextState>(IDLE_TEXT);
  const [noteOpen, setNoteOpen] = useState(false);

  const seder = SEDARIM.find((s) => s.id === sederId) ?? null;

  function openSeder(id: string) {
    setSederId(id);
    setLevel("masechtot");
  }

  function openMasechet(m: Masechet) {
    setMasechet(m);
    setLevel("perakim");
  }

  function openPerek(p: number) {
    setPerek(p);
    setLevel("mishnayot");
  }

  async function openMishnah(mi: number) {
    setMishnah(mi);
    setLevel("text");
    if (!masechet || !perek) return;
    setTextState({ status: "loading", text: "", error: "" });
    try {
      const text = await fetchMishna(masechet.en, perek, mi);
      setTextState({ status: "loaded", text, error: "" });
    } catch (err) {
      setTextState({ status: "error", text: "", error: err instanceof Error ? err.message : "Failed to load." });
    }
  }

  function goTo(target: Level) {
    if (target === "sedarim") {
      setSederId(null);
      setMasechet(null);
      setPerek(null);
      setMishnah(null);
    } else if (target === "masechtot") {
      setMasechet(null);
      setPerek(null);
      setMishnah(null);
    } else if (target === "perakim") {
      setPerek(null);
      setMishnah(null);
    } else if (target === "mishnayot") {
      setMishnah(null);
    }
    setLevel(target);
  }

  return (
    <div className="stage">
      <div className="panel map-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Explore Shas</h1>
        <p className="panel__subtitle">
          Explore Shas from the top down — every seder, masechet, perek, and mishnah, with your
          progress shown along the way.
        </p>

        <div className="map-breadcrumb" dir="ltr">
          <button className="map-crumb" onClick={() => goTo("sedarim")}>
            Shas
          </button>
          {seder && (
            <>
              <span className="map-crumb-sep">▸</span>
              <button className="map-crumb" onClick={() => goTo("masechtot")}>
                {seder.en}
              </button>
            </>
          )}
          {masechet && (
            <>
              <span className="map-crumb-sep">▸</span>
              <button className="map-crumb" onClick={() => goTo("perakim")}>
                {masechet.en}
              </button>
            </>
          )}
          {perek != null && (
            <>
              <span className="map-crumb-sep">▸</span>
              <button className="map-crumb" onClick={() => goTo("mishnayot")}>
                Perek {hebrewNumeral(perek)}
              </button>
            </>
          )}
          {mishnah != null && (
            <>
              <span className="map-crumb-sep">▸</span>
              <span className="map-crumb map-crumb--current">משנה {hebrewNumeral(mishnah)}</span>
            </>
          )}
        </div>

        {level === "sedarim" && (
          <div className="map-grid">
            {SEDARIM.map((s) => (
              <button key={s.id} className="map-tile" onClick={() => openSeder(s.id)}>
                <span className="map-tile__he" dir="rtl">
                  {s.he}
                </span>
                <span className="map-tile__en">{s.en}</span>
                <span className="map-tile__sub">{s.translation}</span>
                <PercentBadge percent={progress.sederPercent(s.id)} />
              </button>
            ))}
          </div>
        )}

        {level === "masechtot" && seder && (
          <div className="map-grid">
            {seder.masechtot.map((m) => (
              <button key={m.en} className="map-tile" onClick={() => openMasechet(m)}>
                <span className="map-tile__he" dir="rtl">
                  {m.he}
                </span>
                <span className="map-tile__en">{m.en}</span>
                <span className="map-tile__sub">{m.perakim} perakim</span>
                <PercentBadge percent={progress.masechetPercent(m.en, m.perakim)} />
              </button>
            ))}
          </div>
        )}

        {level === "perakim" && masechet && (
          <div className="map-grid map-grid--perakim">
            {Array.from({ length: masechet.perakim }, (_, i) => i + 1).map((p) => {
              const name = getPerekName(masechet.en, p);
              return (
                <button key={p} className="map-tile map-tile--perek" onClick={() => openPerek(p)}>
                  <span className="map-tile__perek-num" dir="rtl">
                    {hebrewNumeral(p)}
                  </span>
                  {name && (
                    <span className="map-tile__sub" dir="rtl">
                      {name}
                    </span>
                  )}
                  <PercentBadge percent={progress.perekPercent(masechet.en, p)} />
                </button>
              );
            })}
          </div>
        )}

        {level === "mishnayot" && masechet && perek != null && (
          <>
            <div className="map-grid map-grid--mishnayot">
              {Array.from({ length: getMishnayotCount(masechet.en, perek) }, (_, i) => i + 1).map((mi) => (
                <button
                  key={mi}
                  className={
                    "map-tile map-tile--mishnah" +
                    (progress.isCompleted({ masechetEn: masechet.en, perek, mishnah: mi })
                      ? " map-tile--done"
                      : "")
                  }
                  onClick={() => openMishnah(mi)}
                >
                  <span dir="rtl">{hebrewNumeral(mi)}</span>
                </button>
              ))}
            </div>
            <button className="map-note-link" onClick={() => setNoteOpen(true)}>
              📝 {getPerekNote(masechet.en, perek) ? "View/edit note" : "Add note"} for this perek
            </button>
          </>
        )}

        {level === "text" && masechet && perek != null && mishnah != null && (
          <div className="map-text-block">
            {textState.status === "loading" && <p className="map-text-status">Loading…</p>}
            {textState.status === "error" && (
              <p className="map-text-status" dir="ltr">
                {textState.error}
              </p>
            )}
            {textState.status === "loaded" && (
              <p className="map-text" dir="rtl">
                {textState.text}
              </p>
            )}
          </div>
        )}

        {noteOpen && masechet && perek != null && (
          <PerekNoteModal
            masechetEn={masechet.en}
            perek={perek}
            initialValue={getPerekNote(masechet.en, perek)}
            onSave={(value) => setPerekNote(masechet.en, perek, value)}
            onClose={() => setNoteOpen(false)}
            onOpenNotes={onOpenNotes}
          />
        )}
      </div>
    </div>
  );
}
