import { useAdminRpc } from "./adminRpc";

/* ============================================================
   Shapes returned by admin_panel_v2_schema.sql, and one hook per
   function. Mappers are forgiving: a missing field reads as empty
   rather than throwing, so one odd row can't blank the panel.
   ============================================================ */

type Row = Record<string, unknown>;

const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

/* ---------- One user ---------- */

export interface AdminUserGroup {
  id: string;
  name: string | null;
  masechetEn: string;
  isChabura: boolean;
  isClass: boolean;
  role: string;
  joinedAt: string | null;
  archived: boolean;
}

export interface AdminUserClaim {
  id: string;
  siyumId: string;
  dedication: string;
  masechetEn: string;
  perek: number;
  learned: boolean;
  claimedAt: string;
  learnedAt: string | null;
}

export interface AdminUserDetail {
  days: { date: string; count: number }[];
  masechtot: { masechetEn: string; count: number }[];
  frozenDates: string[];
  dailyLimmudPace: unknown;
  groups: AdminUserGroup[];
  claims: AdminUserClaim[];
  siyumim: { id: string; dedication: string; createdAt: string }[];
}

export const EMPTY_USER_DETAIL: AdminUserDetail = {
  days: [],
  masechtot: [],
  frozenDates: [],
  dailyLimmudPace: null,
  groups: [],
  claims: [],
  siyumim: [],
};

export function mapUserDetail(raw: unknown): AdminUserDetail {
  const d = (raw ?? {}) as Row;
  return {
    days: arr(d.days).map((x) => ({ date: str(x.date) ?? "", count: num(x.count) })).filter((x) => x.date),
    masechtot: arr(d.masechtot).map((x) => ({ masechetEn: str(x.masechetEn) ?? "—", count: num(x.count) })),
    frozenDates: Array.isArray(d.frozenDates) ? (d.frozenDates as unknown[]).filter((x): x is string => typeof x === "string") : [],
    dailyLimmudPace: d.dailyLimmudPace ?? null,
    groups: arr(d.groups).map((g) => ({
      id: str(g.id) ?? "",
      name: str(g.name),
      masechetEn: str(g.masechetEn) ?? "",
      isChabura: Boolean(g.isChabura),
      isClass: Boolean(g.isClass),
      role: str(g.role) ?? "member",
      joinedAt: str(g.joinedAt),
      archived: Boolean(g.archived),
    })),
    claims: arr(d.claims).map((c) => ({
      id: str(c.id) ?? "",
      siyumId: str(c.siyumId) ?? "",
      dedication: str(c.dedication) ?? "",
      masechetEn: str(c.masechetEn) ?? "",
      perek: num(c.perek),
      learned: Boolean(c.learned),
      claimedAt: str(c.claimedAt) ?? "",
      learnedAt: str(c.learnedAt),
    })),
    siyumim: arr(d.siyumim).map((s) => ({
      id: str(s.id) ?? "",
      dedication: str(s.dedication) ?? "",
      createdAt: str(s.createdAt) ?? "",
    })),
  };
}

export function useAdminUserDetail(userId: string | null) {
  return useAdminRpc("admin_user_detail", userId ? { p_user_id: userId } : null, mapUserDetail, EMPTY_USER_DETAIL);
}

/* ---------- Growth ---------- */

export interface AdminGrowth {
  usersTotal: number;
  googleTotal: number;
  signupsByWeek: { week: string; google: number; email: number }[];
  activeByDay: { date: string; users: number; mishnayot: number }[];
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  mishnayotWeek: number;
  mishnayotPrevWeek: number;
  mishnayotTotal: number;
  topMasechtot: { masechetEn: string; mishnayot: number; learners: number }[];
  gamePlays: Record<"quiz" | "dash" | "chazara" | "sort" | "sidrei", number>;
}

export function mapGrowth(raw: unknown): AdminGrowth | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Row;
  const plays = (g.gamePlays ?? {}) as Row;
  return {
    usersTotal: num(g.usersTotal),
    googleTotal: num(g.googleTotal),
    signupsByWeek: arr(g.signupsByWeek).map((w) => ({ week: str(w.week) ?? "", google: num(w.google), email: num(w.email) })),
    activeByDay: arr(g.activeByDay).map((a) => ({ date: str(a.date) ?? "", users: num(a.users), mishnayot: num(a.mishnayot) })),
    activeToday: num(g.activeToday),
    activeWeek: num(g.activeWeek),
    activeMonth: num(g.activeMonth),
    mishnayotWeek: num(g.mishnayotWeek),
    mishnayotPrevWeek: num(g.mishnayotPrevWeek),
    mishnayotTotal: num(g.mishnayotTotal),
    topMasechtot: arr(g.topMasechtot).map((t) => ({
      masechetEn: str(t.masechetEn) ?? "—",
      mishnayot: num(t.mishnayot),
      learners: num(t.learners),
    })),
    gamePlays: {
      quiz: num(plays.quiz),
      dash: num(plays.dash),
      chazara: num(plays.chazara),
      sort: num(plays.sort),
      sidrei: num(plays.sidrei),
    },
  };
}

export function useAdminGrowth(enabled: boolean) {
  return useAdminRpc("admin_growth", enabled ? {} : null, mapGrowth, null);
}

/* ---------- Siyumim ---------- */

export interface AdminSiyum {
  id: string;
  dedication: string;
  occasion: string | null;
  targetDate: string | null;
  visibility: "public" | "private";
  shareSlug: string;
  createdAt: string;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  learned: number;
  taken: number;
  /** Taken more than 30 days ago and still not learned. */
  stale: number;
}

