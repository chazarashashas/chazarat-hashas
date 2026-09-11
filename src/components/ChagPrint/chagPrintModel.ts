import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { getMishnayotCount } from "../../data/perekInfo";
import { addDays, parseDate, type ChagId, type ChagStretch } from "../../utils/chagCalendar";
import {
  sequenceItems,
  upcomingDayRanges,
  upcomingGroupDays,
  type MishnaRef,
} from "../../utils/dailyProjection";
import type { Pace } from "../../utils/useLearningProgress";
import type { GroupPace } from "../../utils/useChevrusa";

/** One learning track on a printed day: always the student's own Daily
    Limmud first, then any chevrusa/chabura they chose to add. `perekUnit`
    is true when they learn a perek at a time, so the page heads by perek. */
export interface PrintTrack {
  label: string | null;
  perekUnit: boolean;
  items: MishnaRef[];
}

export interface PrintDay {
  date: string;
  /** "Erev Rosh Hashana", "the first day of Rosh Hashana", "Shabbat", … */
  title: string;
  kind: "erev" | "yomtov" | "shabbat";
  tracks: PrintTrack[];
}

export interface GroupPlan {
  label: string;
  masechetEn: string;
  start: { perek: number; mishnah: number };
  pace: GroupPace;
  totalPerakim: number;
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

/**
 * What each day of the stretch (erev included) holds, projected from
 * where the student actually is — never a fixed quantity.
 *
 * The first unlearned day is today, unless today's Daily Limmud is
 * already marked, in which case what they learned today stays on today's
 * row and the projection starts tomorrow. Days between today and erev
 * (printing a Shabbat from Resources on a Wednesday) take their own
 * portions first, exactly as Daily Limmud will.
 */
export function buildPrintDays(args: {
  stretch: ChagStretch;
  today: string;
  position: number;
  pace: Pace;
  learnedToday: MishnaRef[];
  groups: GroupPlan[];
  /** Daily Limmud's own next portion, when it has one — the first
      unlearned day prints exactly what Daily Limmud shows (a queued
      catch-up included), and each day after follows from its end. */
  firstRange?: [number, number] | null;
}): PrintDay[] {
  const { stretch, today, position, pace, learnedToday, groups, firstRange } = args;
  const dates = [stretch.erev.date, ...stretch.days.map((d) => d.date)];
  const base = learnedToday.length > 0 ? addDays(today, 1) : today;
  const span = daysBetween(base, dates[dates.length - 1]) + 1;
  const personal =
    span <= 0 ? [] : firstRange ? [firstRange, ...upcomingDayRanges(firstRange[1] + 1, pace, span - 1)] : upcomingDayRanges(position, pace, span);
  const groupDays = groups.map((g) =>
    upcomingGroupDays(
      g.masechetEn,
      g.start,
      g.pace,
      g.totalPerakim,
      daysBetween(today, dates[dates.length - 1]) + 1,
    ),
  );

  return dates.map((date, i) => {
    const rest = i === 0 ? null : stretch.days[i - 1];
    const idx = daysBetween(base, date);
    const own =
      idx < 0
        ? date === today
          ? learnedToday
          : []
        : personal[idx]
          ? sequenceItems(personal[idx])
          : [];
    const tracks: PrintTrack[] = [{ label: null, perekUnit: pace.unit === "perakim", items: own }];
    groups.forEach((g, gi) => {
      const items = groupDays[gi][daysBetween(today, date)] ?? [];
      if (items.length > 0) tracks.push({ label: g.label, perekUnit: g.pace === "perek", items });
    });
    return {
      date,
      title: rest ? rest.title : stretch.erev.title,
      kind: rest ? (rest.yomTov ? "yomtov" : "shabbat") : "erev",
      tracks,
    };
  });
}

/** The row's own statement of what it holds — "Berachot 4:5 · 4:6", or
    "Berachot perek 4 · 7 mishnayot" at a perek a day. All numerals. */
export function itemsMeta(items: MishnaRef[], perekUnit: boolean): string {
  if (items.length === 0) return "Nothing left to learn";
  if (perekUnit) {
    const shown = perekGroups(items).map((g, i, all) =>
      perekLabel(g, i === 0 || all[i - 1].masechetEn !== g.masechetEn),
    );
    return `${shown.join(" · ")} · ${items.length} ${items.length === 1 ? "mishnah" : "mishnayot"}`;
  }
  return items
    .map((m, i) =>
      i > 0 && items[i - 1].masechetEn === m.masechetEn
        ? `${m.perek}:${m.mishnah}`
        : `${m.masechetEn} ${m.perek}:${m.mishnah}`,
    )
    .join(" · ");
}

export interface PerekGroup {
  masechetEn: string;
  perek: number;
  first: number;
  last: number;
  /** Every mishnah of the perek is here. */
  full: boolean;
}

/** A day's mishnayot, grouped by the perek each belongs to. */
export function perekGroups(items: MishnaRef[]): PerekGroup[] {
  const groups: PerekGroup[] = [];
  for (const m of items) {
    const g = groups[groups.length - 1];
    if (g && g.masechetEn === m.masechetEn && g.perek === m.perek) g.last = m.mishnah;
    else
      groups.push({
        masechetEn: m.masechetEn,
        perek: m.perek,
        first: m.mishnah,
        last: m.mishnah,
        full: false,
      });
  }
  for (const g of groups)
    g.full = g.first === 1 && g.last === getMishnayotCount(g.masechetEn, g.perek);
  return groups;
}

/** A whole perek is "Berachot perek 4". Part of one — the rest of a perek
    someone started mid-way — names the real range, "Berachot 1:2–1:5",
    and never claims to be the whole perek. */
export function perekLabel(g: PerekGroup, withMasechet = true): string {
  const m = withMasechet ? `${g.masechetEn} ` : "";
  if (g.full) return `${m}perek ${g.perek}`;
  return g.first === g.last
    ? `${m}${g.perek}:${g.first}`
    : `${m}${g.perek}:${g.first}–${g.perek}:${g.last}`;
}

const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

const CHAG_NAMES: Record<ChagId, string> = {
  "rosh-hashana": "Rosh Hashana",
  "yom-kippur": "Yom Kippur",
  sukkot: "Sukkot",
  "shmini-atzeret": "Shemini Atzeret",
  pesach: "Pesach",
  shavuot: "Shavuot",
};

/** "Two days of Rosh Hashana", "Yom Kippur", "Shabbat". */
export function stretchName(stretch: ChagStretch): string {
  if (!stretch.chag) return "Shabbat";
  const name = CHAG_NAMES[stretch.chag];
  const n = stretch.days.length;
  return n === 1 ? name : `${NUMBER_WORDS[n] ?? n} days of ${name}`;
}

export function sequenceIndex(m: MishnaRef): number {
  return MISHNA_SEQUENCE.findIndex(
    (s) => s.masechetEn === m.masechetEn && s.perek === m.perek && s.mishnah === m.mishnah,
  );
}

export function textKey(m: MishnaRef): string {
  return `${m.masechetEn}.${m.perek}.${m.mishnah}`;
}
