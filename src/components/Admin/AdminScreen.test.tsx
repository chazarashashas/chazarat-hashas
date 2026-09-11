// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { normalizeGameStats } from "../../utils/useGameStats";
import { localDateStr } from "../../utils/localDate";

const today = localDateStr();

const users = [
  { id: "a", email: "avi@example.com", username: "avi", firstName: "Avi", lastName: null, city: null, country: null, isAdmin: false, createdAt: "2026-01-01T00:00:00Z", mishnayotLearned: 3, signedUpVia: "email" },
  { id: "b", email: "beni@example.com", username: "beni", firstName: "Beni", lastName: null, city: null, country: null, isAdmin: false, createdAt: "2026-01-02T00:00:00Z", mishnayotLearned: 9, signedUpVia: "google" },
  { id: "c", email: "chaim@example.com", username: "chaim", firstName: "Chaim", lastName: null, city: null, country: null, isAdmin: false, createdAt: "2026-01-03T00:00:00Z", mishnayotLearned: 0, signedUpVia: "email" },
];

const byUser = new Map([
  ["a", normalizeGameStats({ dash: { timesPlayed: 4, bestScore: 12, today: { date: today, bestScore: 7 } }, quiz: { timesPlayed: 2, bestScore: 9, bestOutOf: 10, today: null } })],
  ["b", normalizeGameStats({ dash: { timesPlayed: 1, bestScore: 30, today: null } })],
]);

vi.mock("../../utils/useAdmin", () => ({
  useAdmin: () => ({ overview: null, users, loading: false, error: null, refresh: () => {} }),
}));
vi.mock("../../utils/useAdminActivityGrid", () => ({
  useAdminActivityGrid: () => ({ students: [], submissions: [], loading: false, error: null }),
}));
vi.mock("../../utils/useAdminAudit", () => ({
  useAdminAudit: () => ({ entries: [], loading: false, error: null, refresh: () => {} }),
  logAdminAction: async () => {},
  auditActionLabel: (a: string) => a,
}));
vi.mock("../../utils/useAdminGroups", () => ({
  useAdminGroups: () => ({ groups: [], loading: false, error: null, refresh: () => {} }),
  useAdminGroupMembers: () => ({ members: [], loading: false, error: null }),
}));
vi.mock("../../utils/useAdminGameStats", () => ({
  useAdminGameStats: () => ({ byUser, loading: false, error: null, refresh: () => {} }),
}));
vi.mock("../../utils/useAuth", () => ({
  useAuth: () => ({ session: null, adminDeleteUser: async () => null }),
}));

const { AdminScreen } = await import("./AdminScreen");

afterEach(cleanup);

function openGames() {
  render(<AdminScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Games" }));
}

describe("Admin games", () => {
  it("ranks everyone who played the chosen game by best score", () => {
    openGames();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dash" } });
    const names = screen.getAllByText(/^(Avi|Beni|Chaim)$/).map((n) => n.textContent);
    expect(names).toEqual(["Beni", "Avi"]);
    expect(screen.getByText("avi@example.com · today 7")).toBeTruthy();
    expect(screen.getByText("best · 4 plays")).toBeTruthy();
  });

  it("says so when nobody has played a game", () => {
    openGames();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "sidrei" } });
    expect(screen.getByText("Nobody has played Sidrei Hamishna while signed in yet.")).toBeTruthy();
  });

  it("shows a user's games in their drawer", () => {
    openGames();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dash" } });
    fireEvent.click(screen.getByText("Avi"));
    const drawer = within(screen.getByRole("dialog", { name: "User" }));
    expect(drawer.getByText("Best 12 · 4 plays · today 7")).toBeTruthy();
    expect(drawer.getByText("Best 9/10 · 2 plays")).toBeTruthy();
    expect(drawer.getAllByText("—").length).toBeGreaterThan(0);
  });
});
