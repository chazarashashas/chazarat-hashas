import { describe, expect, it } from "vitest";
import { Location, Zmanim } from "@hebcal/core";
import { nightfallFor } from "./nightfall";

const tzeit = (city: string, date: Date) => (new Zmanim(Location.lookup(city)!, date, false).tzeit(8.5) as Date).getTime();

describe("nightfall by time zone", () => {
  it("uses the latest nightfall among the zone's communities, never an early one", () => {
    const day = new Date(2026, 8, 12);
    const eastern = nightfallFor("2026-09-12", "America/New_York")!;
    for (const city of ["New York", "Boston", "Miami", "Cincinnati", "Atlanta", "Pittsburgh"]) {
      expect(eastern.getTime()).toBeGreaterThanOrEqual(tzeit(city, day));
    }
    // Motzei Shabbat, Sept 12 2026, Eastern time: after 19:50 in New York,
    // and within the hour after.
    expect(eastern.getTime()).toBeGreaterThan(tzeit("New York", day));
    expect(eastern.getTime() - tzeit("New York", day)).toBeLessThan(60 * 60_000);
  });

  it("knows Israel and aliases, and gives up on zones it has no community for", () => {
    const il = nightfallFor("2026-09-12", "Asia/Jerusalem");
    expect(il).not.toBeNull();
    expect(nightfallFor("2026-09-12", "Asia/Tel_Aviv")?.getTime()).toBe(il!.getTime());
    expect(nightfallFor("2026-09-12", "Asia/Hebron")?.getTime()).toBe(il!.getTime());
    expect(nightfallFor("2026-09-12", "Antarctica/Troll")).toBeNull();
    expect(nightfallFor("2026-09-12", null)).toBeNull();
  });
});
