import { SEDARIM } from "../../data/shas";
import { getMishnayotCount } from "../../data/perekInfo";
import { MISHNA_SEQUENCE, mishnaKey } from "../../data/mishnaSequence";
import { chaburaMoment, masechetMoment, sederMoment, shasMoment, streakMoment, STREAK_MILESTONES, type ShareMoment } from "./shareMoments";

type Ref = { masechetEn: string; perek: number; mishnah: number };

interface ProgressLike {
  completions: (Ref & { date: string })[];
  streak: { current: number };
}

function masechetRefs(masechetEn: string, perakim: number): Ref[] {
  const out: Ref[] = [];
  for (let p = 1; p <= perakim; p++) for (let m = 1; m <= getMishnayotCount(masechetEn, p); m++) out.push({ masechetEn, perek: p, mishnah: m });
  return out;
}

/**
 * The share moments a Daily Limmud mark completes (SHARE-BRIEF.md
 * "Triggers"): a streak milestone, a masechet, a seder, all of Shas, or a
 * chabura's masechet finished together. Worked out before the mark lands,
 * from what was complete plus what is being marked. A perek never counts.
 */
export function learningMoments(args: { progress: ProgressLike; marking: Ref[]; today: string; chaburaName: string | null }): ShareMoment[] {
  const { progress, marking, today, chaburaName } = args;
  if (marking.length === 0) return [];
  const done = new Set(progress.completions.map(mishnaKey));
  const before = new Set(done);
  for (const m of marking) done.add(mishnaKey(m));

  const moments: ShareMoment[] = [];

  // Marking the first learning of the day adds a day to the streak.
  const alreadyToday = progress.completions.some((c) => c.date === today);
  const streakAfter = alreadyToday ? progress.streak.current : progress.streak.current + 1;
  if (!alreadyToday && STREAK_MILESTONES.includes(streakAfter)) moments.push(streakMoment(streakAfter));

  const complete = (refs: Ref[], set: Set<string>) => refs.every((r) => set.has(mishnaKey(r)));
  let masechtotDone = 0;
  const newlyDone: string[] = [];
  for (const s of SEDARIM) {
    for (const m of s.masechtot) {
      const refs = masechetRefs(m.en, m.perakim);
      if (complete(refs, done)) {
        masechtotDone++;
        if (!complete(refs, before)) newlyDone.push(m.en);
      }
    }
  }

  for (const en of newlyDone) {
    moments.push(chaburaName ? chaburaMoment(en, chaburaName) : masechetMoment(en, masechtotDone));
    const seder = SEDARIM.find((s) => s.masechtot.some((m) => m.en === en))!;
    const sederRefs = seder.masechtot.flatMap((m) => masechetRefs(m.en, m.perakim));
    if (complete(sederRefs, done)) moments.push(sederMoment(seder.id));
  }

  if (newlyDone.length > 0 && MISHNA_SEQUENCE.every((m) => done.has(mishnaKey(m)))) moments.push(shasMoment());
  return moments;
}
