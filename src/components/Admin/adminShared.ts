import type { AdminUserRow } from "../../utils/useAdmin";
import type { AdminUserDetail } from "../../utils/useAdminData";
import type { GameStats } from "../../utils/useGameStats";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { computeStreak, isRestDate, normalizePace, paceLabel } from "../../utils/useLearningProgress";
import { localDateStr } from "../../utils/localDate";

/* ============================================================
   Formatting
   ============================================================ */

export function fullName(u: { firstName: string | null; lastName: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T00:00:00") : new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Whole days from a date (YYYY-MM-DD or ISO) to today, local time. */
export function daysSince(date: string | null, today = localDateStr()): number | null {
  if (!date) return null;
  const day = date.slice(0, 10);
  const ms = new Date(today + "T00:00:00").getTime() - new Date(day + "T00:00:00").getTime();
  return Number.isNaN(ms) ? null : Math.round(ms / 86_400_000);
}

export function agoLabel(date: string | null, today = localDateStr()): string {
  const n = daysSince(date, today);
  if (n === null) return "Never";
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  return `${n} days ago`;
}

/** "Berachot 3:2" — the next mishnah Daily Limmud gives at this position. */
export function positionLabel(position: number | null): string {
  if (position === null || position < 0) return "—";
  if (position >= MISHNA_SEQUENCE.length) return "Finished Shas";
  const item = MISHNA_SEQUENCE[position];
  return `${item.masechetEn} ${item.perek}:${item.mishnah}`;
}

export function paceText(raw: unknown): string {
  return raw === null || raw === undefined ? "—" : paceLabel(normalizePace(raw));
}

/* ============================================================
   One user's learning, from admin_user_detail
   ============================================================ */

export function streakFor(detail: AdminUserDetail, today = localDateStr()): { current: number; longest: number } {
  const active = new Set([...detail.days.map((d) => d.date), ...detail.frozenDates]);
  return computeStreak(active, today, isRestDate);
}

/** Mishnayot per day for the last `n` days, oldest first, zeros filled in. */
export function lastDays(detail: AdminUserDetail, n: number, today = localDateStr()): { date: string; value: number }[] {
  const byDate = new Map(detail.days.map((d) => [d.date, d.count]));
  return fillDates(n, today).map((date) => ({ date, value: byDate.get(date) ?? 0 }));
}

export function fillDates(n: number, today = localDateStr()): string[] {
  const out: string[] = [];
  const base = new Date(today + "T00:00:00");
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(localDateStr(d));
  }
  return out;
}

/** The Monday of each of the last `n` weeks, oldest first — the same
    week start Postgres's date_trunc('week') uses. */
export function fillWeeks(n: number, today = localDateStr()): string[] {
  const base = new Date(today + "T00:00:00");
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(monday.getDate() - i * 7);
    out.push(localDateStr(d));
  }
  return out;
}

/* ============================================================
   Users list — sort and filter
   ============================================================ */

export type UserSort = "joined" | "active" | "mishnayot" | "signin" | "name";
export type UserActivity = "all" | "week" | "quiet" | "never";
export type UserVia = "all" | "google" | "email";

export interface UserFilter {
  search: string;
  sort: UserSort;
  activity: UserActivity;
  via: UserVia;
  adminsOnly: boolean;
  unconfirmedOnly: boolean;
}

export const DEFAULT_USER_FILTER: UserFilter = {
  search: "",
  sort: "joined",
  activity: "all",
  via: "all",
  adminsOnly: false,
  unconfirmedOnly: false,
};

export function filterUsers(users: AdminUserRow[], f: UserFilter, today = localDateStr()): AdminUserRow[] {
  const needle = f.search.trim().toLowerCase();
  const out = users.filter((u) => {
    if (needle && ![u.email, u.username, fullName(u)].some((v) => (v ?? "").toLowerCase().includes(needle))) return false;
    if (f.via !== "all" && (u.signedUpVia === "google" ? "google" : "email") !== f.via) return false;
    if (f.adminsOnly && !u.isAdmin) return false;
    if (f.unconfirmedOnly && u.emailConfirmedAt) return false;
    const since = daysSince(u.lastLearnedDate, today);
    if (f.activity === "week" && (since === null || since > 6)) return false;
    if (f.activity === "quiet" && (since === null || since < 14)) return false;
    if (f.activity === "never" && since !== null) return false;
    return true;
  });
  const cmpDesc = (a: string | null, b: string | null) => (b ?? "").localeCompare(a ?? "");
  out.sort((a, b) => {
    switch (f.sort) {
      case "active":
        return cmpDesc(a.lastLearnedDate, b.lastLearnedDate);
      case "mishnayot":
        return b.mishnayotLearned - a.mishnayotLearned;
      case "signin":
        return cmpDesc(a.lastSignInAt, b.lastSignInAt);
      case "name":
        return (fullName(a) || a.username || a.email).localeCompare(fullName(b) || b.username || b.email);
      default:
        return cmpDesc(a.createdAt, b.createdAt);
    }
  });
  return out;
}

