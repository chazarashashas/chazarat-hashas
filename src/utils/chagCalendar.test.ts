import { describe, expect, it } from "vitest";
import {
  endedStretchAt,
  lastEndedStretch,
  longDayLabel,
  nextStretch,
  nextStretchCheckAt,
  restDay,
  shortDayLabel,
  stretchFromErev,
  SHENI_TITLE,
} from "./chagCalendar";

describe("chag calendar", () => {
  it("reads Rosh Hashana 5787 — first day on Shabbat, counted once", () => {
    const s = stretchFromErev("2026-09-11")!;
    expect(s.erev.title).toBe("Erev Rosh Hashana");
    expect(s.chag).toBe("rosh-hashana");
    expect(s.days.map((d) => [d.date, d.title, d.yomTov, d.shabbat])).toEqual([
      ["2026-09-12", "the first day of Rosh Hashana", true, true],
      ["2026-09-13", "the second day of Rosh Hashana", true, false],
    ]);
    expect(s.days.some((d) => d.sheni)).toBe(false);
  });

  it("titles a diaspora-only second day Yom Tov Sheni / Isru Chag", () => {
    const s = stretchFromErev("2026-09-25")!;
    expect(s.erev.title).toBe("Erev Sukkot");
    expect(s.days.map((d) => d.title)).toEqual(["the first day of Sukkot", SHENI_TITLE]);
    expect(s.days[1].sheni).toBe(true);
  });

  it("covers an ordinary Shabbat", () => {
    const s = stretchFromErev("2026-09-18")!;
    expect(s.erev.title).toBe("Erev Shabbat");
    expect(s.chag).toBeNull();
    expect(s.days.map((d) => d.title)).toEqual(["Shabbat"]);
  });

  it("has no stretch on an ordinary weekday or during one", () => {
    expect(stretchFromErev("2026-09-15")).toBeNull();
    expect(stretchFromErev("2026-09-12")).toBeNull();
    expect(restDay("2026-09-29")).toBeNull(); // chol hamoed
  });

  it("finds the stretch that just ended", () => {
    expect(lastEndedStretch("2026-09-14")?.erev.date).toBe("2026-09-11");
    expect(lastEndedStretch("2026-09-16")?.erev.date).toBe("2026-09-11");
    expect(lastEndedStretch("2026-09-13")).toBeNull();
  });

  it("labels days by name, with Shabbat for Saturday", () => {
    expect(shortDayLabel("2026-09-11")).toBe("Friday 11 Sept");
    expect(longDayLabel("2026-09-12")).toBe("Shabbat 12 September · 5787");
  });

  it("never offers printing on Shabbat or yom tov — not even the next one, from Resources", () => {
    for (const restDate of ["2026-09-12", "2026-09-13", "2026-09-19", "2026-09-21"]) {
      expect(stretchFromErev(restDate)).toBeNull();
      expect(nextStretch(restDate)).toBeNull();
    }
    expect(nextStretch("2026-09-16")?.erev.date).toBe("2026-09-18");
    expect(nextStretch("2026-09-11")?.erev.date).toBe("2026-09-11");
  });

  describe("the after-chag prompt, by the clock", () => {
    // Stub nightfall at 19:45 local on every date.
    const at7_45 = (date: string) => {
      const [y, m, d] = date.split("-").map(Number);
      return new Date(y, m - 1, d, 19, 45);
    };

    it("opens ten minutes after the last night of yom tov ends — not at midnight", () => {
      // Sunday Sept 13, the second day of Rosh Hashana.
      expect(endedStretchAt(new Date(2026, 8, 13, 19, 54), at7_45)).toBeNull();
      expect(endedStretchAt(new Date(2026, 8, 13, 19, 55), at7_45)?.erev.date).toBe("2026-09-11");
      // The first day: yom tov continues tomorrow, so never.
      expect(endedStretchAt(new Date(2026, 8, 12, 23, 0), at7_45)).toBeNull();
    });

    it("does the same after an ordinary Shabbat", () => {
      expect(endedStretchAt(new Date(2026, 8, 19, 19, 50), at7_45)).toBeNull();
      expect(endedStretchAt(new Date(2026, 8, 19, 20, 30), at7_45)?.erev.date).toBe("2026-09-18");
    });

    it("waits for the next date when nightfall can't be known, and still works the next day", () => {
      expect(endedStretchAt(new Date(2026, 8, 19, 23, 0), () => null)).toBeNull();
      expect(endedStretchAt(new Date(2026, 8, 20, 9, 0), () => null)?.erev.date).toBe("2026-09-18");
    });

    it("wakes at nightfall plus ten minutes, otherwise at midnight", () => {
      expect(nextStretchCheckAt(new Date(2026, 8, 19, 18, 0), at7_45).getTime()).toBe(new Date(2026, 8, 19, 19, 55).getTime());
      expect(nextStretchCheckAt(new Date(2026, 8, 19, 20, 30), at7_45).getTime()).toBe(new Date(2026, 8, 20, 0, 0).getTime());
      expect(nextStretchCheckAt(new Date(2026, 8, 16, 12, 0), at7_45).getTime()).toBe(new Date(2026, 8, 17, 0, 0).getTime());
    });
  });
});
