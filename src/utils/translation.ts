import { SEFARIA_REF_BY_MASECHET } from "../data/sefariaRefs";

export interface TranslationAttribution {
  versionTitle: string;
  versionTitleInHebrew?: string;
  shortVersionTitle?: string;
  versionSource: string;
  license: string;
}

export type TranslationFetchResult =
  | { status: "ok"; text: string; attribution: TranslationAttribution }
  /** No English version exists for this text, or its license doesn't
      clear the bar below — permanently hidden, never offered a retry. */
  | { status: "unavailable" }
  /** A network/parse failure — the translation may well exist, so this
      one gets a "Try again". */
  | { status: "error" };

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/** Sefaria licenses vary per text (Mishnah is largely CC-BY, the William
    Davidson Talmud is CC-BY-NC, some tractates carry other community
    translations) — this allowlists the free/open family regardless of
    which one comes back, and rejects anything else (missing, "All Rights
    Reserved", or a license this list hasn't accounted for) so a gap in
    this list fails closed instead of shipping an unattributed or
    all-rights-reserved translation. */
const FREE_LICENSE_RE = /^(public domain|cc0|cc[- ]by(-(nc|sa|nd)){0,2})(\s+\d+(\.\d+)?)?$/i;

export function isAcceptableLicense(license: string | null | undefined): boolean {
  if (!license || !license.trim()) return false;
  return FREE_LICENSE_RE.test(license.trim());
}

/**
 * This app is for an Orthodox audience, and Sefaria's default English
 * version differs by text — for plain Mishnah (as opposed to Talmud)
 * refs, that default is often "Mishnah Yomit by Dr. Joshua Kulp," a
 * Conservative-movement translation (Fuchsberg Jerusalem Center /
 * Conservative Yeshiva), not merely a licensing detail. A license being
 * free doesn't make a source appropriate here, so this is a second,
 * separate gate on top of isAcceptableLicense.
 *
 * Deliberately a narrow allowlist rather than a denylist: only sources
 * confirmed Orthodox pass, so a translation this list hasn't reviewed
 * yet fails closed (English hidden) instead of shipping unreviewed.
 * Currently:
 *  - Koren – Steinsaltz (Rabbi Adin Even-Israel Steinsaltz, Koren
 *    Publishers Jerusalem; on Sefaria as "William Davidson Edition") —
 *    covers mishnayot embedded in a Talmud Bavli page only.
 *  - Rabbi Shraga Silverstein's translation of the Mishnah with Ovadia
 *    of Bartenura's commentary (Mesivta Rabbi Chaim Berlin alumnus,
 *    published by Feldheim; CC-BY) — covers all of Moed, Nashim, and
 *    Nezikin plus Berachot, filling in several Gemara-less tractates
 *    (e.g. Avot) that Koren-Steinsaltz doesn't reach.
 * Expand this deliberately, source by source — do not widen it to "not
 * obviously wrong" without checking who actually produced the text.
 */
const VETTED_ORTHODOX_SOURCE_RE = /william davidson|koren|steinsaltz|silverstein|bartenura/i;

export function isVettedOrthodoxSource(versionTitle: string, shortVersionTitle?: string): boolean {
  return VETTED_ORTHODOX_SOURCE_RE.test(versionTitle) || (!!shortVersionTitle && VETTED_ORTHODOX_SOURCE_RE.test(shortVersionTitle));
}

const LICENSE_DEED_URLS: Record<string, string> = {
  cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "cc-by": "https://creativecommons.org/licenses/by/4.0/",
  "cc-by-sa": "https://creativecommons.org/licenses/by-sa/4.0/",
  "cc-by-nc": "https://creativecommons.org/licenses/by-nc/4.0/",
  "cc-by-nc-sa": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "cc-by-nc-nd": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  "cc-by-nd": "https://creativecommons.org/licenses/by-nd/4.0/",
};

/** Null for Public Domain/CC0 (no deed page worth linking) or anything
    this map doesn't recognize — callers render the license as plain text
    in that case rather than guessing at a URL. */
export function licenseDeedUrl(license: string): string | null {
  const key = license
    .trim()
    .toLowerCase()
    .replace(/\s+\d+(\.\d+)?$/, "")
    .replace(/\s+/g, "-");
  return LICENSE_DEED_URLS[key] ?? null;
}

const VERSIONS_SEEN_KEY = "chazarat-hashas:translationVersionsSeen";

/** Every distinct translation version this device has actually loaded —
    read by the Guide's attribution notice, which lists only versions the
    app has really used rather than a hardcoded guess (see
    TRANSLATION-BRIEF.md §4: the credit differs by text, so nothing here
    can be hardcoded). Best-effort: a storage failure just means that
    version won't appear in the list, nothing more. */
