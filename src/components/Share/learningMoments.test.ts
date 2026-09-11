import { describe, expect, it } from "vitest";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { learningMoments } from "./learningMoments";

const refs = (from: number, to: number) => MISHNA_SEQUENCE.slice(from, to).map(({ masechetEn, perek, mishnah }) => ({ masechetEn, perek, mishnah }));
const idx = (masechetEn: string, perek: number, mishnah: number) =>
  MISHNA_SEQUENCE.findIndex((m) => m.masechetEn === masechetEn && m.perek === perek && m.mishnah === mishnah);

describe("learning moments", () => {
  it("offers nothing for an ordinary perek", () => {
    const done = refs(0, 4).map((r) => ({ ...r, date: "2026-09-01" }));
    expect(learningMoments({ progress: { completions: done, streak: { current: 3 } }, marking: refs(4, 5), today: "2026-09-02", chaburaName: null })).toEqual([]);
  });

  it("offers the masechet when its last mishnah is marked", () => {
    const end = idx("Peah", 1, 1);
    const done = refs(0, end - 1).map((r) => ({ ...r, date: "2026-09-01" }));
    const m = learningMoments({ progress: { completions: done, streak: { current: 5 } }, marking: refs(end - 1, end), today: "2026-09-02", chaburaName: null });
    expect(m.map((x) => x.type)).toEqual(["masechet"]);
    expect(m[0].status[0]).toBe("סיום מסכת ברכות");
  });

  it("offers a streak milestone only on the day's first mark", () => {
    const base = { completions: [{ ...refs(0, 1)[0], date: "2026-09-01" }], streak: { current: 29 } };
    expect(learningMoments({ progress: base, marking: refs(1, 2), today: "2026-09-02", chaburaName: null }).map((x) => x.type)).toEqual(["streak"]);
    const same = { completions: [{ ...refs(0, 1)[0], date: "2026-09-02" }], streak: { current: 30 } };
    expect(learningMoments({ progress: same, marking: refs(1, 2), today: "2026-09-02", chaburaName: null })).toEqual([]);
  });

  it("offers the seder too when the masechet closes it", () => {
    const end = idx("Shabbat", 1, 1);
    const done = refs(0, end - 1).map((r) => ({ ...r, date: "2026-09-01" }));
    const m = learningMoments({ progress: { completions: done, streak: { current: 1 } }, marking: refs(end - 1, end), today: "2026-09-02", chaburaName: null });
    expect(m.map((x) => x.type)).toEqual(["masechet", "seder"]);
  });

  it("names the chabura when a group finishes together", () => {
    const end = idx("Peah", 1, 1);
    const done = refs(0, end - 1).map((r) => ({ ...r, date: "2026-09-01" }));
    const m = learningMoments({ progress: { completions: done, streak: { current: 5 } }, marking: refs(end - 1, end), today: "2026-09-02", chaburaName: "Shiur Aleph" });
    expect(m[0].type).toBe("chabura");
    expect(m[0].bannerHead).toBe("Shiur Aleph is mesayem Berachot");
  });
});
