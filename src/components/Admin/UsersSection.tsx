import { useState } from "react";
import type { AdminUserRow } from "../../utils/useAdmin";
import { logAdminAction } from "../../utils/useAdminAudit";
import { localDateStr } from "../../utils/localDate";
import {
  DEFAULT_USER_FILTER,
  agoLabel,
  downloadCsv,
  filterUsers,
  fullName,
  plural,
  shortDate,
  usersCsvRows,
  type UserActivity,
  type UserFilter,
  type UserSort,
  type UserVia,
} from "./adminShared";

const SORTS: { value: UserSort; label: string }[] = [
  { value: "joined", label: "Newest first" },
  { value: "active", label: "Last learned" },
  { value: "signin", label: "Last sign-in" },
  { value: "mishnayot", label: "Most mishnayot" },
  { value: "name", label: "Name" },
];

const ACTIVITY: { value: UserActivity; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "week", label: "Learned this week" },
  { value: "quiet", label: "Quiet 14+ days" },
  { value: "never", label: "Never learned" },
];

const VIA: { value: UserVia; label: string }[] = [
  { value: "all", label: "Google or email" },
  { value: "google", label: "Google" },
  { value: "email", label: "Email" },
];

/** The figure on the right of a row follows the sort, so the list reads
    as an answer to the question the sort asks. */
function figureFor(u: AdminUserRow, sort: UserSort, today: string): { figure: string; label: string } {
  switch (sort) {
    case "active":
      return { figure: agoLabel(u.lastLearnedDate, today), label: "last learned" };
    case "signin":
      return { figure: agoLabel(u.lastSignInAt, today), label: "last sign-in" };
    case "joined":
      return { figure: shortDate(u.createdAt), label: "joined" };
    default:
      return { figure: String(u.mishnayotLearned), label: "mishnayot" };
  }
}

export function UsersSection({
  users,
  loading,
  onOpenUser,
}: {
  users: AdminUserRow[];
  loading: boolean;
  onOpenUser: (id: string) => void;
}) {
  const [filter, setFilter] = useState<UserFilter>(DEFAULT_USER_FILTER);
  const today = localDateStr();
  const shown = filterUsers(users, filter, today);
  const set = <K extends keyof UserFilter>(key: K, value: UserFilter[K]) => setFilter((f) => ({ ...f, [key]: value }));

  function exportCsv() {
    downloadCsv(`chazarat-hashas-users-${today}.csv`, usersCsvRows(shown));
    void logAdminAction("export_users", {}, { count: shown.length });
  }

  return (
    <>
      <label className="field">
        <span className="field__label">Find a user</span>
        <input
          className="field__input"
          value={filter.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Name, username or email"
        />
      </label>

      <div className="admin-filters">
        <label className="field">
          <span className="field__label">Sort</span>
          <select className="field__input" value={filter.sort} onChange={(e) => set("sort", e.target.value as UserSort)}>
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Activity</span>
          <select
            className="field__input"
            value={filter.activity}
            onChange={(e) => set("activity", e.target.value as UserActivity)}
          >
            {ACTIVITY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Signed up via</span>
          <select className="field__input" value={filter.via} onChange={(e) => set("via", e.target.value as UserVia)}>
            {VIA.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-toolbar">
        <label className="admin-check">
          <input type="checkbox" checked={filter.adminsOnly} onChange={(e) => set("adminsOnly", e.target.checked)} />
          Admins only
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={filter.unconfirmedOnly}
            onChange={(e) => set("unconfirmedOnly", e.target.checked)}
          />
          Email not confirmed
        </label>
        <span className="admin-toolbar__count">{plural(shown.length, "user", "users")}</span>
        <button className="btn btn--secondary btn--compact" onClick={exportCsv} disabled={shown.length === 0}>
          Export CSV
        </button>
      </div>

      {loading && users.length === 0 ? (
        <p className="state state--loading">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="state state--empty">No user matches that.</p>
      ) : (
        <div className="admin-rows">
          {shown.map((u) => {
            const { figure, label } = figureFor(u, filter.sort, today);
            return (
              <button key={u.id} className="card admin-row" onClick={() => onOpenUser(u.id)}>
                <span className="admin-row__main">
                  <span className="admin-row__name">{fullName(u) || u.username || "—"}</span>
                  <span className="admin-row__sub">
                    {u.email} · {u.lastLearnedDate ? `learned ${agoLabel(u.lastLearnedDate, today).toLowerCase()}` : "never learned"}
                  </span>
                </span>
                {!u.emailConfirmedAt && <span className="pill pill--compact admin-row__tag">Unconfirmed</span>}
                {u.isAdmin && <span className="pill pill--compact admin-row__tag">Admin</span>}
                <span className="admin-row__meta">
                  <span className="admin-row__figure">{figure}</span>
                  <span className="admin-row__figure-label">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
