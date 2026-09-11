import { describe, expect, it } from "vitest";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { getMishnayotCount } from "../../data/perekInfo";
import { stretchFromErev } from "../../utils/chagCalendar";
import { dayRange } from "../../utils/dailyProjection";
import type { Pace } from "../../utils/useLearningProgress";
import { buildPrintDays, itemsMeta } from "./chagPrintModel";

/**
 * The print audit: for every pace and starting point, the first unlearned
 * day prints exactly Daily Limmud's own portion, each later day follows
 * on from it with nothing skipped or repeated, and every label says
 * precisely what the day holds.
 */

const at = (masechetEn: string, perek: number, mishnah: number) =>
  MISHNA_SEQUENCE.findIndex((m) => m.masechetEn === masechetEn && m.perek === perek && m.mishnah === mishnah);
const refs = (items: { masechetEn: string; perek: number; mishnah: number }[]) => items.map((m) => `${m.masechetEn} ${m.perek}:${m.mishnah}`);
const rh = stretchFromErev("2026-09-11")!;

function plan(position: number, pace: Pace, learnedToday: { masechetEn: string; perek: number; mishnah: number }[] = [], today = "2026-09-11", stretch = rh) {
  const first = dayRange(position, pace);
  return buildPrintDays({ stretch, today, position, pace, learnedToday, groups: [], firstRange: first });
}

const PACES: Pace[] = [
  { unit: "mishnayot", amount: 1 },
  { unit: "mishnayot", amount: 2 },
  { unit: "mishnayot", amount: 5 },
  { unit: "mishnayot", amount: 10 },
  { unit: "perakim", amount: 1 },
  { unit: "perakim", amount: 2 },
];
const STARTS = [at("Berachot", 1, 1), at("Berachot", 1, 2), at("Berachot", 9, 5), at("Shabbat", 1, 1), MISHNA_SEQUENCE.length - 3];

describe("print audit", () => {
  for (const pace of PACES) {
    for (const start of STARTS) {
      it(`${pace.amount} ${pace.unit} a day from ${refs([MISHNA_SEQUENCE[start]])[0]}: contiguous, nothing skipped or repeated`, () => {
        const days = plan(start, pace);
        expect(refs(days[0].tracks[0].items)).toEqual(refs(MISHNA_SEQUENCE.slice(...(dayRange(start, pace)!.map((v, i) => v + i) as [number, number]))));
        const all = days.flatMap((d) => d.tracks[0].items);
        expect(refs(all)).toEqual(refs(MISHNA_SEQUENCE.slice(start, start + all.length)));
      });
    }
  }

  it("when today is already learned, today's row keeps what was learned and yom tov starts at the position", () => {
    const learned = [MISHNA_SEQUENCE[at("Berachot", 4, 5)], MISHNA_SEQUENCE[at("Berachot", 4, 6)]];
    const days = plan(at("Berachot", 4, 7), { unit: "mishnayot", amount: 2 }, learned);
    expect(days.map((d) => itemsMeta(d.tracks[0].items, false))).toEqual(["Berachot 4:5 · 4:6", "Berachot 4:7 · 5:1", "Berachot 5:2 · 5:3"]);
  });

  it("names a whole perek, and names only the part of a perek begun mid-way", () => {
    const days = plan(at("Berachot", 1, 2), { unit: "perakim", amount: 1 });
    expect(itemsMeta(days[0].tracks[0].items, true)).toBe("Berachot 1:2–1:5 · 4 mishnayot");
    expect(itemsMeta(days[1].tracks[0].items, true)).toBe(`Berachot perek 2 · ${getMishnayotCount("Berachot", 2)} mishnayot`);
  });

  it("crosses into the next masechet with its name", () => {
    const days = plan(at("Berachot", 9, 1), { unit: "perakim", amount: 1 });
    expect(itemsMeta(days[1].tracks[0].items, true)).toMatch(/^Peah perek 1 · /);
  });

  it("printing Shabbat from Resources on a Wednesday takes Wednesday–Friday's portions first", () => {
    const shabbat = stretchFromErev("2026-09-18")!;
    const days = buildPrintDays({ stretch: shabbat, today: "2026-09-16", position: 0, pace: { unit: "mishnayot", amount: 1 }, learnedToday: [], groups: [] });
    expect(days.map((d) => refs(d.tracks[0].items))).toEqual([["Berachot 1:3"], ["Berachot 1:4"]]);
  });

  it("a queued catch-up prints as the first day's portion, exactly as Daily Limmud shows it", () => {
    const days = buildPrintDays({
      stretch: rh,
      today: "2026-09-11",
      position: 0,
      pace: { unit: "mishnayot", amount: 1 },
      learnedToday: [],
      groups: [],
      firstRange: [0, 3],
    });
    expect(refs(days[0].tracks[0].items)).toEqual(["Berachot 1:1", "Berachot 1:2", "Berachot 1:3", "Berachot 1:4"]);
    expect(refs(days[1].tracks[0].items)).toEqual(["Berachot 1:5"]);
  });
});