/* ============================================================
   CSV
   ============================================================ */

export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function usersCsvRows(users: AdminUserRow[]): (string | number | null)[][] {
  return [
    ["Name", "Username", "Email", "Signed up via", "Joined", "Last sign-in", "Email confirmed", "Last learned", "Mishnayot", "Daily Limmud up to", "Admin"],
    ...users.map((u) => [
      fullName(u),
      u.username,
      u.email,
      u.signedUpVia === "google" ? "Google" : "Email",
      u.createdAt.slice(0, 10),
      u.lastSignInAt?.slice(0, 10) ?? "",
      u.emailConfirmedAt ? "Yes" : "No",
      u.lastLearnedDate ?? "",
      u.mishnayotLearned,
      positionLabel(u.dailyLimmudPosition),
      u.isAdmin ? "Yes" : "No",
    ]),
  ];
}

/* ============================================================
   Games — one account's record for one game, in the shape both the
   Games list and the user drawer print. Seder Sort and Sidrei
   Hamishna have no score, only completions, so their "best" is null.
   ============================================================ */

export type GameId = "quiz" | "dash" | "chazara" | "sort" | "sidrei";

export interface GameLine {
  played: boolean;
  best: string | null;
  /** What the Games list sorts by, highest first. */
  rank: number;
  count: number;
  countLabel: string;
  today: string | null;
}

export const GAMES: { id: GameId; label: string; line: (s: GameStats, today: string) => GameLine }[] = [
  {
    id: "quiz",
    label: "Mishna Quiz",
    line: ({ quiz }, today) => {
      const t = quiz.today?.date === today ? quiz.today : null;
      return {
        played: quiz.timesPlayed > 0,
        best: `${quiz.bestScore}/${quiz.bestOutOf}`,
        rank: quiz.bestOutOf > 0 ? quiz.bestScore / quiz.bestOutOf : 0,
        count: quiz.timesPlayed,
        countLabel: plural(quiz.timesPlayed, "play", "plays"),
        today: t && `${t.bestScore}/${t.bestOutOf}${t.scope ? ` · ${t.scope}` : ""}`,
      };
    },
  },
  {
    id: "dash",
    label: "Shas Dash",
    line: ({ dash }, today) => ({
      played: dash.timesPlayed > 0,
      best: String(dash.bestScore),
      rank: dash.bestScore,
      count: dash.timesPlayed,
      countLabel: plural(dash.timesPlayed, "play", "plays"),
      today: dash.today?.date === today ? String(dash.today.bestScore) : null,
    }),
  },
  {
    id: "chazara",
    label: "Mishna Chazara",
    line: ({ chazara }, today) => {
      const t = chazara.today?.date === today ? chazara.today : null;
      return {
        played: chazara.timesPlayed > 0,
        best: `${chazara.bestCount} recalled`,
        rank: chazara.bestCount,
        count: chazara.timesPlayed,
        countLabel: plural(chazara.timesPlayed, "play", "plays"),
        today: t && `${t.bestCount} recalled${t.scope ? ` · ${t.scope}` : ""}`,
      };
    },
  },
  {
    id: "sort",
    label: "Seder Sort",
    line: ({ sort }, today) => ({
      played: sort.timesCompleted > 0 || sort.today?.date === today,
      best: null,
      rank: sort.timesCompleted,
      count: sort.timesCompleted,
      countLabel: "completed",
      today: sort.today?.date === today ? `${sort.today.placed}/${sort.today.total} placed` : null,
    }),
  },
  {
    id: "sidrei",
    label: "Sidrei Hamishna",
    line: ({ sidrei }, today) => ({
      played: sidrei.timesCompleted > 0 || sidrei.today?.date === today,
      best: null,
      rank: sidrei.timesCompleted,
      count: sidrei.timesCompleted,
      countLabel: "completed",
      today: sidrei.today?.date === today ? `${sidrei.today.placed}/${sidrei.today.total} placed` : null,
    }),
  },
];

export function gameSummary(l: GameLine): string {
  if (!l.played) return "—";
  const parts = l.best !== null ? [`Best ${l.best}`, l.countLabel] : [`${l.count} ${l.countLabel}`];
  if (l.today) parts.push(`today ${l.today}`);
  return parts.join(" · ");
}
