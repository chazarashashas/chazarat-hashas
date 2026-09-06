import { useEffect, useState } from "react";
import { fetchMishnaTranslation, type TranslationAttribution } from "../../utils/translation";
import { TranslationAttributionLine } from "../TranslationAttribution/TranslationAttribution";
import "./TranslationReveal.css";

type RevealState =
  | { status: "checking" }
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "available"; text: string; attribution: TranslationAttribution }
  | { status: "open"; text: string; attribution: TranslationAttribution };

interface TranslationRevealProps {
  masechetEn: string;
  perek: number;
  mishnah: number;
}

/**
 * The shared "+ English" control and its reveal panel — Explore Shas and
 * Mishna Quiz's Located banner both use this unchanged (Daily Limmud has
 * its own bespoke stacked layout instead, see TRANSLATION-BRIEF.md §2).
 *
 * Checks availability on mount rather than on click — fail-closed (no
 * license, an unrecognized one, or a source not on the vetted-Orthodox
 * list) has to mean the control never appears at all, not that it shows
 * and then vanishes the moment someone clicks it. The one cost is a
 * network check per mishnah view whether or not English is ever opened;
 * worth it for never showing a doomed control, even briefly.
 *
 * Give this component a `key` that changes with masechetEn/perek/mishnah
 * so it remounts (and re-checks) on navigation — a translation opened
 * once while browsing is not a standing preference.
 */
export function TranslationReveal({ masechetEn, perek, mishnah }: TranslationRevealProps) {
  const [state, setState] = useState<RevealState>({ status: "checking" });

  function check() {
    setState({ status: "checking" });
    fetchMishnaTranslation(masechetEn, perek, mishnah).then((result) => {
      if (result.status === "ok") setState({ status: "available", text: result.text, attribution: result.attribution });
      else if (result.status === "unavailable") setState({ status: "unavailable" });
      else setState({ status: "error" });
    });
  }

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masechetEn, perek, mishnah]);

  if (state.status === "checking" || state.status === "unavailable") return null;

  if (state.status === "error") {
    return (
      <button className="translation-reveal-toggle" onClick={check}>
        Try again — English
      </button>
    );
  }

  if (state.status === "available") {
    return (
      <button className="translation-reveal-toggle" onClick={() => setState({ ...state, status: "open" })}>
        <span className="translation-reveal-toggle__glyph">+</span> English
      </button>
    );
  }

  return (
    <div className="translation-reveal-panel">
      <p className="translation-reveal-panel__text">{state.text}</p>
      <TranslationAttributionLine attribution={state.attribution} variant="panel" />
      <button
        className="translation-reveal-toggle translation-reveal-toggle--hide"
        onClick={() => setState({ ...state, status: "available" })}
      >
        <span className="translation-reveal-toggle__glyph">−</span> Hide English
      </button>
    </div>
  );
}
