import { describe, expect, it } from "vitest";
import { lastEndedStretch, longDayLabel, restDay, shortDayLabel, stretchFromErev, SHENI_TITLE } from "./chagCalendar";

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
});
