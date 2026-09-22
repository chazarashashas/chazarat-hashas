import i18n from "../../i18n";
import { SEDARIM } from "../../data/shas";
import { getMishnayotCount } from "../../data/perekInfo";

/**
 * Every shareable moment (SHARE-BRIEF.md + REVISED-SHARE-BRIEF.md): the
 * card it makes, the three status lines that go on the clipboard, and
 * where it sits in the prompt rules. Every line ends by inviting someone
 * into the learning; none of them asks anyone to beat a number, and none
 * names what didn't happen.
 */

/** The four card structures — structurally different, not one template
    recoloured. `challenge` is the bright game card, `step` a masechet,
    `ceremony` a seder (or the whole of Shas), `plain` a streak. */
export type CardKind = "challenge" | "step" | "ceremony" | "plain";

/** For the prompt rules: never the same type twice in a week, and a
    dismissal quiets the type for 30 days. */
export type MomentType = "shas" | "seder" | "board" | "masechet" | "all63" | "streak" | "chabura" | "best";

export interface ShareMoment {
  type: MomentType;
  /** Heavier wins when two land on the same day. */
  weight: number;
  kind: CardKind;
  /** Line 1 is Hebrew — the passuk, or the siyum line. */
  status: [string, string, string];
  /** What the in-app prompt says. */
  bannerHead: string;
  bannerBody: string;
  sheetHead: string;
  /** Copy link target. */
  link: string;
  card: {
    fig?: string;
    head?: string;
    sub?: string;
    invite?: string;
    letter?: string;
    stepLabel?: string;
    stepHe?: string;
    stepDone?: number;
    stepAhead?: string;
    cerHe?: string;
    hadran?: string;
    /** For the challenge card's grid — masechtot to show lit; all 63 when
        absent (the logo's geometry at full strength). */
    lit?: string[];
  };
}

export const SITE = "chazarashashas.org";
const URL = `https://${SITE}`;
/** Yehoshua 1:8, verbatim with nikud. */
export const PASSUK = "וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה";

