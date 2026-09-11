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

const ALL_MASECHTOT = SEDARIM.flatMap((s) => s.masechtot.map((m) => ({ ...m, seder: s })));

function masechetMishnayot(masechetEn: string, perakim: number): number {
  let n = 0;
  for (let p = 1; p <= perakim; p++) n += getMishnayotCount(masechetEn, p);
  return n;
}

export const STREAK_MILESTONES = [7, 30, 100, 180, 365];
const STREAK_SPAN: Record<number, string> = { 7: "a full week", 30: "a full month", 180: "half a year", 365: "a full year" };

export function streakMoment(days: number): ShareMoment {
  const words = capital(numberWords(days));
  return {
    type: "streak",
    weight: 60,
    kind: "plain",
    status: [PASSUK, `${words} days of daily Mishna.`, `Come join me in our daily learning — ${SITE}`],
    bannerHead: `${words} days of daily limmud`,
    bannerBody: STREAK_SPAN[days] ? `${capital(STREAK_SPAN[days])} of learning.` : "Day after day of learning.",
    sheetHead: `Share ${numberWords(days)} days`,
    link: URL,
    card: { fig: String(days), head: "days of daily limmud", sub: STREAK_SPAN[days] ?? "", invite: "Come join me in our daily learning", letter: "ל" },
  };
}

export type BestGame = "dash" | "quiz" | "chazara";

/** A personal best — the figure is the student's own, and the line makes
    it an invitation: "if I can, so can you". */
export function bestMoment(game: BestGame, value: number, outOf?: number, lit?: string[], points?: number): ShareMoment {
  const line =
    game === "dash"
      ? `If I can place ${value} masechtot, so can you.`
      : game === "quiz"
        ? `If I can place ${value} of ${outOf} mishnayot, so can you.`
        : `If I can recall ${value} masechtot, so can you.`;
  const head = game === "dash" ? "masechtot placed" : game === "quiz" ? `of ${outOf} mishnayot placed` : "masechtot recalled";
  const name = game === "dash" ? "Shas Dash" : game === "quiz" ? "Mishna Quiz" : "Mishna Chazara";
  return {
    type: "best",
    weight: 30,
    kind: "challenge",
    status: [PASSUK, line, `Come learn with me — ${SITE}`],
    bannerHead: `A new best — ${points !== undefined ? points.toLocaleString() : value}${outOf ? ` of ${outOf}` : ""}`,
    bannerBody: `${name}: ${value} ${head.replace(/^of \d+ /, "")}${game === "dash" ? ", every one correct" : ""}. Send it out and bring someone in.`,
    sheetHead: "Share and invite",
    link: URL,
    card: { fig: String(value), head, sub: name, invite: "Come learn with me", lit },
  };
}

export function all63Moment(game = "Shas Dash"): ShareMoment {
  return {
    type: "all63",
    weight: 65,
    kind: "challenge",
    status: [PASSUK, "All 63 masechtot, each in its own seder.", `If I can do it, so can you — ${SITE}`],
    bannerHead: "All 63 masechtot",
    bannerBody: "Every masechet in Shas, each one in its own seder.",
    sheetHead: "Share and invite",
    link: URL,
    card: { fig: "63", head: "all placed", sub: game, invite: "Come learn Shas with us" },
  };
}

/** A Sidrei Hamishna board put in order — quiet-link only, never a prompt. */
export function orderMoment(count: number, what: string): ShareMoment {
  return {
    type: "best",
    weight: 10,
    kind: "challenge",
    status: [PASSUK, `${capital(what)}, in order.`, `If I can do it, so can you — ${SITE}`],
    bannerHead: `${capital(what)}, in order`,
    bannerBody: "Sidrei Hamishna.",
    sheetHead: "Share and invite",
    link: URL,
    card: { fig: String(count), head: "in order", sub: "Sidrei Hamishna", invite: "Come learn with me" },
  };
}

