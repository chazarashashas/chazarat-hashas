import { describe, expect, it } from "vitest";
import { computeStreak } from "./useLearningProgress";
import type { CompletionRecord } from "./useLearningProgress";

/** The streak reads only the dates of learning that happened on those
    days — the same filter useLearningProgress applies before calling
    computeStreak. */
function streakDates(completions: CompletionRecord[]): Set<string> {
  return new Set(completions.filter((c) => c.source !== "backfill").map((c) => c.date));
}

const never = () => false;

describe("learning backfilled from before the app", () => {
  const today = "2026-10-02";
  const backfilled: CompletionRecord[] = [
    { masechetEn: "Berachot", perek: 1, mishnah: 1, date: today, source: "backfill" },
    { masechetEn: "Berachot", perek: 1, mishnah: 2, date: today, source: "backfill" },
  ];

  it("starts no streak, however much of it there is", () => {
    expect(computeStreak(streakDates(backfilled), today, never)).toEqual({ current: 0, longest: 0 });
  });

  it("leaves a real day's learning counting as it did", () => {
    const withToday: CompletionRecord[] = [
      ...backfilled,
      { masechetEn: "Peah", perek: 1, mishnah: 1, date: today, source: "app" },
    ];
    expect(computeStreak(streakDates(withToday), today, never).current).toBe(1);
  });

  it("is still counted as learned — it just isn't counted as today", () => {
    // What the percentages read: every record, whatever its source.
    expect(backfilled.filter((c) => c.source === "backfill")).toHaveLength(2);
    expect(streakDates(backfilled).size).toBe(0);
  });
});
