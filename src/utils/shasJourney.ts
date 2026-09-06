import { SEDARIM, type Masechet, type Seder } from "../data/shas";
import { getMishnayotCount } from "../data/perekInfo";
import { getSederHue } from "./sederHue";
import type { FlipScope } from "../components/FlipCounter/FlipCounter";

interface ProgressLike {
  isCompleted: (item: { masechetEn: string; perek: number; mishnah: number }) => boolean;
  masechetPercent: (masechetEn: string, perakim: number) => number;
  sederPercent: (sederId: string) => number;
  shasPercent: () => number;
}

/** How many masechtot are fully done — the same "just finished a
    masechet" fact the first-open prompt's one-time exception checks for
    (see useFirstOpenPrompt), computed off the same percent function
    Siyumim already uses rather than re-walking every mishnah by hand. */
export function countCompletedMasechtot(progress: ProgressLike): number {
  let count = 0;
  for (const seder of SEDARIM) {
    for (const m of seder.masechtot) {
      if (progress.masechetPercent(m.en, m.perakim) === 100) count++;
    }
  }
  return count;
}

/** The masechet you'd finish next, in Shas order — same "first not-yet-
    100%" rule Siyumim uses for its own Next Siyum card. */
export function findNextMasechet(progress: ProgressLike): { seder: Seder; masechet: Masechet } {
  for (const seder of SEDARIM) {
    for (const m of seder.masechtot) {
      if (progress.masechetPercent(m.en, m.perakim) < 100) return { seder, masechet: m };
    }
  }
  const lastSeder = SEDARIM[SEDARIM.length - 1];
  return { seder: lastSeder, masechet: lastSeder.masechtot[lastSeder.masechtot.length - 1] };
}

/** Masechet -> Seder -> Shas scopes for the FlipCounter, either for a
    specific masechet (a chevrusa/chabura's context) or, when omitted,
    for wherever your own sequential learning currently stands. */
export function buildJourneyScopes(progress: ProgressLike, masechetEn?: string): FlipScope[] {
  let seder: Seder;
  let masechet: Masechet;
  if (masechetEn) {
    const found = SEDARIM.flatMap((s) => s.masechtot.map((m) => ({ s, m }))).find((x) => x.m.en === masechetEn);
    if (!found) return [];
    seder = found.s;
    masechet = found.m;
  } else {
    ({ seder, masechet } = findNextMasechet(progress));
  }
  const hue = getSederHue(seder.id);

  let mDone = 0;
  let mTotal = 0;
  for (let p = 1; p <= masechet.perakim; p++) {
    const c = getMishnayotCount(masechet.en, p);
    mTotal += c;
    for (let mi = 1; mi <= c; mi++) {
      if (progress.isCompleted({ masechetEn: masechet.en, perek: p, mishnah: mi })) mDone++;
    }
  }

  let sDone = 0;
  let sTotal = 0;
  for (const m of seder.masechtot) {
    for (let p = 1; p <= m.perakim; p++) {
      const c = getMishnayotCount(m.en, p);
      sTotal += c;
      for (let mi = 1; mi <= c; mi++) {
        if (progress.isCompleted({ masechetEn: m.en, perek: p, mishnah: mi })) sDone++;
      }
    }
  }

  let shasDone = 0;
  let shasTotal = 0;
  for (const s of SEDARIM) {
    for (const m of s.masechtot) {
      for (let p = 1; p <= m.perakim; p++) {
        const c = getMishnayotCount(m.en, p);
        shasTotal += c;
        for (let mi = 1; mi <= c; mi++) {
          if (progress.isCompleted({ masechetEn: m.en, perek: p, mishnah: mi })) shasDone++;
        }
      }
    }
  }

  return [
    {
      key: "Masechet",
      title: masechet.en,
      context: seder.en,
      percent: progress.masechetPercent(masechet.en, masechet.perakim),
      doneCount: mDone,
      totalCount: mTotal,
      unit: "mishnayot",
      hue,
    },
    {
      key: "Seder",
      title: seder.en,
      context: `${seder.masechtot.length} masechtot`,
      percent: progress.sederPercent(seder.id),
      doneCount: sDone,
      totalCount: sTotal,
      unit: "mishnayot",
      hue,
    },
    {
      key: "Shas",
      title: "Kol HaShas",
      context: "all six sedarim",
      percent: progress.shasPercent(),
      doneCount: shasDone,
      totalCount: shasTotal,
      unit: "mishnayot",
      hue: "var(--gold)",
    },
  ];
}
