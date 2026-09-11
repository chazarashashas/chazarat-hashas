import { MISHNA_SEQUENCE, endOfPerekIndex } from "../data/mishnaSequence";
import { getMishnayotCount } from "../data/perekInfo";
import type { Pace } from "./useLearningProgress";
import type { GroupPace } from "./useChevrusa";

/**
 * The one answer to "what comes next". Daily Limmud's own day, the
 * offline prefetch and the chag print job all read it, so they cannot
 * drift apart — and the streak, the printed page and the after-chag
 * reconcile depend on them agreeing.
 */

export interface MishnaRef {
  masechetEn: string;
  perek: number;
  mishnah: number;
}

/** One day of personal learning: the [start, end] indices into
    MISHNA_SEQUENCE a day at this pace covers, starting at `position`.
    Null once the position is past the end of Shas. */
export function dayRange(position: number, pace: Pace): [number, number] | null {
  if (position >= MISHNA_SEQUENCE.length) return null;
  const start = Math.max(0, position);
  let end = start;
  if (pace.unit === "mishnayot") {
    end = Math.min(start + pace.amount - 1, MISHNA_SEQUENCE.length - 1);
  } else {
    // endOfPerekIndex only finds the end of the perek containing the index
    // it's given, so reaching perek N+1 means stepping past perek N's last
    // mishnah first.
    for (let i = 0; i < pace.amount; i++) {
      end = endOfPerekIndex(end);
      if (i < pace.amount - 1 && end + 1 < MISHNA_SEQUENCE.length) end += 1;
    }
    end = Math.min(end, MISHNA_SEQUENCE.length - 1);
  }
  return [start, end];
}

/** `days` consecutive days of personal learning from `position`, each as
    its sequence range — what each day would cover if every day before it
    were marked learned. Stops early at the end of Shas. A perek-a-day
    pace crosses masechet boundaries here exactly as Daily Limmud does. */
export function upcomingDayRanges(position: number, pace: Pace, days: number): [number, number][] {
  const ranges: [number, number][] = [];
  let start = position;
  for (let day = 0; day < days; day++) {
    const range = dayRange(start, pace);
    if (!range) break;
    ranges.push(range);
    start = range[1] + 1;
  }
  return ranges;
}

export function sequenceItems([start, end]: [number, number]): MishnaRef[] {
  return MISHNA_SEQUENCE.slice(start, end + 1).map(({ masechetEn, perek, mishnah }) => ({ masechetEn, perek, mishnah }));
}

/** One day of a chevrusa/chabura's learning: that group's masechet at its
    agreed pace, from `start`. A two-a-day pace crosses a perek boundary; a
    perek-a-day pace is the rest of `start`'s perek. Empty once `start` is
    past the masechet's last perek. */
export function groupDayItems(masechetEn: string, start: { perek: number; mishnah: number }, pace: GroupPace, totalPerakim: number): MishnaRef[] {
  if (start.perek > totalPerakim) return [];
  const items: MishnaRef[] = [{ masechetEn, perek: start.perek, mishnah: start.mishnah }];
  if (pace === "1") return items;

  const count = getMishnayotCount(masechetEn, start.perek);
  if (pace === "2") {
    const next = start.mishnah < count ? { perek: start.perek, mishnah: start.mishnah + 1 } : { perek: start.perek + 1, mishnah: 1 };
    if (next.perek <= totalPerakim) items.push({ masechetEn, ...next });
    return items;
  }

  for (let mi = start.mishnah + 1; mi <= count; mi++) items.push({ masechetEn, perek: start.perek, mishnah: mi });
  return items;
}

/** `days` consecutive days of a group's learning. Stops at the end of the
    group's masechet — what comes after it is the group's next decision,
    not a projection. */
export function upcomingGroupDays(
  masechetEn: string,
  start: { perek: number; mishnah: number },
  pace: GroupPace,
  totalPerakim: number,
  days: number,
): MishnaRef[][] {
  const out: MishnaRef[][] = [];
  let at = start;
  for (let day = 0; day < days; day++) {
    const items = groupDayItems(masechetEn, at, pace, totalPerakim);
    if (items.length === 0) break;
    out.push(items);
    const last = items[items.length - 1];
    at = last.mishnah < getMishnayotCount(masechetEn, last.perek) ? { perek: last.perek, mishnah: last.mishnah + 1 } : { perek: last.perek + 1, mishnah: 1 };
  }
  return out;
}
