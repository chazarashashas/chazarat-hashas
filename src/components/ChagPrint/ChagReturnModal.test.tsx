// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { stretchFromErev } from "../../utils/chagCalendar";
import { ChagReturnModal } from "./ChagReturnModal";

const PREFIX = "chazarat-hashas:";
const at = (masechetEn: string, perek: number, mishnah: number) =>
  MISHNA_SEQUENCE.findIndex((m) => m.masechetEn === masechetEn && m.perek === perek && m.mishnah === mishnah);

describe("after Rosh Hashana 5787", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-14T09:00:00"));
    localStorage.setItem(PREFIX + "dailyLimmudPosition", JSON.stringify(at("Berachot", 4, 5)));
    localStorage.setItem(PREFIX + "dailyLimmudPace", JSON.stringify({ unit: "mishnayot", amount: 2 }));
    localStorage.setItem(
      PREFIX + "completions",
      JSON.stringify(["2026-09-09", "2026-09-10", "2026-09-11"].map((date, i) => ({ masechetEn: "Berachot", perek: 4, mishnah: i + 1, date, source: "app" }))),
    );
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const stretch = stretchFromErev("2026-09-11")!;

  it("says the streak is safe, then names the four that came due", () => {
    render(<ChagReturnModal stretch={stretch} onClose={() => {}} onCatchUp={() => {}} />);
    expect(screen.getByText("Your streak is safe")).toBeTruthy();
    expect(screen.getByText("Two days of Rosh Hashana · 3 days held")).toBeTruthy();
    expect(screen.getByText("Four mishnayot came due while you were away.")).toBeTruthy();
    expect(screen.getByText("Yes — mark all four learned")).toBeTruthy();
    expect(screen.getByText("Berachot 4:5, 4:6, 4:7 and 5:1")).toBeTruthy();
  });

  it("marks all four learned on the days they came due and moves on", () => {
    const onClose = vi.fn();
    render(<ChagReturnModal stretch={stretch} onClose={onClose} onCatchUp={() => {}} />);
    fireEvent.click(screen.getByText("Yes — mark all four learned"));
    const completions = JSON.parse(localStorage.getItem(PREFIX + "completions")!);
    expect(completions.filter((c: { date: string }) => c.date === "2026-09-12")).toHaveLength(2);
    expect(completions.filter((c: { date: string }) => c.date === "2026-09-13")).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(PREFIX + "dailyLimmudPosition")!)).toBe(at("Berachot", 5, 2));
    expect(onClose).toHaveBeenCalled();
  });

  it("catching up queues all four as one Daily Limmud portion", () => {
    const onCatchUp = vi.fn();
    render(<ChagReturnModal stretch={stretch} onClose={() => {}} onCatchUp={onCatchUp} />);
    fireEvent.click(screen.getByText("Not yet — let's catch up now"));
    expect(JSON.parse(localStorage.getItem(PREFIX + "catchUpEnd")!)).toBe(at("Berachot", 5, 1));
    expect(onCatchUp).toHaveBeenCalled();
  });
});
