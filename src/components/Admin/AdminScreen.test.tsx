// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { normalizeGameStats } from "../../utils/useGameStats";
import { localDateStr } from "../../utils/localDate";
import { EMPTY_USER_DETAIL } from "../../utils/useAdminData";

const today = localDateStr();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
};

const base = {
  lastName: null,
  city: null,
  country: null,
  isAdmin: false,
  createdAt: "2026-01-01T00:00:00Z",
  signedUpVia: "email",
  lastSignInAt: null,
  emailConfirmedAt: "2026-01-01T00:00:00Z",
  dailyLimmudPosition: 0,
};
const users = [
  { ...base, id: "a", email: "avi@example.com", username: "avi", firstName: "Avi", mishnayotLearned: 3, lastLearnedDate: today },
  { ...base, id: "b", email: "beni@example.com", username: "beni", firstName: "Beni", mishnayotLearned: 9, lastLearnedDate: daysAgo(20) },
  { ...base, id: "c", email: "chaim@example.com", username: "chaim", firstName: "Chaim", mishnayotLearned: 0, lastLearnedDate: null },
];

const byUser = new Map([
  ["a", normalizeGameStats({ dash: { timesPlayed: 4, bestScore: 12, today: { date: today, bestScore: 7 } }, quiz: { timesPlayed: 2, bestScore: 9, bestOutOf: 10, today: null } })],
  ["b", normalizeGameStats({ dash: { timesPlayed: 1, bestScore: 30, today: null } })],
]);

const siyumim = [
  { id: "s1", dedication: "Ploni ben Ploni", occasion: "Yahrzeit", targetDate: null, visibility: "public", shareSlug: "abc", createdAt: "2026-08-01T00:00:00Z", ownerId: "b", ownerEmail: "beni@example.com", ownerName: "Beni", learned: 10, taken: 3, stale: 2 },
  { id: "s2", dedication: "Almoni bat Almoni", occasion: null, targetDate: null, visibility: "private", shareSlug: "def", createdAt: "2026-09-01T00:00:00Z", ownerId: "a", ownerEmail: "avi@example.com", ownerName: "Avi", learned: 0, taken: 0, stale: 0 },
];

const adminAction = vi.fn(async () => null as string | null);
const logAdminAction = vi.fn(async () => {});
const refresh = () => {};

vi.mock("../../utils/adminRpc", () => ({ adminAction: (...a: unknown[]) => adminAction(...(a as [])), ADMIN_SQL_MISSING: "" }));
vi.mock("../../utils/useAdmin", () => ({
  useAdmin: () => ({ overview: null, users, loading: false, error: null, refresh }),
}));
vi.mock("../../utils/useAdminActivityGrid", () => ({
  useAdminActivityGrid: () => ({ students: [], submissions: [], loading: false, error: null }),
}));
vi.mock("../../utils/useAdminAudit", () => ({
  useAdminAudit: () => ({ entries: [], loading: false, error: null, refresh }),
  logAdminAction: (...a: unknown[]) => logAdminAction(...(a as [])),
  auditActionLabel: (a: string) => a,
  AUDIT_ACTIONS: ["reset_user_data"],
}));
vi.mock("../../utils/useAdminGroups", () => ({
  useAdminGroups: () => ({
    groups: [{ id: "g1", name: "Shiur Aleph", masechetEn: "Berachot", isChabura: true, isClass: true, createdAt: "2026-01-01T00:00:00Z", memberCount: 2, teacherEmail: "avi@example.com", joinCode: "ABC234", pendingInvites: 1, lastSubmission: null, archivedAt: null }],
    loading: false,
    error: null,
    refresh,
  }),
  useAdminGroupMembers: () => ({ members: [], loading: false, error: null }),
}));
vi.mock("../../utils/useAdminGameStats", () => ({
  useAdminGameStats: () => ({ byUser, loading: false, error: null, refresh }),
}));
vi.mock("../../utils/useAdminData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/useAdminData")>();
  const rpc = <T,>(data: T) => ({ data, loading: false, error: null, refresh });
  return {
    ...actual,
    useAdminSiyumim: () => rpc(siyumim),
    useAdminUserDetail: () =>
      rpc({
        ...actual.EMPTY_USER_DETAIL,
        days: [
          { date: daysAgo(1), count: 1 },
          { date: today, count: 2 },
        ],
        groups: [{ id: "g1", name: "Shiur Aleph", masechetEn: "Berachot", isChabura: true, isClass: true, role: "teacher", joinedAt: null, archived: false }],
        claims: [{ id: "c1", siyumId: "s1", dedication: "Ploni ben Ploni", masechetEn: "Peah", perek: 3, learned: false, claimedAt: "2026-08-01T00:00:00Z", learnedAt: null }],
      }),
    useAdminSiyumClaims: () =>
      rpc([{ id: "cl1", masechetEn: "Peah", perek: 1, name: "Chaim", email: "chaim@example.com", userId: null, anonymous: false, learned: false, claimedAt: "2026-07-01T00:00:00Z", learnedAt: null }]),
    useAdminGroupDetail: () => rpc({ invites: [], submissions: [] }),
    useAdminGrowth: () =>
      rpc({
        usersTotal: 3, googleTotal: 1, signupsByWeek: [], activeByDay: [{ date: today, users: 2, mishnayot: 5 }],
        activeToday: 2, activeWeek: 2, activeMonth: 3, mishnayotWeek: 5, mishnayotPrevWeek: 2, mishnayotTotal: 40,
        topMasechtot: [{ masechetEn: "Berachot", mishnayot: 30, learners: 2 }], gamePlays: { quiz: 2, dash: 5, chazara: 0, sort: 1, sidrei: 0 },
      }),
    useAdminContent: () =>
      rpc({
        notes: [{ id: "n1", body: "A note to remove", createdAt: "2026-09-01T00:00:00Z", authorId: "b", authorEmail: "beni@example.com", authorName: "Beni", groupId: "g1", groupName: "Shiur Aleph", masechetEn: "Berachot", perek: 1, mishnah: 1 }],
        comments: [],
        names: [],
      }),
    useAdminAnnouncement: () => rpc({ message: "", active: false, updatedAt: "2026-09-01T00:00:00Z" }),
  };
});
vi.mock("../../utils/useAuth", () => ({
  useAuth: () => ({ session: { user: { id: "a" } }, adminDeleteUser: async () => null }),
}));