function recordVersionSeen(attribution: TranslationAttribution) {
  try {
    const raw = localStorage.getItem(VERSIONS_SEEN_KEY);
    const existing: Record<string, TranslationAttribution> = raw ? JSON.parse(raw) : {};
    if (!existing[attribution.versionTitle]) {
      existing[attribution.versionTitle] = attribution;
      localStorage.setItem(VERSIONS_SEEN_KEY, JSON.stringify(existing));
    }
  } catch {
    // Storage full or unavailable — nothing more to do.
  }
}

export function readVersionsSeen(): TranslationAttribution[] {
  try {
    const raw = localStorage.getItem(VERSIONS_SEEN_KEY);
    const existing: Record<string, TranslationAttribution> = raw ? JSON.parse(raw) : {};
    return Object.values(existing);
  } catch {
    return [];
  }
}

/**
 * Fetches only the English version of one mishnah, entirely independent
 * of the Hebrew fetch (see sefaria.ts's fetchMishna) — a failed or
 * missing translation must never block the Hebrew, which is why this is
 * its own function on its own request rather than a combined call.
 *
 * Uses Sefaria's v3 text API, which returns full per-version metadata
 * (versionTitle, versionSource, license, ...) rather than the v1 API's
 * single flattened "best" version — required here because attribution
 * has to come from the exact version object the displayed text came
 * from (TRANSLATION-BRIEF.md §4), not a guess.
 */
/** Sefaria's default `?version=english` returns whichever version it
    ranks highest priority — for plain Mishnah text that's usually
    Mishnah Yomit, not the Orthodox-sourced version that may also exist
    at lower priority (e.g. Avot has both Mishnah Yomit and the
    Silverstein/Bartenura translation; a plain request returns the
    former). So this lists what's actually available first and asks for
    a vetted one by name, rather than trusting the default pick. */
async function findVettedEnglishVersion(ref: string): Promise<Record<string, unknown> | null> {
  let response: Response;
  try {
    response = await fetch(`https://www.sefaria.org/api/texts/versions/${encodeURIComponent(ref)}`);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let list: unknown;
  try {
    list = await response.json();
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;

  return (
    (list.find((v) => {
      const version = v as Record<string, unknown>;
      const versionTitle = typeof version.versionTitle === "string" ? version.versionTitle : "";
      const shortVersionTitle = typeof version.shortVersionTitle === "string" ? version.shortVersionTitle : undefined;
      const license = typeof version.license === "string" ? version.license : "";
      return (
        version.language === "en" &&
        isAcceptableLicense(license) &&
        versionTitle &&
        isVettedOrthodoxSource(versionTitle, shortVersionTitle)
      );
    }) as Record<string, unknown> | undefined) ?? null
  );
}

export async function fetchMishnaTranslation(
  masechet: string,
  perek: number,
  mishnah: number,
): Promise<TranslationFetchResult> {
  const ref = SEFARIA_REF_BY_MASECHET[masechet];
  if (!ref) return { status: "unavailable" };
  const fullRef = `${ref}.${perek}.${mishnah}`;

  const vetted = await findVettedEnglishVersion(ref);
  if (!vetted) return { status: "unavailable" };

  const versionTitle = (vetted.versionTitle as string).trim();
  const versionParam = `english|${versionTitle}`;
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(fullRef)}?version=${encodeURIComponent(versionParam)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { status: "error" };
  }
  if (!response.ok) return { status: "error" };

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { status: "error" };
  }

  const versions = (data as { versions?: unknown }).versions;
  const version = Array.isArray(versions)
    ? (versions.find((v) => (v as { language?: unknown })?.language === "en") as Record<string, unknown> | undefined)
    : undefined;
  if (!version) return { status: "unavailable" };

  const text = typeof version.text === "string" ? stripTags(version.text) : "";
  if (!text) return { status: "unavailable" };

  // Re-checked against the actual version this specific ref resolved to
  // (not just the masechet-level lookup above) — a mishnah-range request
  // can in principle resolve differently, so this is the real gate, not
  // a formality.
  const license = typeof version.license === "string" ? version.license.trim() : "";
  const confirmedTitle = typeof version.versionTitle === "string" ? version.versionTitle.trim() : "";
  const shortVersionTitle =
    typeof version.shortVersionTitle === "string" && version.shortVersionTitle ? version.shortVersionTitle : undefined;
  if (!isAcceptableLicense(license) || !confirmedTitle) return { status: "unavailable" };
  if (!isVettedOrthodoxSource(confirmedTitle, shortVersionTitle)) return { status: "unavailable" };

  const attribution: TranslationAttribution = {
    versionTitle: confirmedTitle,
    versionTitleInHebrew: typeof version.versionTitleInHebrew === "string" && version.versionTitleInHebrew
      ? version.versionTitleInHebrew
      : undefined,
    shortVersionTitle,
    versionSource: typeof version.versionSource === "string" ? version.versionSource : "",
    license,
  };
  recordVersionSeen(attribution);

  return { status: "ok", text, attribution };
}
