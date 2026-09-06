import type { TranslationAttribution as Attribution } from "../../utils/translation";
import { licenseDeedUrl } from "../../utils/translation";
import "./TranslationAttribution.css";

interface TranslationAttributionProps {
  attribution: Attribution;
  /** "panel" — inside a reveal panel or Mishna Quiz's Located banner.
      "short" — Daily Limmud, opposite the switch. Both render at the same
      10.5px size; "full" is the Guide's longer sentence form. */
  variant: "panel" | "short";
}

/**
 * Renders whatever the API actually returned, verbatim — never
 * abbreviate, translate, retitle, or tidy a version name, and never
 * derive a translator's name from versionNotes (Sefaria returns no
 * surname field). "{versionTitle} · Sefaria" is itself a complete,
 * correct credit — see TRANSLATION-BRIEF.md §4.
 */
export function TranslationAttributionLine({ attribution, variant }: TranslationAttributionProps) {
  const sefariaLink = (
    <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer">
      Sefaria
    </a>
  );

  if (variant === "short") {
    return (
      <p className="translation-credit translation-credit--short">
        {attribution.versionTitle} · {sefariaLink}
      </p>
    );
  }

  const deedUrl = licenseDeedUrl(attribution.license);
  return (
    <p className="translation-credit">
      {attribution.versionTitle}, via {sefariaLink} ·{" "}
      {deedUrl ? (
        <a href={deedUrl} target="_blank" rel="noopener noreferrer">
          {attribution.license}
        </a>
      ) : (
        attribution.license
      )}
    </p>
  );
}
