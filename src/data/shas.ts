/**
 * The full structure of Shas — six sedarim, each with its masechtot and
 * perek (chapter) counts. Perek counts are the standard Mishnah chapter
 * counts (524 total). This is the single source of truth for seder /
 * masechet data — do not duplicate this list elsewhere.
 */

export interface Masechet {
  he: string;
  en: string;
  perakim: number;
}

export interface Seder {
  id: string;
  letter: string;
  he: string;
  en: string;
  translation: string;
  subject: string;
  masechtot: Masechet[];
}

export const SEDARIM: Seder[] = [
  {
    id: "zeraim",
    letter: "ז",
    he: "זרעים",
    en: "Zeraim",
    translation: "Seeds",
    subject: "Agriculture, tithes, and blessings",
    masechtot: [
      { he: "ברכות", en: "Berachot", perakim: 9 },
      { he: "פאה", en: "Peah", perakim: 8 },
      { he: "דמאי", en: "Demai", perakim: 7 },
      { he: "כלאים", en: "Kilayim", perakim: 9 },
      { he: "שביעית", en: "Sheviit", perakim: 10 },
      { he: "תרומות", en: "Terumot", perakim: 11 },
      { he: "מעשרות", en: "Maasrot", perakim: 5 },
      { he: "מעשר שני", en: "Maaser Sheni", perakim: 5 },
      { he: "חלה", en: "Challah", perakim: 4 },
      { he: "ערלה", en: "Orlah", perakim: 3 },
      { he: "ביכורים", en: "Bikkurim", perakim: 4 },
    ],
  },
  {
    id: "moed",
    letter: "מ",
    he: "מועד",
    en: "Moed",
    translation: "Festival",
    subject: "Shabbat and the festivals",
    masechtot: [
      { he: "שבת", en: "Shabbat", perakim: 24 },
      { he: "עירובין", en: "Eruvin", perakim: 10 },
      { he: "פסחים", en: "Pesachim", perakim: 10 },
      { he: "שקלים", en: "Shekalim", perakim: 8 },
      { he: "יומא", en: "Yoma", perakim: 8 },
      { he: "סוכה", en: "Sukkah", perakim: 5 },
      { he: "ביצה", en: "Beitzah", perakim: 5 },
      { he: "ראש השנה", en: "Rosh Hashanah", perakim: 4 },
      { he: "תענית", en: "Taanit", perakim: 4 },
      { he: "מגילה", en: "Megillah", perakim: 4 },
      { he: "מועד קטן", en: "Moed Katan", perakim: 3 },
      { he: "חגיגה", en: "Chagigah", perakim: 3 },
    ],
  },
  {
    id: "nashim",
    letter: "נ",
    he: "נשים",
    en: "Nashim",
    translation: "Women",
    subject: "Marriage, divorce, and vows",
    masechtot: [
      { he: "יבמות", en: "Yevamot", perakim: 16 },
      { he: "כתובות", en: "Ketubot", perakim: 13 },
      { he: "נדרים", en: "Nedarim", perakim: 11 },
      { he: "נזיר", en: "Nazir", perakim: 9 },
      { he: "סוטה", en: "Sotah", perakim: 9 },
      { he: "גיטין", en: "Gittin", perakim: 9 },
      { he: "קידושין", en: "Kiddushin", perakim: 4 },
    ],
  },
  {
    id: "nezikin",
    letter: "נ",
    he: "נזיקין",
    en: "Nezikin",
    translation: "Damages",
    subject: "Civil law, courts, and ethics",
    masechtot: [
      { he: "בבא קמא", en: "Bava Kamma", perakim: 10 },
      { he: "בבא מציעא", en: "Bava Metzia", perakim: 10 },
      { he: "בבא בתרא", en: "Bava Batra", perakim: 10 },
      { he: "סנהדרין", en: "Sanhedrin", perakim: 11 },
      { he: "מכות", en: "Makkot", perakim: 3 },
      { he: "שבועות", en: "Shevuot", perakim: 8 },
      { he: "עדיות", en: "Eduyot", perakim: 8 },
      { he: "עבודה זרה", en: "Avodah Zarah", perakim: 5 },
      { he: "אבות", en: "Avot", perakim: 5 },
      { he: "הוריות", en: "Horayot", perakim: 3 },
    ],
  },
  {
    id: "kodashim",
    letter: "ק",
    he: "קדשים",
    en: "Kodashim",
    translation: "Holy Things",
    subject: "The Temple and its offerings",
    masechtot: [
      { he: "זבחים", en: "Zevachim", perakim: 14 },
      { he: "מנחות", en: "Menachot", perakim: 13 },
      { he: "חולין", en: "Chullin", perakim: 12 },
      { he: "בכורות", en: "Bechorot", perakim: 9 },
      { he: "ערכין", en: "Arachin", perakim: 9 },
      { he: "תמורה", en: "Temurah", perakim: 7 },
      { he: "כריתות", en: "Keritot", perakim: 6 },
      { he: "מעילה", en: "Meilah", perakim: 6 },
      { he: "תמיד", en: "Tamid", perakim: 7 },
      { he: "מדות", en: "Middot", perakim: 5 },
      { he: "קינים", en: "Kinnim", perakim: 3 },
    ],
  },
  {
    id: "taharot",
    letter: "ט",
    he: "טהרות",
    en: "Taharot",
    translation: "Purities",
    subject: "Ritual purity and impurity",
    masechtot: [
      { he: "כלים", en: "Keilim", perakim: 30 },
      { he: "אהלות", en: "Oholot", perakim: 18 },
      { he: "נגעים", en: "Negaim", perakim: 14 },
      { he: "פרה", en: "Parah", perakim: 12 },
      { he: "טהרות", en: "Taharot", perakim: 10 },
      { he: "מקואות", en: "Mikvaot", perakim: 10 },
      { he: "נדה", en: "Niddah", perakim: 10 },
      { he: "מכשירין", en: "Machshirin", perakim: 6 },
      { he: "זבים", en: "Zavim", perakim: 5 },
      { he: "טבול יום", en: "Tevul Yom", perakim: 4 },
      { he: "ידים", en: "Yadayim", perakim: 4 },
      { he: "עוקצין", en: "Uktzin", perakim: 3 },
    ],
  },
];

/** Mnemonic spelled from the first letters of the six sedarim, in order. */
export const MNEMONIC = "זמן נקט";

export function getSeder(id: string): Seder | undefined {
  return SEDARIM.find((s) => s.id === id);
}
