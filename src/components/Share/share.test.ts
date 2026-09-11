// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { all63Moment, bestMoment, masechetMoment, numberWords, sederMoment, streakMoment, PASSUK } from "./shareMoments";
import { dismissPrompt, markFirstSeen, pickPrompt, recordPromptShown } from "./sharePrompts";

describe("status text", () => {
  it("matches the brief, Hebrew first", () => {
    expect(streakMoment(30).status).toEqual([PASSUK, "Thirty days of daily Mishna.", "Come join me in our daily learning — chazarashashas.org"]);
    expect(bestMoment("dash", 41).status[1]).toBe("If I can place 41 masechtot, so can you.");
    expect(all63Moment().status).toEqual([PASSUK, "All 63 masechtot, each in its own seder.", "If I can do it, so can you — chazarashashas.org"]);
    expect(masechetMoment("Berachot", 1).status).toEqual(["סיום מסכת ברכות", "One of the 63 — Peah next.", "Come learn it along with me — chazarashashas.org"]);
    expect(sederMoment("zeraim").status).toEqual(["הֲדַרָן עֲלָךְ סֵדֶר זְרָעִים", "Eleven masechtot, 655 mishnayot.", "Learn with us — chazarashashas.org"]);
  });

  it("never asks anyone to beat a number or names an absence", () => {
    const all = [streakMoment(7), streakMoment(365), bestMoment("quiz", 9, 10), bestMoment("chazara", 51), all63Moment(), masechetMoment("Peah", 2), sederMoment("taharot")];
    for (const m of all) {
      const text = [...m.status, m.bannerHead, m.bannerBody].join(" ").toLowerCase();
      expect(text).not.toMatch(/beat|rank|without|no misses|wrong|%/);
    }
  });

  it("spells numbers", () => {
    expect(numberWords(365)).toBe("three hundred and sixty-five");
    expect(numberWords(180)).toBe("a hundred and eighty");
  });
});

describe("prompt rules", () => {
  beforeEach(() => localStorage.clear());

  it("never prompts on a first visit", () => {
    markFirstSeen("2026-09-20");
    expect(pickPrompt([streakMoment(30)], "2026-09-20")).toBeNull();
  });

  it("lets the heavier moment win, once a day, never the same type within a week", () => {
    markFirstSeen("2026-09-01");
    const chosen = pickPrompt([bestMoment("dash", 41), sederMoment("zeraim"), streakMoment(30)], "2026-09-20")!;
    expect(chosen.type).toBe("seder");
    recordPromptShown(chosen.type, "2026-09-20");
    expect(pickPrompt([streakMoment(30)], "2026-09-20")).toBeNull();
    expect(pickPrompt([sederMoment("moed")], "2026-09-24")).toBeNull();
    expect(pickPrompt([sederMoment("moed")], "2026-09-27")?.type).toBe("seder");
  });

  it("quiets a dismissed type for 30 days", () => {
    markFirstSeen("2026-09-01");
    dismissPrompt("best", "2026-09-20");
    expect(pickPrompt([bestMoment("dash", 50)], "2026-10-19")).toBeNull();
    expect(pickPrompt([bestMoment("dash", 50)], "2026-10-20")?.type).toBe("best");
  });
});
