import { useEffect, useState } from "react";
import { getMishnayotCount } from "../../data/perekInfo";
import { fetchMishna } from "../../utils/sefaria";
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
    setMishnayot(Array.from({ length: count }, (_, i) => ({ mishnah: i + 1, status: "loading" as const })));
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

  return (
    <div className="limmud-perek-block">
      <p className="limmud-siyum-tag">L'iluy nishmat: {claim.dedication}</p>
      <p className="limmud-breadcrumb">
        {claim.masechetEn} ▸ Perek {hebrewNumeral(claim.perek)}
      </p>
      {mishnayot.map((m) => (
        <div key={m.mishnah} className="limmud-mishna">
          <p className="limmud-mishna__title" dir="rtl">
            משנה {hebrewNumeral(m.mishnah)}
          </p>
          {m.status === "loading" ? (
            <span className="limmud-mishna__loading">Loading…</span>
          ) : m.status === "error" ? (
            <span className="limmud-mishna__error" dir="ltr">
              Couldn't load this mishnah.
            </span>
          ) : (
            <p className="limmud-mishna__text" dir="rtl">
              {m.text}
            </p>
          )}
        </div>
      ))}
      <button className="restart limmud-mark-btn" disabled={marking} onClick={handleMark}>
        {marking ? "Marking…" : "Mark as learned"}
      </button>
    </div>
  );
}