const SEDER_NIKUD: Record<string, string> = {
  zeraim: "זְרָעִים",
  moed: "מוֹעֵד",
  nashim: "נָשִׁים",
  nezikin: "נְזִיקִין",
  kodashim: "קָדָשִׁים",
  taharot: "טְהָרוֹת",
};

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** "thirty", "sixty-three", "a hundred and eighty", "three hundred and sixty-five". */
export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${h === 1 ? "a" : ONES[h]} hundred${rest ? ` and ${numberWords(rest)}` : ""}`;
  }
  return String(n);
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const isHebrew = () => i18n.language === "he";

/** A count in the status copy: spelled out in English ("Thirty"), digits
    in Hebrew, where spelled numbers change with gender. */
function spelled(n: number, capitalised = true): string {
  if (isHebrew()) return String(n);
  return capitalised ? capital(numberWords(n)) : numberWords(n);
}

/** A seder or masechet's name in the interface's language. */
function nameOf(item: { he: string; en: string }): string {
  return isHebrew() ? item.he : item.en;
}

const ALL_MASECHTOT = SEDARIM.flatMap((s) => s.masechtot.map((m) => ({ ...m, seder: s })));

function masechetMishnayot(masechetEn: string, perakim: number): number {
  let n = 0;
  for (let p = 1; p <= perakim; p++) n += getMishnayotCount(masechetEn, p);
  return n;
}

export const STREAK_MILESTONES = [7, 30, 100, 180, 365];
const STREAK_SPAN: Record<number, "week" | "month" | "halfYear" | "year"> = { 7: "week", 30: "month", 180: "halfYear", 365: "year" };

export function streakMoment(days: number): ShareMoment {
  const words = spelled(days);
  const span = STREAK_SPAN[days];
  return {
    type: "streak",
    weight: 60,
    kind: "plain",
    status: [PASSUK, i18n.t("share:streak.status", { words }), i18n.t("share:invite.joinDailyLine", { site: SITE })],
    bannerHead: i18n.t("share:streak.bannerHead", { words }),
    bannerBody: span ? i18n.t(`share:streak.spanBody.${span}`) : i18n.t("share:streak.bannerBodyDefault"),
    sheetHead: i18n.t("share:streak.sheetHead", { words: spelled(days, false) }),
    link: URL,
    card: {
      fig: String(days),
      head: i18n.t("share:streak.cardHead"),
      sub: span ? i18n.t(`share:streak.span.${span}`) : "",
      invite: i18n.t("share:invite.joinDaily"),
      letter: "ל",
    },
  };
}

export type BestGame = "dash" | "quiz" | "chazara";

/** A personal best — the figure is the student's own, and the line makes
    it an invitation: "if I can, so can you". */
export function bestMoment(game: BestGame, value: number, outOf?: number, lit?: string[], points?: number): ShareMoment {
  const line = i18n.t(`share:best.line.${game}`, { value, outOf });
  const head = i18n.t(`share:best.head.${game}`, { outOf });
  const name = i18n.t(`share:games.${game}`);
  const score = points !== undefined ? points.toLocaleString(isHebrew() ? "he-IL" : undefined) : String(value);
  return {
    type: "best",
    weight: 30,
    kind: "challenge",
    status: [PASSUK, line, i18n.t("share:invite.learnWithMeLine", { site: SITE })],
    bannerHead: outOf ? i18n.t("share:best.bannerHeadOutOf", { score, outOf }) : i18n.t("share:best.bannerHead", { score }),
    bannerBody: i18n.t(`share:best.bannerBody.${game}`, { game: name, value }),
    sheetHead: i18n.t("share:sheetHead.invite"),
    link: URL,
    card: { fig: String(value), head, sub: name, invite: i18n.t("share:invite.learnWithMe"), lit },
  };
}

/** The game that placed all 63, by id — or by its English name, as the
    callers passed it before; either is shown in the interface's language. */
export type All63Game = "dash" | "sederSort";
const GAME_KEYS: Record<string, All63Game> = { dash: "dash", sederSort: "sederSort", "Shas Dash": "dash", "Seder Sort": "sederSort" };

export function all63Moment(game: All63Game | string = "dash"): ShareMoment {
  const gameKey = GAME_KEYS[game];
  return {
    type: "all63",
    weight: 65,
    kind: "challenge",
    status: [PASSUK, i18n.t("share:all63.status"), i18n.t("share:invite.ifICanLine", { site: SITE })],
    bannerHead: i18n.t("share:all63.bannerHead"),
    bannerBody: i18n.t("share:all63.bannerBody"),
    sheetHead: i18n.t("share:sheetHead.invite"),
    link: URL,
    card: {
      fig: "63",
      head: i18n.t("share:all63.cardHead"),
      sub: gameKey ? i18n.t(`share:games.${gameKey}`) : game,
      invite: i18n.t("share:invite.learnShasWithUs"),
    },
  };
}

/** Which Sidrei Hamishna board was put in order: the six sedarim, or one
    seder's masechtot. */
export type OrderScope = { kind: "sedarim" } | { kind: "seder"; sederId: string };

/** "the six sedarim", "the eleven masechtot of Seder Zeraim" — built here
    so the whole sentence is in the interface's language. */
function orderWhat(count: number, scope: OrderScope): string {
  const words = spelled(count, false);
  if (scope.kind === "sedarim") return i18n.t("share:order.whatSedarim", { words });
  const s = SEDARIM.find((x) => x.id === scope.sederId);
  return i18n.t("share:order.whatSeder", { words, seder: s ? nameOf(s) : scope.sederId });
}

/** A Sidrei Hamishna board put in order — quiet-link only, never a prompt.
    `what` is preferably an OrderScope; an English phrase ("the six
    sedarim") is still accepted as it is. */
export function orderMoment(count: number, scope: OrderScope | string): ShareMoment {
  const what = typeof scope === "string" ? scope : orderWhat(count, scope);
  return {
    type: "best",
    weight: 10,
    kind: "challenge",
    status: [PASSUK, i18n.t("share:order.status", { what: capital(what) }), i18n.t("share:invite.ifICanLine", { site: SITE })],
    bannerHead: i18n.t("share:order.bannerHead", { what: capital(what) }),
    bannerBody: i18n.t("share:order.bannerBody"),
    sheetHead: i18n.t("share:sheetHead.invite"),
    link: URL,
    card: { fig: String(count), head: i18n.t("share:order.cardHead"), sub: i18n.t("share:games.sidrei"), invite: i18n.t("share:invite.learnWithMe") },
  };
}

/** Mesayem a masechet. `done` is how many of the 63 are now complete. */
export function masechetMoment(masechetEn: string, done: number): ShareMoment {
  const i = ALL_MASECHTOT.findIndex((m) => m.en === masechetEn);
  const m = ALL_MASECHTOT[i];
  const next = ALL_MASECHTOT[i + 1];
  const mishnayot = masechetMishnayot(m.en, m.perakim);
  const siyum = `סיום מסכת ${m.he}`;
  const words = spelled(done);
  return {
    type: "masechet",
    weight: 70,
    kind: "step",
    status: [
      siyum,
      next ? i18n.t("share:masechet.status", { words, next: nameOf(next) }) : i18n.t("share:masechet.statusLast", { words }),
      i18n.t("share:invite.learnItWithMeLine", { site: SITE }),
    ],
    bannerHead: i18n.t("share:masechet.bannerHead", { masechet: nameOf(m) }),
    bannerBody: i18n.t("share:masechet.bannerBody", { mishnayot, words }),
    sheetHead: i18n.t("share:sheetHead.siyum"),
    link: URL,
    card: {
      stepLabel: i18n.t("share:masechet.stepLabel"),
      stepHe: siyum,
      head: i18n.t("share:masechet.cardHead", { mishnayot, perakim: m.perakim }),
      sub: i18n.t("share:seder.sub", { seder: nameOf(m.seder) }),
      stepDone: done,
      stepAhead: next ? i18n.t("share:masechet.stepAhead", { next: nameOf(next) }) : i18n.t("share:invite.learnItWithMe"),
      letter: m.he.charAt(0),
    },
  };
}

export function sederMoment(sederId: string): ShareMoment {
  const s = SEDARIM.find((x) => x.id === sederId)!;
  const mishnayot = s.masechtot.reduce((n, m) => n + masechetMishnayot(m.en, m.perakim), 0);
  const hadran = `הֲדַרָן עֲלָךְ סֵדֶר ${SEDER_NIKUD[s.id]}`;
  const count = i18n.t("share:seder.count", { words: spelled(s.masechtot.length), mishnayot });
  return {
    type: "seder",
    weight: 90,
    kind: "ceremony",
    status: [hadran, count, i18n.t("share:invite.learnWithUsLine", { site: SITE })],
    bannerHead: i18n.t("share:seder.bannerHead", { seder: nameOf(s) }),
    bannerBody: i18n.t("share:seder.bannerBody", { summary: count }),
    sheetHead: i18n.t("share:sheetHead.siyum"),
    link: URL,
    card: { cerHe: `סיום סדר ${s.he}`, hadran, sub: i18n.t("share:seder.cardSub", { masechtot: s.masechtot.length, mishnayot }) },
  };
}

export function shasMoment(): ShareMoment {
  return {
    type: "shas",
    weight: 100,
    kind: "ceremony",
    status: ["הֲדַרָן עֲלָךְ שִׁשָּׁה סִדְרֵי מִשְׁנָה", i18n.t("share:shas.status"), i18n.t("share:invite.learnWithUsLine", { site: SITE })],
    bannerHead: i18n.t("share:shas.bannerHead"),
    bannerBody: i18n.t("share:shas.bannerBody"),
    sheetHead: i18n.t("share:sheetHead.siyum"),
    link: URL,
    card: { cerHe: "סיום הש״ס", hadran: "הֲדַרָן עֲלָךְ שִׁשָּׁה סִדְרֵי מִשְׁנָה", sub: i18n.t("share:shas.cardSub") },
  };
}

/** An l'iluy nishmat siyum board with every one of its 524 perakim taken. */
export function boardMoment(dedication: string, slug: string): ShareMoment {
  const line = `לעילוי נשמת ${dedication}`;
  return {
    type: "board",
    weight: 85,
    kind: "ceremony",
    status: [line, i18n.t("share:board.status"), i18n.t("share:invite.comeLearnWithUsLine", { site: SITE })],
    bannerHead: i18n.t("share:board.bannerHead"),
    bannerBody: i18n.t("share:board.bannerBody"),
    sheetHead: i18n.t("share:sheetHead.siyum"),
    link: `${URL}/?siyum=${encodeURIComponent(slug)}`,
    card: { cerHe: line, hadran: "סיום הש״ס", sub: i18n.t("share:board.cardSub") },
  };
}

export function chaburaMoment(masechetEn: string, groupName: string): ShareMoment {
  const m = ALL_MASECHTOT.find((x) => x.en === masechetEn)!;
  const siyum = `סיום מסכת ${m.he}`;
  return {
    type: "chabura",
    weight: 40,
    kind: "step",
    status: [siyum, i18n.t("share:chabura.status", { masechet: nameOf(m) }), i18n.t("share:invite.learnWithUsLine", { site: SITE })],
    bannerHead: i18n.t("share:chabura.bannerHead", { group: groupName, masechet: nameOf(m) }),
    bannerBody: i18n.t("share:chabura.bannerBody"),
    sheetHead: i18n.t("share:sheetHead.siyum"),
    link: URL,
    card: {
      stepLabel: i18n.t("share:chabura.stepLabel"),
      stepHe: siyum,
      head: groupName,
      sub: i18n.t("share:seder.sub", { seder: nameOf(m.seder) }),
      stepAhead: i18n.t("share:chabura.stepAhead"),
      letter: m.he.charAt(0),
    },
  };
}

/** Seder membership in Shas order — the 63-square grid uses the real
    counts (11, 12, 7, 10, 11, 12), not i % 6. */
export const GRID_MASECHTOT = ALL_MASECHTOT.map((m) => ({ en: m.en, sederId: m.seder.id }));