export function mapSiyumim(raw: unknown): AdminSiyum[] {
  return arr(raw).map((s) => ({
    id: str(s.id) ?? "",
    dedication: str(s.dedication) ?? "",
    occasion: str(s.occasion),
    targetDate: str(s.targetDate),
    visibility: s.visibility === "private" ? "private" : "public",
    shareSlug: str(s.shareSlug) ?? "",
    createdAt: str(s.createdAt) ?? "",
    ownerId: str(s.ownerId),
    ownerEmail: str(s.ownerEmail),
    ownerName: str(s.ownerName),
    learned: num(s.learned),
    taken: num(s.taken),
    stale: num(s.stale),
  }));
}

export function useAdminSiyumim(enabled: boolean) {
  return useAdminRpc("admin_list_siyumim", enabled ? {} : null, mapSiyumim, []);
}

export interface AdminClaim {
  id: string;
  masechetEn: string;
  perek: number;
  name: string | null;
  email: string | null;
  userId: string | null;
  anonymous: boolean;
  learned: boolean;
  claimedAt: string;
  learnedAt: string | null;
}

export function mapClaims(raw: unknown): AdminClaim[] {
  return arr(raw).map((c) => ({
    id: str(c.id) ?? "",
    masechetEn: str(c.masechetEn) ?? "",
    perek: num(c.perek),
    name: str(c.name),
    email: str(c.email),
    userId: str(c.userId),
    anonymous: Boolean(c.anonymous),
    learned: Boolean(c.learned),
    claimedAt: str(c.claimedAt) ?? "",
    learnedAt: str(c.learnedAt),
  }));
}

export function useAdminSiyumClaims(siyumId: string | null) {
  return useAdminRpc("admin_siyum_claims", siyumId ? { p_siyum_id: siyumId } : null, mapClaims, []);
}

/* ---------- One chabura ---------- */

export interface AdminInvite {
  id: string;
  email: string;
  status: string;
  createdAt: string | null;
}

export interface AdminGroupSubmission {
  userId: string;
  email: string | null;
  firstName: string | null;
  username: string | null;
  date: string;
  sentAt: string | null;
  activities: { label: string; figure: string }[];
}

export interface AdminGroupDetail {
  invites: AdminInvite[];
  submissions: AdminGroupSubmission[];
}

export function mapGroupDetail(raw: unknown): AdminGroupDetail {
  const d = (raw ?? {}) as Row;
  return {
    invites: arr(d.invites).map((i) => ({
      id: str(i.id) ?? "",
      email: str(i.invited_email) ?? "",
      status: str(i.status) ?? "pending",
      createdAt: str(i.created_at),
    })),
    submissions: arr(d.submissions).map((s) => {
      const payload = (s.payload ?? {}) as Row;
      return {
        userId: str(s.userId) ?? "",
        email: str(s.email),
        firstName: str(s.firstName),
        username: str(s.username),
        date: str(s.date) ?? "",
        sentAt: str(s.sentAt),
        activities: arr(payload.activities).map((a) => ({ label: str(a.label) ?? "", figure: str(a.figure) ?? "" })),
      };
    }),
  };
}

export function useAdminGroupDetail(groupId: string | null) {
  return useAdminRpc(
    "admin_group_detail",
    groupId ? { p_group_id: groupId } : null,
    mapGroupDetail,
    { invites: [], submissions: [] } as AdminGroupDetail,
  );
}

/* ---------- Moderation ---------- */

export interface AdminPost {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  groupId: string;
  groupName: string;
  masechetEn: string;
  perek: number;
  mishnah: number;
}

export interface AdminNameRow {
  userId: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface AdminContent {
  notes: AdminPost[];
  comments: AdminPost[];
  names: AdminNameRow[];
}

function mapPost(p: Row): AdminPost {
  return {
    id: str(p.id) ?? "",
    body: str(p.body) ?? "",
    createdAt: str(p.createdAt) ?? "",
    authorId: str(p.authorId),
    authorEmail: str(p.authorEmail),
    authorName: str(p.authorName),
    groupId: str(p.groupId) ?? "",
    groupName: str(p.groupName) ?? "",
    masechetEn: str(p.masechetEn) ?? "",
    perek: num(p.perek),
    mishnah: num(p.mishnah),
  };
}

export function mapContent(raw: unknown): AdminContent {
  const d = (raw ?? {}) as Row;
  return {
    notes: arr(d.notes).map(mapPost),
    comments: arr(d.comments).map(mapPost),
    names: arr(d.names).map((n) => ({
      userId: str(n.userId) ?? "",
      email: str(n.email),
      username: str(n.username),
      firstName: str(n.firstName),
      lastName: str(n.lastName),
      createdAt: str(n.createdAt) ?? "",
    })),
  };
}

export function useAdminContent(enabled: boolean) {
  return useAdminRpc("admin_recent_content", enabled ? { p_limit: 200 } : null, mapContent, {
    notes: [],
    comments: [],
    names: [],
  } as AdminContent);
}

/* ---------- The announcement ---------- */

export interface AdminAnnouncement {
  message: string;
  active: boolean;
  updatedAt: string | null;
}

export function mapAnnouncement(raw: unknown): AdminAnnouncement {
  const a = (raw ?? {}) as Row;
  return { message: str(a.message) ?? "", active: Boolean(a.active), updatedAt: str(a.updatedAt) };
}

export function useAdminAnnouncement(enabled: boolean) {
  return useAdminRpc("admin_get_announcement", enabled ? {} : null, mapAnnouncement, {
    message: "",
    active: false,
    updatedAt: null,
  } as AdminAnnouncement);
}
