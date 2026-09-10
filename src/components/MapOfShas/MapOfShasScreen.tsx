import { useState } from "react";
import { SEDARIM, type Masechet } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { friendlyError } from "../../utils/friendlyError";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { getSederHue } from "../../utils/sederHue";
import { PerekNoteModal } from "../PerekNoteModal/PerekNoteModal";
import { TranslationReveal } from "../TranslationReveal/TranslationReveal";
import "./MapOfShasScreen.css";

type Level = "masechtot" | "perakim" | "mishnayot" | "text";

/** A rough size step from a masechet's perek count — not a precise
    quartile, just enough of a gradient that Kelim (30 perakim) and
    Tamid (3) visibly aren't the same size tile. BUILD-BRIEF.md: opens
    on all 63 masechtot "sized by perek count" instead of six seder
    tiles you'd have to pick through first. */
function tileSizeStep(perakim: number): 1 | 2 | 3 | 4 {
  if (perakim <= 5) return 1;
  if (perakim <= 8) return 2;
  if (perakim <= 11) return 3;
  return 4;
}

interface TextState {
  status: "idle" | "loading" | "loaded" | "error";
  text: string;
  error: string;
}

const IDLE_TEXT: TextState = { status: "idle", text: "", error: "" };

const ALL_MASECHTOT_FLAT = SEDARIM.flatMap((s) => s.masechtot.map((m) => ({ ...m, sederId: s.id })));

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

  const [level, setLevel] = useState<Level>("masechtot");
  const [sederId, setSederId] = useState<string | null>(null);
  const [masechet, setMasechet] = useState<Masechet | null>(null);
  const [perek, setPerek] = useState<number | null>(null);
  const [mishnah, setMishnah] = useState<number | null>(null);
  const [textState, setTextState] = useState<TextState>(IDLE_TEXT);
  const [noteOpen, setNoteOpen] = useState(false);
  const [search, setSearch] = useState("");

  const seder = SEDARIM.find((s) => s.id === sederId) ?? null;

  const searchMatches =
    search.trim().length > 0
      ? ALL_MASECHTOT_FLAT.filter((m) => m.en.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
      : [];

  /** Opens straight into a masechet's perakim from the all-masechtot
      grid — there's no separate seder-picking step to pass through
      first, but the owning seder is still tracked (breadcrumb, and the
      perek tiles' hue). */
  function openMasechet(m: Masechet & { sederId: string }) {
    setSederId(m.sederId);
    setMasechet(m);
    setLevel("perakim");
  }

  /** Jumps straight from a search result to that masechet's perakim,
      regardless of what level you started on. */
  function jumpToMasechet(m: Masechet & { sederId: string }) {
    openMasechet(m);
    setSearch("");
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
      setTextState({ status: "error", text: "", error: friendlyError(err, "explore-text") });
    }
  }

  function goTo(target: Level) {
    if (target === "masechtot") {
      setSederId(null);
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
        <div className="screen-head">
          <h1 className="screen-head__title">Explore Shas</h1>
        </div>

        <div className="map-search">
          <input
            className="map-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Jump to a masechet…"
          />
          {search.trim() !== "" && searchMatches.length === 0 && (
            <div className="map-search__results">
              <p className="state state--empty">No masechet matches that.</p>
            </div>
          )}
          {searchMatches.length > 0 && (
            <div className="map-search__results">
              {searchMatches.map((m) => (
                <button key={m.en} className="map-search__result" onClick={() => jumpToMasechet(m)}>
                  <span>{m.en}</span>
                  <span className="map-search__result-he" dir="rtl">
                    {m.he}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="map-breadcrumb" dir="ltr">
          {masechet && (
            <>
              <button className="pill pill--compact map-crumb" onClick={() => goTo("masechtot")}>
                Shas
              </button>
              <span className="map-crumb-sep">‹</span>
              <button className="pill pill--compact map-crumb" onClick={() => goTo("perakim")}>
                {masechet.en}
              </button>
            </>
          )}
          {perek != null && (
            <>
              <span className="map-crumb-sep">‹</span>
              <button className="pill pill--compact map-crumb" onClick={() => goTo("mishnayot")}>
                Perek {hebrewNumeral(perek)}
              </button>
            </>
          )}
          {mishnah != null && (
            <>
              <span className="map-crumb-sep">‹</span>
              <span className="pill pill--compact map-crumb map-crumb--current">משנה {hebrewNumeral(mishnah)}</span>
            </>
          )}
        </div>

        {level === "masechtot" && (
          <div className="map-sedarim-groups">
            {SEDARIM.map((s) => (
              <div key={s.id} className="map-seder-group">
                <div className="map-seder-group__label" style={{ ["--tile-hue" as string]: getSederHue(s.id) }}>
                  <span dir="rtl">{s.he}</span>
                  <span>{s.en}</span>
                </div>
                <div className="map-grid map-grid--masechtot" style={{ ["--tile-hue" as string]: getSederHue(s.id) }}>
                  {s.masechtot.map((m) => (
                    <button
                      key={m.en}
                      className={`map-tile map-tile--masechet map-tile--size-${tileSizeStep(m.perakim)}`}
                      onClick={() => openMasechet({ ...m, sederId: s.id })}
                    >
                      <span className="map-tile__he" dir="rtl">
                        {m.he}
                      </span>
                      <span className="map-tile__en">{m.en}</span>
                      <span className="map-tile__sub">{m.perakim} perakim</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {level === "perakim" && masechet && seder && (
          <div
            className="map-grid map-grid--perakim"
            style={{ ["--tile-hue" as string]: getSederHue(seder.id) }}
          >
            {Array.from({ length: masechet.perakim }, (_, i) => i + 1).map((p) => {
              const name = getPerekName(masechet.en, p);
              const done = progress.perekPercent(masechet.en, p) === 100;
              return (
                <button
                  key={p}
                  className={"map-tile map-tile--perek" + (done ? " map-tile--perek-done" : "")}
                  onClick={() => openPerek(p)}
                >
                  <span className="map-tile__perek-num" dir="rtl">
                    {hebrewNumeral(p)}
                  </span>
                  {name && (
                    <span className="map-tile__sub" dir="rtl">
                      {name}
                    </span>
                  )}
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
            <button className="btn btn--quiet map-note-link" onClick={() => setNoteOpen(true)}>
              {getPerekNote(masechet.en, perek) ? "View/edit note" : "Add note"} for this perek
            </button>
          </>
        )}

        {level === "text" && masechet && perek != null && mishnah != null && (
          <div className="card map-text-block">
            {textState.status === "loading" && <p className="state state--loading">Loading…</p>}
            {textState.status === "error" && (
              <p className="state state--error" dir="ltr">
                {textState.error}
              </p>
            )}
            {textState.status === "loaded" && (
              <>
                <p className="map-text" dir="rtl">
                  {textState.text}
                </p>
                <TranslationReveal key={`${masechet.en}.${perek}.${mishnah}`} masechetEn={masechet.en} perek={perek} mishnah={mishnah} />
              </>
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