/** Mesayem a masechet. `done` is how many of the 63 are now complete. */
export function masechetMoment(masechetEn: string, done: number): ShareMoment {
  const i = ALL_MASECHTOT.findIndex((m) => m.en === masechetEn);
  const m = ALL_MASECHTOT[i];
  const next = ALL_MASECHTOT[i + 1];
  const mishnayot = masechetMishnayot(m.en, m.perakim);
  const siyum = `סיום מסכת ${m.he}`;
  return {
    type: "masechet",
    weight: 70,
    kind: "step",
    status: [siyum, `${capital(numberWords(done))} of the 63${next ? ` — ${next.en} next` : ""}.`, `Come learn it along with me — ${SITE}`],
    bannerHead: `Mesayem Masechet ${m.en}`,
    bannerBody: `All ${mishnayot} mishnayot. ${capital(numberWords(done))} of the 63.`,
    sheetHead: "Share the siyum",
    link: URL,
    card: {
      stepLabel: "MESAYEM MASECHET",
      stepHe: siyum,
      head: `${mishnayot} mishnayot · ${m.perakim} perakim`,
      sub: `Seder ${m.seder.en}`,
      stepDone: done,
      stepAhead: next ? `${next.en} next — come learn it along with me` : "Come learn it along with me",
      letter: m.he.charAt(0),
    },
  };
}

export function sederMoment(sederId: string): ShareMoment {
  const s = SEDARIM.find((x) => x.id === sederId)!;
  const mishnayot = s.masechtot.reduce((n, m) => n + masechetMishnayot(m.en, m.perakim), 0);
  const hadran = `הֲדַרָן עֲלָךְ סֵדֶר ${SEDER_NIKUD[s.id]}`;
  const count = `${capital(numberWords(s.masechtot.length))} masechtot, ${mishnayot} mishnayot.`;
  return {
    type: "seder",
    weight: 90,
    kind: "ceremony",
    status: [hadran, count, `Learn with us — ${SITE}`],
    bannerHead: `Siyum on Seder ${s.en}`,
    bannerBody: `${count} A sixth of Shas, complete.`,
    sheetHead: "Share the siyum",
    link: URL,
    card: { cerHe: `סיום סדר ${s.he}`, hadran, sub: `${s.masechtot.length} masechtot · ${mishnayot} mishnayot` },
  };
}

export function shasMoment(): ShareMoment {
  return {
    type: "shas",
    weight: 100,
    kind: "ceremony",
    status: ["הֲדַרָן עֲלָךְ שִׁשָּׁה סִדְרֵי מִשְׁנָה", "All six sedarim, 63 masechtot, every mishnah.", `Learn with us — ${SITE}`],
    bannerHead: "Siyum haShas",
    bannerBody: "All six sedarim of the Mishna, complete.",
    sheetHead: "Share the siyum",
    link: URL,
    card: { cerHe: "סיום הש״ס", hadran: "הֲדַרָן עֲלָךְ שִׁשָּׁה סִדְרֵי מִשְׁנָה", sub: "6 sedarim · 63 masechtot" },
  };
}

/** An l'iluy nishmat siyum board with every one of its 524 perakim taken. */
export function boardMoment(dedication: string, slug: string): ShareMoment {
  const line = `לעילוי נשמת ${dedication}`;
  return {
    type: "board",
    weight: 85,
    kind: "ceremony",
    status: [line, "All 524 perakim of the Mishna, taken on.", `Come learn with us — ${SITE}`],
    bannerHead: "Every perek is taken",
    bannerBody: "All 524 perakim have someone learning them.",
    sheetHead: "Share the siyum",
    link: `${URL}/?siyum=${encodeURIComponent(slug)}`,
    card: { cerHe: line, hadran: "סיום הש״ס", sub: "524 perakim · every one taken" },
  };
}

export function chaburaMoment(masechetEn: string, groupName: string): ShareMoment {
  const m = ALL_MASECHTOT.find((x) => x.en === masechetEn)!;
  const siyum = `סיום מסכת ${m.he}`;
  return {
    type: "chabura",
    weight: 40,
    kind: "step",
    status: [siyum, `Our chabura learned Masechet ${m.en} together.`, `Learn with us — ${SITE}`],
    bannerHead: `${groupName} is mesayem ${m.en}`,
    bannerBody: "The whole shiur, together.",
    sheetHead: "Share the siyum",
    link: URL,
    card: {
      stepLabel: "SIYUM TOGETHER",
      stepHe: siyum,
      head: groupName,
      sub: `Seder ${m.seder.en}`,
      stepAhead: "Learned together — come learn with us",
      letter: m.he.charAt(0),
    },
  };
}

/** Seder membership in Shas order — the 63-square grid uses the real
    counts (11, 12, 7, 10, 11, 12), not i % 6. */
export const GRID_MASECHTOT = ALL_MASECHTOT.map((m) => ({ en: m.en, sederId: m.seder.id }));
