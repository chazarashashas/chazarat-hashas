import { describe, expect, it } from "vitest";
import type { AdminUserRow } from "../../utils/useAdmin";
import { EMPTY_USER_DETAIL } from "../../utils/useAdminData";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import {
  DEFAULT_USER_FILTER,
  agoLabel,
  fillWeeks,
  filterUsers,
  lastDays,
  positionLabel,
  streakFor,
  toCsv,
} from "./adminShared";

function user(p: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: p.email ?? "x",
    email: "x@example.com",
    username: null,
    firstName: null,
    lastName: null,
    city: null,
    country: null,
    isAdmin: false,
    createdAt: "2026-01-01T00:00:00Z",
    mishnayotLearned: 0,
    signedUpVia: "email",
    lastSignInAt: null,
    emailConfirmedAt: "2026-01-01T00:00:00Z",
    lastLearnedDate: null,
    dailyLimmudPosition: null,
    ...p,
  };
}

const TODAY = "2026-09-16";

describe("admin users list", () => {
  const users = [
    user({ email: "recent@x.org", lastLearnedDate: "2026-09-15", mishnayotLearned: 5, createdAt: "2026-09-01T00:00:00Z" }),
    user({ email: "quiet@x.org", lastLearnedDate: "2026-08-20", mishnayotLearned: 90, signedUpVia: "google" }),
    user({ email: "never@x.org", emailConfirmedAt: null, createdAt: "2026-09-10T00:00:00Z" }),
  ];

  it("filters by activity", () => {
    const ids = (activity: typeof DEFAULT_USER_FILTER.activity) =>
      filterUsers(users, { ...DEFAULT_USER_FILTER, activity }, TODAY).map((u) => u.email);
    expect(ids("week")).toEqual(["recent@x.org"]);
    expect(ids("quiet")).toEqual(["quiet@x.org"]);
    expect(ids("never")).toEqual(["never@x.org"]);
  });

  it("sorts by the chosen measure", () => {
    const by = (sort: typeof DEFAULT_USER_FILTER.sort) =>
      filterUsers(users, { ...DEFAULT_USER_FILTER, sort }, TODAY).map((u) => u.email);
    expect(by("mishnayot")[0]).toBe("quiet@x.org");
    expect(by("active")).toEqual(["recent@x.org", "quiet@x.org", "never@x.org"]);
    expect(by("joined")[0]).toBe("never@x.org");
  });

  it("filters by sign-up route and unconfirmed email", () => {
    expect(filterUsers(users, { ...DEFAULT_USER_FILTER, via: "google" }, TODAY).map((u) => u.email)).toEqual(["quiet@x.org"]);
    expect(filterUsers(users, { ...DEFAULT_USER_FILTER, unconfirmedOnly: true }, TODAY).map((u) => u.email)).toEqual([
      "never@x.org",
    ]);
  });
});

describe("admin formatting", () => {
  it("names the Daily Limmud position by its mishnah", () => {
    expect(positionLabel(0)).toBe(`${MISHNA_SEQUENCE[0].masechetEn} 1:1`);
    expect(positionLabel(MISHNA_SEQUENCE.length)).toBe("Finished Shas");
    expect(positionLabel(null)).toBe("—");
  });

  it("says how long ago, in words", () => {
    expect(agoLabel("2026-09-16", TODAY)).toBe("Today");
    expect(agoLabel("2026-09-15T20:00:00Z", TODAY)).toBe("Yesterday");
    expect(agoLabel("2026-09-06", TODAY)).toBe("10 days ago");
    expect(agoLabel(null, TODAY)).toBe("Never");
  });

  it("weeks start on Monday, like Postgres's date_trunc('week')", () => {
    const weeks = fillWeeks(3, TODAY); // a Wednesday
    expect(weeks).toEqual(["2026-08-31", "2026-09-07", "2026-09-14"]);
  });

  it("fills missing days with zero and computes the streak across Shabbat", () => {
    const detail = {
      ...EMPTY_USER_DETAIL,
      days: [
        { date: "2026-09-16", count: 2 },
        { date: "2026-09-15", count: 1 },
        { date: "2026-09-11", count: 3 },
      ],
    };
    expect(lastDays(detail, 3, TODAY)).toEqual([
      { date: "2026-09-14", value: 0 },
      { date: "2026-09-15", value: 1 },
      { date: "2026-09-16", value: 2 },
    ]);
    // 9/12–13 are Rosh Hashana (held, not broken), but Monday 9/14 was
    // missed, so the streak is just Tuesday and Wednesday.
    expect(streakFor(detail, TODAY).current).toBe(2);
  });

  it("escapes quotes in CSV", () => {
    expect(toCsv([["a", 'say "hi"', null]])).toBe('"a","say ""hi""",""');
  });
});