const { AdminScreen } = await import("./AdminScreen");

beforeEach(() => {
  adminAction.mockClear();
  logAdminAction.mockClear();
});
afterEach(cleanup);

function openSection(name: string) {
  render(<AdminScreen />);
  fireEvent.click(screen.getByRole("tab", { name }));
}

describe("Admin panel", () => {
  it("ranks everyone who played the chosen game by best score", () => {
    openSection("Games");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dash" } });
    const names = screen.getAllByText(/^(Avi|Beni|Chaim)$/).map((n) => n.textContent);
    expect(names).toEqual(["Beni", "Avi"]);
    expect(screen.getByText("avi@example.com · today 7")).toBeTruthy();
  });

  it("finds people who have gone quiet", () => {
    openSection("Users");
    fireEvent.change(screen.getByLabelText("Activity"), { target: { value: "quiet" } });
    expect(screen.getAllByText(/^(Avi|Beni|Chaim)$/).map((n) => n.textContent)).toEqual(["Beni"]);
    expect(screen.getByText("1 user")).toBeTruthy();
  });

  it("shows a user's streak, chaburos and siyum perakim, and makes them admin", async () => {
    openSection("Users");
    fireEvent.click(screen.getByText("Beni"));
    const drawer = within(screen.getByRole("dialog", { name: "User" }));
    expect(drawer.getByText("2 days · best 2")).toBeTruthy();
    expect(drawer.getByText("Shiur Aleph")).toBeTruthy();
    expect(drawer.getByText("Peah 3")).toBeTruthy();
    fireEvent.click(drawer.getByText("Make admin"));
    fireEvent.click(screen.getAllByRole("button", { name: "Make admin" }).at(-1)!);
    await waitFor(() => expect(adminAction).toHaveBeenCalledWith("admin_set_admin", { p_user_id: "b", p_is_admin: true }));
    await waitFor(() => expect(logAdminAction).toHaveBeenCalledWith("grant_admin", { id: "b", email: "beni@example.com" }));
  });

  it("lists siyumim needing attention and releases a waiting perek", async () => {
    openSection("Siyumim");
    fireEvent.click(screen.getByRole("button", { name: "Perakim waiting 30+ days" }));
    expect(screen.queryByText("Almoni bat Almoni")).toBeNull();
    fireEvent.click(screen.getByText("Ploni ben Ploni"));
    const drawer = within(screen.getByRole("dialog", { name: "Siyum" }));
    fireEvent.click(drawer.getByRole("button", { name: "Release" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Release" }).at(-1)!);
    await waitFor(() => expect(adminAction).toHaveBeenCalledWith("admin_release_claim", { p_claim_id: "cl1" }));
  });

  it("deletes a chabura note", async () => {
    openSection("Moderation");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => expect(adminAction).toHaveBeenCalledWith("admin_delete_group_note", { p_note_id: "n1" }));
  });

  it("switches on an announcement for everyone", async () => {
    openSection("Message");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Chag sameach" } });
    fireEvent.click(screen.getByLabelText("Show it at the top of the app for everyone"));
    expect(screen.getByRole("status").textContent).toContain("Chag sameach");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(adminAction).toHaveBeenCalledWith("admin_set_announcement", { p_message: "Chag sameach", p_active: true }),
    );
  });

  it("shows growth numbers and the charts", () => {
    openSection("Growth");
    expect(screen.getByText("learned today")).toBeTruthy();
    expect(screen.getByText("+3 vs last week")).toBeTruthy();
    expect(screen.getByText("Sign-ups per week · last 26 weeks")).toBeTruthy();
    expect(screen.getByText("Berachot")).toBeTruthy();
  });
});

void EMPTY_USER_DETAIL;
