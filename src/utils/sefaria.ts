import { SEFARIA_REF_BY_MASECHET } from "../data/sefariaRefs";

export interface RandomMishna {
  masechet: string;
  perek: number;
  mishnahNumber: number;
  textHe: string;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Fetches an entire perek from Sefaria and returns one randomly-picked
 * mishnah's Hebrew text from it. Fetching the whole perek (rather than a
 * single mishnah) avoids needing separate mishnah-per-perek count data —
 * we just pick a random index into whatever Sefaria returns.
 */
export async function fetchRandomMishna(masechet: string, perek: number): Promise<RandomMishna> {
  const ref = SEFARIA_REF_BY_MASECHET[masechet];
  if (!ref) {
    throw new Error(`No Sefaria ref mapping for masechet "${masechet}".`);
  }

  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(`${ref}.${perek}`)}?context=0`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Couldn't reach Sefaria — check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error(`Sefaria returned an error (${response.status}) for ${ref} ${perek}.`);
  }

  const data: unknown = await response.json();
  const he = (data as { he?: unknown }).he;
  const heList = Array.isArray(he) ? he : typeof he === "string" ? [he] : [];
  const nonEmpty = heList.filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  if (nonEmpty.length === 0) {
    throw new Error(`Sefaria didn't return any text for ${ref} perek ${perek}.`);
  }

  const index = Math.floor(Math.random() * nonEmpty.length);
  return {
    masechet,
    perek,
    mishnahNumber: index + 1,
    textHe: stripTags(nonEmpty[index]),
  };
}
