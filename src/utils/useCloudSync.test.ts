import { describe, expect, it } from "vitest";
import { mergeBlobs } from "./useCloudSync";

// One test per field-merge rule in mergeBlobs — each of these rules was
// a deliberate, non-obvious decision (see the doc comments in
// useCloudSync.tsx); a regression here would silently discard a real
// device's data on its next sign-in, the exact failure mode local-first
// sync exists to prevent.
describe("mergeBlobs", () => {
  it("completions: unions both sides by masechet.perek.mishnah, no duplicates", () => {
    const local = { completions: [{ masechetEn: "Berachot", perek: 1, mishnah: 1, date: "2026-01-01", source: "app" }] };
    const cloud = {
      completions: [
        { masechetEn: "Berachot", perek: 1, mishnah: 1, date: "2025-01-01", source: "app" }, // same item, older date
        { masechetEn: "Berachot", perek: 1, mishnah: 2, date: "2025-06-01", source: "app" },
      ],
    };
    const merged = mergeBlobs(local, cloud);
    expect(merged.completions).toHaveLength(2);
  });

  it("dailyLimmudPosition: takes the max of the two, never regresses", () => {
    expect(mergeBlobs({ dailyLimmudPosition: 40 }, { dailyLimmudPosition: 100 }).dailyLimmudPosition).toBe(100);
    expect(mergeBlobs({ dailyLimmudPosition: 100 }, { dailyLimmudPosition: 40 }).dailyLimmudPosition).toBe(100);
  });

  it("dailyLimmudPace: local wins when set, cloud fills in when local has none", () => {
    const localPace = { unit: "perakim", amount: 2 };
    const cloudPace = { unit: "mishnayot", amount: 1 };
    expect(mergeBlobs({ dailyLimmudPace: localPace }, { dailyLimmudPace: cloudPace }).dailyLimmudPace).toEqual(localPace);
    expect(mergeBlobs({}, { dailyLimmudPace: cloudPace }).dailyLimmudPace).toEqual(cloudPace);
  });

  it("streakFreezes: takes the max, so neither device's banked freezes are discarded", () => {
    expect(mergeBlobs({ streakFreezes: 1 }, { streakFreezes: 3 }).streakFreezes).toBe(3);
  });

  it("gameStats: per-game, takes the higher score and higher play count independently", () => {
    const local = { gameStats: { quiz: { best: 10, plays: 50 } } };
    const cloud = { gameStats: { quiz: { best: 20, plays: 5 }, dash: { best: 7, plays: 1 } } };
    const merged = mergeBlobs(local, cloud) as { gameStats: Record<string, Record<string, number>> };
    // Best score: cloud's higher score wins even though local has more plays.
    expect(merged.gameStats.quiz.best).toBe(20);
    // Play count: local's higher count wins independently of the score comparison.
    expect(merged.gameStats.quiz.plays).toBe(50);
    // A game only cloud has ever played still carries over.
    expect(merged.gameStats.dash).toEqual({ best: 7, plays: 1 });
  });

  it("reviewState: the more recently reviewed side wins that item outright", () => {
    const local = { reviewState: { "Berachot 1 1": { box: 2, nextReview: "2026-02-01", lastReviewed: "2026-01-01", timesReviewed: 2 } } };
    const cloud = { reviewState: { "Berachot 1 1": { box: 4, nextReview: "2026-03-01", lastReviewed: "2026-01-15", timesReviewed: 4 } } };
    const merged = mergeBlobs(local, cloud) as { reviewState: Record<string, { box: number }> };
    // Cloud's lastReviewed (01-15) is more recent than local's (01-01),
    // so cloud's box/schedule wins even though it's not the local device.
    expect(merged.reviewState["Berachot 1 1"].box).toBe(4);
  });

  it("showEnglish: cloud wins when present, so devices agree on the account's real answer", () => {
    expect(mergeBlobs({ showEnglish: false }, { showEnglish: true }).showEnglish).toBe(true);
    expect(mergeBlobs({ showEnglish: true }, { showEnglish: false }).showEnglish).toBe(false);
  });

  it("bottomBarIds: local wins when it has a real value, cloud fills in an empty local", () => {
    expect(mergeBlobs({ bottomBarIds: ["home", "review"] }, { bottomBarIds: ["home", "limmud"] }).bottomBarIds).toEqual([
      "home",
      "review",
    ]);
    expect(mergeBlobs({ bottomBarIds: [] }, { bottomBarIds: ["home", "limmud"] }).bottomBarIds).toEqual([
      "home",
      "limmud",
    ]);
  });

  it("perekNotes: per-key, local's non-empty value wins, cloud fills in what local is missing", () => {
    const local = { perekNotes: { "Berachot.1": "my note", "Berachot.2": "" } };
    const cloud = { perekNotes: { "Berachot.1": "old note", "Berachot.2": "cloud note", "Berachot.3": "cloud only" } };
    const merged = mergeBlobs(local, cloud) as { perekNotes: Record<string, string> };
    expect(merged.perekNotes["Berachot.1"]).toBe("my note");
    // Local's empty string doesn't overwrite cloud's real value.
    expect(merged.perekNotes["Berachot.2"]).toBe("cloud note");
    expect(merged.perekNotes["Berachot.3"]).toBe("cloud only");
  });
});
