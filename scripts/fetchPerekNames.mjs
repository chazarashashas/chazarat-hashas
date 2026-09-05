// One-off data-build script: fetches the first Mishnah of every perek in
// Shas from Sefaria and extracts its opening words as that perek's
// traditional name (e.g. Berachot 1 -> "Me'eimatai", the way a perek is
// actually referred to in learning, not just "chapter 1"). Output is
// written to src/data/perekNames.ts and committed — this does not run at
// app runtime.
//
// Run with: node scripts/fetchPerekNames.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mirrors src/data/sefariaRefs.ts and src/data/shas.ts — duplicated here
// deliberately since this is a standalone Node script (no TS/JSX loader),
// not app code; the app's own copies remain the single source of truth
// there.
const SEFARIA_REF_BY_MASECHET = {
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
  Yevamot: "Mishnah Yevamot",
  Ketubot: "Mishnah Ketubot",
  Nedarim: "Mishnah Nedarim",
  Nazir: "Mishnah Nazir",
  Sotah: "Mishnah Sotah",
  Gittin: "Mishnah Gittin",
  Kiddushin: "Mishnah Kiddushin",
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

const MASECHTOT_PERAKIM = {
  Berachot: 9, Peah: 8, Demai: 7, Kilayim: 9, Sheviit: 10, Terumot: 11, Maasrot: 5,
  "Maaser Sheni": 5, Challah: 4, Orlah: 3, Bikkurim: 4,
  Shabbat: 24, Eruvin: 10, Pesachim: 10, Shekalim: 8, Yoma: 8, Sukkah: 5, Beitzah: 5,
  "Rosh Hashanah": 4, Taanit: 4, Megillah: 4, "Moed Katan": 3, Chagigah: 3,
  Yevamot: 16, Ketubot: 13, Nedarim: 11, Nazir: 9, Sotah: 9, Gittin: 9, Kiddushin: 4,
  "Bava Kamma": 10, "Bava Metzia": 10, "Bava Batra": 10, Sanhedrin: 11, Makkot: 3,
  Shevuot: 8, Eduyot: 8, "Avodah Zarah": 5, Avot: 5, Horayot: 3,
  Zevachim: 14, Menachot: 13, Chullin: 12, Bechorot: 9, Arachin: 9, Temurah: 7,
  Keritot: 6, Meilah: 6, Tamid: 7, Middot: 5, Kinnim: 3,
  Keilim: 30, Oholot: 18, Negaim: 14, Parah: 12, Taharot: 10, Mikvaot: 10, Niddah: 10,
  Machshirin: 6, Zavim: 5, "Tevul Yom": 4, Yadayim: 4, Uktzin: 3,
};

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").trim();
}

// The traditional perek "name" is the opening words of its first mishnah,
// up to the first comma/period, capped at a handful of words so it reads
// as a name rather than a full sentence.
function extractName(mishnaHe) {
  const clean = stripTags(mishnaHe);
  const firstClause = clean.split(/[,.:;]/)[0].trim();
  const words = firstClause.split(/\s+/).filter(Boolean);
  return words.slice(0, 5).join(" ");
}

async function fetchPerekInfo(ref, perek, attempt = 1) {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(`${ref}.${perek}`)}?context=0`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const he = Array.isArray(data.he) ? data.he : [];
    const nonEmpty = he.filter((s) => typeof s === "string" && s.trim().length > 0);
    if (nonEmpty.length === 0) throw new Error("no mishna text");
    return { name: extractName(nonEmpty[0]), mishnayotCount: nonEmpty.length };
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchPerekInfo(ref, perek, attempt + 1);
    }
    console.error(`FAILED ${ref} ${perek}:`, err.message);
    return null;
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const jobs = [];
  for (const [masechet, perakim] of Object.entries(MASECHTOT_PERAKIM)) {
    const ref = SEFARIA_REF_BY_MASECHET[masechet];
    for (let perek = 1; perek <= perakim; perek++) {
      jobs.push({ masechet, ref, perek });
    }
  }

  console.log(`Fetching ${jobs.length} perakim from Sefaria...`);
  let done = 0;
  const results = await mapWithConcurrency(jobs, 8, async (job) => {
    const info = await fetchPerekInfo(job.ref, job.perek);
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${jobs.length}`);
    return { ...job, info };
  });

  const names = {};
  const mishnayotCounts = {};
  let failures = 0;
  for (const { masechet, perek, info } of results) {
    if (!names[masechet]) names[masechet] = [];
    if (!mishnayotCounts[masechet]) mishnayotCounts[masechet] = [];
    names[masechet][perek - 1] = info?.name ?? null;
    // Fall back to 1 rather than null/0 so a fetch failure can't produce a
    // perek with zero learnable mishnayot (which would break sequencing).
    mishnayotCounts[masechet][perek - 1] = info?.mishnayotCount ?? 1;
    if (!info) failures++;
  }

  console.log(`Done. ${failures} failures out of ${jobs.length}.`);

  const namesPath = join(__dirname, "..", "src", "data", "perekNames.json");
  const countsPath = join(__dirname, "..", "src", "data", "mishnayotCounts.json");
  writeFileSync(namesPath, JSON.stringify(names, null, 2) + "\n", "utf8");
  writeFileSync(countsPath, JSON.stringify(mishnayotCounts, null, 2) + "\n", "utf8");
  console.log("Wrote", namesPath);
  console.log("Wrote", countsPath);
}

main();
