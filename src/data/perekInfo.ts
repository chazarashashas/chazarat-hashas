import perekNamesJson from "./perekNames.json";
import mishnayotCountsJson from "./mishnayotCounts.json";

const PEREK_NAMES = perekNamesJson as Record<string, (string | null)[]>;
const MISHNAYOT_COUNTS = mishnayotCountsJson as Record<string, number[]>;

/**
 * The traditional name of a perek — the opening words of its first
 * mishnah (e.g. Berachot perek 1 is "Me'eimatai"), fetched once from
 * Sefaria and cached in perekNames.json (see scripts/fetchPerekNames.mjs).
 * Not the number of the perek, which the app already shows separately.
 */
export function getPerekName(masechetEn: string, perek: number): string | null {
  return PEREK_NAMES[masechetEn]?.[perek - 1] ?? null;
}

/** How many mishnayot are in this perek — needed to sequence Daily Limmud
    and to compute perek-level exposure percentages. Falls back to 1 for
    any perek missing from the fetched data, so a gap can't break
    sequencing (just under-counts that one perek slightly). */
export function getMishnayotCount(masechetEn: string, perek: number): number {
  return MISHNAYOT_COUNTS[masechetEn]?.[perek - 1] ?? 1;
}
