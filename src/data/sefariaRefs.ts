/**
 * Maps this app's masechet names (src/data/shas.ts, `en` field) to the
 * tractate ref prefix Sefaria's API expects (e.g. "Mishnah Berakhot").
 * Sefaria's own transliteration often differs from ours (e.g. our
 * "Bechorot" is Sefaria's "Bekhorot"; "Avot" is Sefaria's "Pirkei Avot",
 * with no "Mishnah" prefix). Every entry here was verified against a live
 * request to https://www.sefaria.org/api/texts/{ref}.1.1 before being
 * added — none of this is guessed.
 */
export const SEFARIA_REF_BY_MASECHET: Record<string, string> = {
  // Zeraim
  Berachot: "Mishnah Berakhot",
  Peah: "Mishnah Peah",
  Demai: "Mishnah Demai",
  Kilayim: "Mishnah Kilayim",
  Sheviit: "Mishnah Sheviit",
  Terumot: "Mishnah Terumot",
  Maasrot: "Mishnah Maasrot",
  "Maaser Sheni": "Mishnah Maaser Sheni",
  Challah: "Mishnah Challah",
  Orlah: "Mishnah Orlah",
  Bikkurim: "Mishnah Bikkurim",

  // Moed
  Shabbat: "Mishnah Shabbat",
  Eruvin: "Mishnah Eruvin",
  Pesachim: "Mishnah Pesachim",
  Shekalim: "Mishnah Shekalim",
  Yoma: "Mishnah Yoma",
  Sukkah: "Mishnah Sukkah",
  Beitzah: "Mishnah Beitzah",
  "Rosh Hashanah": "Mishnah Rosh Hashanah",
  Taanit: "Mishnah Ta'anit",
  Megillah: "Mishnah Megillah",
  "Moed Katan": "Mishnah Moed Katan",
  Chagigah: "Mishnah Chagigah",

  // Nashim
  Yevamot: "Mishnah Yevamot",
  Ketubot: "Mishnah Ketubot",
  Nedarim: "Mishnah Nedarim",
  Nazir: "Mishnah Nazir",
  Sotah: "Mishnah Sotah",
  Gittin: "Mishnah Gittin",
  Kiddushin: "Mishnah Kiddushin",

  // Nezikin
  "Bava Kamma": "Mishnah Bava Kamma",
  "Bava Metzia": "Mishnah Bava Metzia",
  "Bava Batra": "Mishnah Bava Batra",
  Sanhedrin: "Mishnah Sanhedrin",
  Makkot: "Mishnah Makkot",
  Shevuot: "Mishnah Shevuot",
  Eduyot: "Mishnah Eduyot",
  "Avodah Zarah": "Mishnah Avodah Zarah",
  Avot: "Pirkei Avot",
  Horayot: "Mishnah Horayot",

  // Kodashim
  Zevachim: "Mishnah Zevachim",
  Menachot: "Mishnah Menachot",
  Chullin: "Mishnah Chullin",
  Bechorot: "Mishnah Bekhorot",
  Arachin: "Mishnah Arakhin",
  Temurah: "Mishnah Temurah",
  Keritot: "Mishnah Keritot",
  Meilah: "Mishnah Meilah",
  Tamid: "Mishnah Tamid",
  Middot: "Mishnah Middot",
  Kinnim: "Mishnah Kinnim",

  // Taharot
  Keilim: "Mishnah Kelim",
  Oholot: "Mishnah Oholot",
  Negaim: "Mishnah Negaim",
  Parah: "Mishnah Parah",
  Taharot: "Mishnah Tahorot",
  Mikvaot: "Mishnah Mikvaot",
  Niddah: "Mishnah Niddah",
  Machshirin: "Mishnah Makhshirin",
  Zavim: "Mishnah Zavim",
  "Tevul Yom": "Mishnah Tevul Yom",
  Yadayim: "Mishnah Yadayim",
  Uktzin: "Mishnah Oktzin",
};
