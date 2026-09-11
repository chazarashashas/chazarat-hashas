import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { computeStreak, isRestDate, useLearningProgress } from "./useLearningProgress";

const PREFIX = "chazarat-hashas:";

function seedCompletions(dates: string[]) {
  const completions = dates.map((date, i) => ({
    masechetEn: "Berachot",
    perek: 1,
    mishnah: i + 1,
    date,
    source: "app" as const,
  }));
  localStorage.setItem(PREFIX + "completions", JSON.stringify(completions));
}

function setToday(iso: string) {
  vi.setSystemTime(new Date(iso + "T12:00:00.000Z"));
}

describe("useLearningProgress streak", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts a run of consecutive days ending today", () => {
    setToday("2026-01-05");
    seedCompletions(["2026-01-03", "2026-01-04", "2026-01-05"]);
    const { result } = renderHook(() => useLearningProgress());
    expect(result.current.streak.current).toBe(3);
  });

  it("still counts as current when the last activity was yesterday, not today", () => {
    // A day isn't "missed" until it's fully passed — so on day N+1
    // before you've learned anything yet, yesterday's streak still
    // reads as live, not broken.
    setToday("2026-01-05");
    seedCompletions(["2026-01-03", "2026-01-04"]);
    const { result } = renderHook(() => useLearningProgress());
    expect(result.current.streak.current).toBe(2);
  });

  it("breaks once a full day has passed with nothing learned and no freeze", () => {
    setToday("2026-01-06"); // two days after the last completion
    seedCompletions(["2026-01-03", "2026-01-04"]);
    const { result } = renderHook(() => useLearningProgress());
    expect(result.current.streak.current).toBe(0);
  });

  it("a gap in the middle of the run caps the current streak at the unbroken tail", () => {
    setToday("2026-01-05");
    seedCompletions(["2026-01-01", "2026-01-04", "2026-01-05"]); // Jan 2-3 missing
    const { result } = renderHook(() => useLearningProgress());
    expect(result.current.streak.current).toBe(2);
    expect(result.current.streak.longest).toBe(2);
  });

  it("longest tracks the best run even after the current streak has broken", () => {
    setToday("2026-01-10");
    seedCompletions(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"]);
    const { result } = renderHook(() => useLearningProgress());
    expect(result.current.streak.current).toBe(0);
    expect(result.current.streak.longest).toBe(5);
  });

  it("markTodayLearned advances position and records today's date", async () => {
    setToday("2026-01-05");
    localStorage.setItem(PREFIX + "dailyLimmudPosition", "0");
    const { result } = renderHook(() => useLearningProgress());
    const startingPosition = result.current.position;
    await act(async () => {
      result.current.markTodayLearned();
    });
    expect(result.current.position).toBeGreaterThan(startingPosition);
    expect(result.current.completions.some((c) => c.date === "2026-01-05")).toBe(true);
  });
});

describe("streak across Shabbat and yom tov", () => {
  const streak = (dates: string[], today: string) => computeStreak(new Set(dates), today, isRestDate);

  it("holds through Rosh Hashana 5787 — Shabbat and Sunday — without counting them", () => {
    // Wed–Fri learned, then two days of yom tov, back on Monday.
    expect(streak(["2026-09-09", "2026-09-10", "2026-09-11"], "2026-09-14").current).toBe(3);
    expect(streak(["2026-09-09", "2026-09-10", "2026-09-11", "2026-09-14"], "2026-09-14").current).toBe(4);
  });

  it("holds through an ordinary Shabbat, every week", () => {
    expect(streak(["2026-09-17", "2026-09-18", "2026-09-20"], "2026-09-20").current).toBe(3);
    expect(streak(["2026-09-17", "2026-09-18", "2026-09-20"], "2026-09-20").longest).toBe(3);
  });

  it("still breaks on an ordinary weekday with nothing learned", () => {
    expect(streak(["2026-09-15", "2026-09-17"], "2026-09-17").current).toBe(1);
  });
});
