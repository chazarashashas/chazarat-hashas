import { useEffect, useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getMishnayotCount, getPerekName } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
import { FRIENDLY_ERRORS } from "../../utils/friendlyError";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useSiyumim, type PerekClaim } from "../../utils/useSiyumim";

interface MishnaState {
  mishnah: number;
  status: "loading" | "loaded" | "error";
  text?: string;
}

interface Props {
  claim: PerekClaim & { dedication: string };
  siyumim: ReturnType<typeof useSiyumim>;
}

/** A perek claimed for an L'Iluy Nishmat siyum and added to Daily
    Limmud — a genuine addition to the normal sequential portion, with
    its own reader and its own "Mark as learned," not a replacement of
    or interruption to the student's regular pace. Marking it learned
    here writes to the same completions record Daily Limmud always
    uses (progress.logLearning) and flips the siyum's own row learned,
    so both sides of "did I learn this" stay the same fact. */
export function QueuedSiyumPerek({ claim, siyumim }: Props) {
  const progress = useLearningProgress();
  const [mishnayot, setMishnayot] = useState<MishnaState[]>([]);
  const [marking, setMarking] = useState(false);

  // Reset to loading placeholders the moment the perek changes —
  // adjusted during render (React's own pattern for this) rather than
  // a synchronous setState in the effect below, which only needs to
  // kick off the async fetch.
  const perekKey = `${claim.masechetEn}:${claim.perek}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (loadedKey !== perekKey) {
    setLoadedKey(perekKey);
    const count = getMishnayotCount(claim.masechetEn, claim.perek);
    setMishnayot(
      Array.from({ length: count }, (_, i) => ({ mishnah: i + 1, status: "loading" as const })),
    );
  }

  useEffect(() => {
    let cancelled = false;
    const count = getMishnayotCount(claim.masechetEn, claim.perek);
    const items: MishnaState[] = Array.from({ length: count }, (_, i) => ({
      mishnah: i + 1,
      status: "loading",
    }));
    Promise.all(
      items.map(async (item) => {
        try {
          const text = await fetchMishna(claim.masechetEn, claim.perek, item.mishnah);
          return { ...item, status: "loaded" as const, text };
        } catch {
          return { ...item, status: "error" as const };
        }
      }),
    ).then((results) => {
      if (!cancelled) setMishnayot(results);
    });
    return () => {
      cancelled = true;
    };
  }, [claim.masechetEn, claim.perek]);

  async function handleMark() {
    setMarking(true);
    progress.logLearning(claim.masechetEn, claim.perek, siyumim.todayStr());
    await siyumim.markLearnedById(claim.id);
  }

  const seder = SEDARIM.find((s) => s.masechtot.some((m) => m.en === claim.masechetEn));
  const perekName = getPerekName(claim.masechetEn, claim.perek);

  // Its own card, laid out like the day's learning above it, so a list of
  // several reads as separate perakim. The button is the quieter
  // secondary one: the navy "Mark as learned" belongs to the day's
  // portion, and several identical navy buttons in a row read as one.
  return (
    <div className="card limmud-card limmud-siyum-card">
      <p className="limmud-breadcrumb">
        {seder ? `${seder.en} ▸ ` : ""}
        {claim.masechetEn} ▸ Perek {hebrewNumeral(claim.perek)}
        {perekName ? ` (${perekName})` : ""}
      </p>
      <p className="limmud-siyum-tag">L'Iluy Nishmat: {claim.dedication}</p>
      <div className="limmud-perek-block">
        {mishnayot.map((m) => (
          <div key={m.mishnah} className="limmud-mishna">
            <p className="limmud-mishna__title" dir="rtl">
              משנה {hebrewNumeral(m.mishnah)}
            </p>
            {m.status === "loading" ? (
              <span className="state state--loading">Loading…</span>
            ) : m.status === "error" ? (
              <span className="state state--error" dir="ltr">
                {FRIENDLY_ERRORS.load}
              </span>
            ) : (
              <p className="limmud-mishna__text" dir="rtl">
                {m.text}
              </p>
            )}
          </div>
        ))}
      </div>
      <button
        className="btn btn--secondary btn--compact btn--block"
        disabled={marking}
        onClick={handleMark}
      >
        {marking ? "Marking…" : "Mark perek learned"}
      </button>
    </div>
  );
}
