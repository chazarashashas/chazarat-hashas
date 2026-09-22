import { HDate, gematriya } from "@hebcal/core";
import i18n from "../../i18n";
import type { en } from "../../i18n/locales/en";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { getMishnayotCount } from "../../data/perekInfo";
import { findMasechet } from "../../data/shas";
import {
  addDays,
  longDayLabel,
  parseDate,
  shortDayLabel,
  type ChagId,
  type ChagStretch,
} from "../../utils/chagCalendar";
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
  if (items.length === 0) return i18n.t("print:meta.nothingLeft");
  if (perekUnit) {
    const shown = perekGroups(items).map((g, i, all) =>
      perekLabel(g, i === 0 || all[i - 1].masechetEn !== g.masechetEn),
    );
    return `${shown.join(" · ")} · ${mishnayotCount(items.length)}`;
  }
  return items
    .map((m, i) =>
      i > 0 && items[i - 1].masechetEn === m.masechetEn
        ? `${m.perek}:${m.mishnah}`
        : `${masechetName(m.masechetEn)} ${m.perek}:${m.mishnah}`,
    )
    .join(" · ");
}

/** "1 mishnah", "7 mishnayot" (Hebrew: "משנה אחת", "7 משניות"). */
export function mishnayotCount(n: number): string {
  return i18n.t("print:meta.mishnayotCount", { count: n });
}

/** A masechet's name in the interface's language, from its English key. */
export function masechetName(masechetEn: string): string {
  if (i18n.language !== "he") return masechetEn;
  return findMasechet(masechetEn)?.he ?? masechetEn;
}

/** "Berachot perek 4" in the interface's language. */
export function perekName(masechetEn: string, perek: number): string {
  return i18n.t("print:meta.perek", { masechet: masechetName(masechetEn), perek });
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
  if (g.full) return withMasechet ? perekName(g.masechetEn, g.perek) : i18n.t("print:meta.perekOnly", { perek: g.perek });
  const m = withMasechet ? `${masechetName(g.masechetEn)} ` : "";
  return g.first === g.last
    ? `${m}${g.perek}:${g.first}`
    : `${m}${g.perek}:${g.first}–${g.perek}:${g.last}`;
}

const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

type ChagKey = "roshHashana" | "yomKippur" | "sukkot" | "shminiAtzeret" | "pesach" | "shavuot" | "shabbat";

const CHAG_KEYS: Record<ChagId, ChagKey> = {
  "rosh-hashana": "roshHashana",
  "yom-kippur": "yomKippur",
  sukkot: "sukkot",
  "shmini-atzeret": "shminiAtzeret",
  pesach: "pesach",
  shavuot: "shavuot",
};

function chagKeyName(key: ChagKey): string {
  return i18n.t(`print:chag.${key}`);
}

/** "Rosh Hashana", or "Shabbat" for an ordinary Shabbat. */
export function chagName(stretch: ChagStretch): string {
  return chagKeyName(stretch.chag ? CHAG_KEYS[stretch.chag] : "shabbat");
}

/** "Two days of Rosh Hashana", "Yom Kippur", "Shabbat". */
export function stretchName(stretch: ChagStretch): string {
  if (!stretch.chag) return chagKeyName("shabbat");
  const chag = chagKeyName(CHAG_KEYS[stretch.chag]);
  const n = stretch.days.length;
  if (n === 1) return chag;
  if (n === 2) return i18n.t("print:stretch.two", { chag });
  if (n === 3) return i18n.t("print:stretch.three", { chag });
  return i18n.t("print:stretch.many", { chag, words: i18n.language === "he" ? String(n) : (NUMBER_WORDS[n] ?? String(n)) });
}

/** chagCalendar names each day in English ("the first day of Rosh
    Hashana", "Erev Shabbat", …); this is that name in the interface's
    language. An unknown title passes through as it is. */
type DayTitleKey = Exclude<keyof typeof en.print.dayTitle, "erev">;
const DAY_TITLE_KEYS: Record<string, DayTitleKey> = {
  "the first day of Rosh Hashana": "firstDayRoshHashana",
  "the second day of Rosh Hashana": "secondDayRoshHashana",
  "the first day of Sukkot": "firstDaySukkot",
  "the first day of Pesach": "firstDayPesach",
  "Shevi'i shel Pesach": "sheviiShelPesach",
  "Erev Shevi'i shel Pesach": "erevSheviiShelPesach",
  "Yom Tov Sheni / Isru Chag": "sheni",
  "Hoshana Rabba": "hoshanaRabba",
};
const CHAG_BY_ENGLISH: Record<string, ChagKey> = {
  "Rosh Hashana": "roshHashana",
  "Yom Kippur": "yomKippur",
  Sukkot: "sukkot",
  "Shemini Atzeret": "shminiAtzeret",
  Pesach: "pesach",
  Shavuot: "shavuot",
  Shabbat: "shabbat",
};

export function dayTitle(title: string): string {
  const key = DAY_TITLE_KEYS[title];
  if (key) return i18n.t(`print:dayTitle.${key}`);
  if (CHAG_BY_ENGLISH[title]) return chagKeyName(CHAG_BY_ENGLISH[title]);
  const erev = /^Erev (.+)$/.exec(title);
  if (erev && CHAG_BY_ENGLISH[erev[1]]) return i18n.t("print:dayTitle.erev", { chag: chagKeyName(CHAG_BY_ENGLISH[erev[1]]) });
  return title;
}

/** "Friday 11 Sept" — in Hebrew, "יום שישי, 11 בספט׳". */
export function shortDay(date: string): string {
  if (i18n.language !== "he") return shortDayLabel(date);
  return parseDate(date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "short" });
}

/** "Shabbat 12 September · 5787" — in Hebrew, "יום שבת, 12 בספטמבר · תשפ״ז". */
export function longDay(date: string): string {
  if (i18n.language !== "he") return longDayLabel(date);
  const d = parseDate(date);
  return `${d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })} · ${gematriya(new HDate(d).getFullYear())}`;
}

export function sequenceIndex(m: MishnaRef): number {
  return MISHNA_SEQUENCE.findIndex(
    (s) => s.masechetEn === m.masechetEn && s.perek === m.perek && s.mishnah === m.mishnah,
  );
}

export function textKey(m: MishnaRef): string {
  return `${m.masechetEn}.${m.perek}.${m.mishnah}`;
}
