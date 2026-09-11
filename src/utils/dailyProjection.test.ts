import { describe, expect, it } from "vitest";
import { MISHNA_SEQUENCE } from "../data/mishnaSequence";
import { getMishnayotCount } from "../data/perekInfo";
import { groupDayItems, sequenceItems, upcomingDayRanges, upcomingGroupDays } from "./dailyProjection";

const at = (masechetEn: string, perek: number, mishnah: number) =>
  MISHNA_SEQUENCE.findIndex((m) => m.masechetEn === masechetEn && m.perek === perek && m.mishnah === mishnah);
const refs = (r: [number, number]) => sequenceItems(r).map((m) => `${m.masechetEn} ${m.perek}:${m.mishnah}`);

describe("daily projection", () => {
  it("walks two days at two a day", () => {
    const days = upcomingDayRanges(at("Berachot", 4, 5), { unit: "mishnayot", amount: 2 }, 2);
    expect(days.map(refs)).toEqual([
      ["Berachot 4:5", "Berachot 4:6"],
      ["Berachot 4:7", "Berachot 5:1"],
    ]);
  });

  it("takes any amount a day, 5 or 10", () => {
    for (const amount of [1, 5, 10]) {
      const [day] = upcomingDayRanges(at("Berachot", 1, 1), { unit: "mishnayot", amount }, 1);
      expect(refs(day)).toHaveLength(amount);
    }
  });

  it("takes whole perakim at a perek a day, crossing into the next masechet", () => {
    const lastPerek = 9;
    const days = upcomingDayRanges(at("Berachot", lastPerek, 1), { unit: "perakim", amount: 1 }, 2);
    expect(refs(days[0])).toHaveLength(getMishnayotCount("Berachot", lastPerek));
    expect(refs(days[1])[0]).toBe("Peah 1:1");
  });

  it("stops at the end of Shas", () => {
    expect(upcomingDayRanges(MISHNA_SEQUENCE.length - 1, { unit: "mishnayot", amount: 2 }, 3)).toHaveLength(1);
  });

  it("follows a group's pace within its masechet", () => {
    expect(groupDayItems("Berachot", { perek: 1, mishnah: 5 }, "2", 9).map((m) => `${m.perek}:${m.mishnah}`)).toEqual(["1:5", "2:1"]);
    const days = upcomingGroupDays("Berachot", { perek: 9, mishnah: 1 }, "perek", 9, 3);
    expect(days).toHaveLength(1);
  });
});
