import { HDate, HebrewCalendar, flags } from "@hebcal/core";

/**
 * The Jewish calendar as the app needs it (CHAG-BRIEF.md): for any date,
 * is it a rest day — yom tov or Shabbat, when nobody can mark a mishnah —
 * which chag it is, and what the day is called.
 *
 * Yom tov is read on the diaspora calendar, so a second day is always
 * there to print; a day that is yom tov only outside Israel is titled
 * "Yom Tov Sheni / Isru Chag", which names it truthfully for both. There
 * is deliberately no Israel/diaspora setting.
 *
 * Dates are local YYYY-MM-DD strings, like every other date in the app.
 */

export type ChagId = "rosh-hashana" | "yom-kippur" | "sukkot" | "shmini-atzeret" | "pesach" | "shavuot";

export interface RestDay {
  date: string;
  shabbat: boolean;
  yomTov: boolean;
  /** Yom tov outside Israel only. */
  sheni: boolean;
  chag: ChagId | null;
  /** What the day is, for "My Mishnayot for …": "the first day of Rosh
      Hashana", "Yom Kippur", "Yom Tov Sheni / Isru Chag", "Shabbat". */
  title: string;
}

export interface ChagStretch {
  /** The ordinary day before — when printing happens. */
  erev: { date: string; title: string };
  /** The rest days, in order, with no gap. */
  days: RestDay[];
  /** The chag the stretch belongs to; null for an ordinary Shabbat. */
  chag: ChagId | null;
}

export const SHENI_TITLE = "Yom Tov Sheni / Isru Chag";

/** Verbatim, with nikud. */
export const GREETINGS: Record<ChagId | "shabbat", string> = {
  "rosh-hashana": "כְּתִיבָה וַחֲתִימָה טוֹבָה",
  "yom-kippur": "גְּמַר חֲתִימָה טוֹבָה",
  sukkot: "חַג שָׂמֵחַ",
  "shmini-atzeret": "חַג שָׂמֵחַ",
  pesach: "חַג כָּשֵׁר וְשָׂמֵחַ",
  shavuot: "חַג שָׂמֵחַ",
  shabbat: "שַׁבָּת שָׁלוֹם",
};

const CHAG_NAMES: Record<ChagId, string> = {
  "rosh-hashana": "Rosh Hashana",
  "yom-kippur": "Yom Kippur",
  sukkot: "Sukkot",
  "shmini-atzeret": "Shemini Atzeret",
  pesach: "Pesach",
  shavuot: "Shavuot",
};

export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(date: string, delta: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

function yomTovEvent(d: Date, il: boolean) {
  return (HebrewCalendar.getHolidaysOnDate(new HDate(d), il) ?? []).find((e) => e.getFlags() & flags.CHAG);
}

/** The chag and the day's title from hebcal's own description of it
    ("Rosh Hashana 5787", "Sukkot I", "Pesach VII", "Shmini Atzeret"). */
function describeYomTov(desc: string): { chag: ChagId; title: string } | null {
  if (desc.startsWith("Rosh Hashana")) {
    return { chag: "rosh-hashana", title: desc.endsWith("II") ? "the second day of Rosh Hashana" : "the first day of Rosh Hashana" };
  }
  if (desc.startsWith("Yom Kippur")) return { chag: "yom-kippur", title: "Yom Kippur" };
  if (desc.startsWith("Sukkot")) return { chag: "sukkot", title: "the first day of Sukkot" };
  if (desc.startsWith("Shmini Atzeret") || desc.startsWith("Simchat Torah")) return { chag: "shmini-atzeret", title: "Shemini Atzeret" };
  if (desc.startsWith("Pesach")) {
    return { chag: "pesach", title: /VII$/.test(desc) ? "Shevi'i shel Pesach" : "the first day of Pesach" };
  }
  if (desc.startsWith("Shavuot")) return { chag: "shavuot", title: "Shavuot" };
  return null;
}

/** Null on an ordinary weekday — including chol hamoed, when the phone works. */
export function restDay(date: string): RestDay | null {
  const d = parseDate(date);
  const shabbat = d.getDay() === 6;
  const diaspora = yomTovEvent(d, false);
  const described = diaspora ? describeYomTov(diaspora.getDesc()) : null;
  if (!shabbat && !described) return null;
  if (!described) return { date, shabbat, yomTov: false, sheni: false, chag: null, title: "Shabbat" };
  const sheni = !yomTovEvent(d, true);
  return { date, shabbat, yomTov: true, sheni, chag: described.chag, title: sheni ? SHENI_TITLE : described.title };
}

function erevTitle(first: RestDay, followingChag: ChagId | null): string {
  if (!first.yomTov) {
    // A Shabbat that runs straight into yom tov is still erev that chag.
    return followingChag ? `Erev ${CHAG_NAMES[followingChag]}` : "Erev Shabbat";
  }
  if (first.title === "Shevi'i shel Pesach") return "Erev Shevi'i shel Pesach";
  if (first.chag === "shmini-atzeret") return "Hoshana Rabba";
  return `Erev ${CHAG_NAMES[first.chag!]}`;
}

/** The stretch that begins tomorrow, when today is an ordinary day and
    tomorrow is not — i.e. today is erev. Null any other day. */
export function stretchFromErev(today: string): ChagStretch | null {
  if (restDay(today)) return null;
  const days: RestDay[] = [];
  for (let date = addDays(today, 1); ; date = addDays(date, 1)) {
    const day = restDay(date);
    if (!day) break;
    days.push(day);
  }
  if (days.length === 0) return null;
  const chag = days.find((d) => d.chag)?.chag ?? null;
  return { erev: { date: today, title: erevTitle(days[0], chag) }, days, chag };
}

/** The next stretch to print for — today's, when today is erev, otherwise
    the first erev within the next two weeks. Resources offers it any day. */
export function nextStretch(today: string): ChagStretch | null {
  for (let i = 0; i <= 14; i++) {
    const s = stretchFromErev(addDays(today, i));
    if (s) return s;
  }
  return null;
}

/** The most recent stretch that has already ended — the rest days before
    today, when today itself is an ordinary day. Looks back up to
    `withinDays`, so the after-chag reconcile can still find it when the
    app is next opened a few days later. */
export function lastEndedStretch(today: string, withinDays = 10): ChagStretch | null {
  if (restDay(today)) return null;
  let end: string | null = null;
  for (let i = 1; i <= withinDays; i++) {
    if (restDay(addDays(today, -i))) {
      end = addDays(today, -i);
      break;
    }
  }
  if (!end) return null;
  let start = end;
  while (restDay(addDays(start, -1))) start = addDays(start, -1);
  return stretchFromErev(addDays(start, -1));
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Friday 11 Sept" */
export function shortDayLabel(date: string): string {
  const d = parseDate(date);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Shabbat 12 September · 5787" */
export function longDayLabel(date: string): string {
  const d = parseDate(date);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} · ${new HDate(d).getFullYear()}`;
}

export function greetingFor(chag: ChagId | null): string {
  return GREETINGS[chag ?? "shabbat"];
}
