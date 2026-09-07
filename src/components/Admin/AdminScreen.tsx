import { useState } from "react";
import { useAdmin } from "../../utils/useAdmin";
import { useAdminActivityGrid } from "../../utils/useAdminActivityGrid";
import { supabase } from "../../utils/supabase";
import { RebbeGrid } from "../RebbeDashboard/RebbeDashboardScreen";
import "../RebbeDashboard/RebbeDashboardScreen.css";
import "./AdminScreen.css";

const RESET_SCOPES = [
  { value: "daily_limmud", label: "Daily Limmud & streak" },
  { value: "perek_notes", label: "Perek Notes & notebook" },
  { value: "concepts", label: "Concepts to Review" },
  { value: "game_stats", label: "Practice game stats" },
  { value: "everything", label: "Everything" },
] as const;

/** A real modal, not an inline swap — the same deliberate-second-click
    guard as the self-service reset (see LoginScreen's ResetConfirmModal),
    since this one acts on someone else's account. */
function AdminResetConfirmModal({
  scopeLabel,
  email,
  busy,
  onConfirm,
  onCancel,
}: {
  scopeLabel: string;
  email: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="scrim" onClick={busy ? undefined : onCancel}>
      <div className="popup reset-confirm-popup" onClick={(e) => e.stopPropagation()}>
        <p className="popup__mark" aria-hidden="true">
          ↺
        </p>
        <p className="popup__text">
          Reset {scopeLabel} for {email}?
        </p>
        <p className="reset-confirm-popup__hint">This can't be undone.</p>
        <button className="restart reset-confirm-popup__confirm" disabled={busy} onClick={onConfirm}>
          {busy ? "Resetting…" : "Yes, reset"}
        </button>
        <button className="reset-confirm-popup__cancel" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** One user row's reset control — a scope picker plus its own modal
    confirm, since this calls admin_reset_user_data (see
    account_reset_schema.sql) on someone else's account. */
function AdminResetCell({ userId, email }: { userId: string; email: string }) {
  const [scope, setScope] = useState<string>(RESET_SCOPES[0].value);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_reset_user_data", { p_user_id: userId, p_scope: scope });
    setBusy(false);
    setConfirming(false);
    setMessage(error ? `Failed: ${error.message}` : "Reset.");
    window.setTimeout(() => setMessage(null), 4000);
  }

  if (message) return <span className="admin-reset__message">{message}</span>;

  return (
    <span className="admin-reset">
      <select className="admin-reset__select" value={scope} onChange={(e) => setScope(e.target.value)}>
        {RESET_SCOPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button className="admin-reset__btn" onClick={() => setConfirming(true)}>
        Reset
      </button>
      {confirming && (
        <AdminResetConfirmModal
          scopeLabel={RESET_SCOPES.find((s) => s.value === scope)?.label ?? scope}
          email={email}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </span>
  );
}

export function AdminScreen() {
  const { overview, users, loading, error } = useAdmin(true);
  const activityGrid = useAdminActivityGrid(true);

  return (
    <div className="stage">
      <div className="panel admin-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Admin</h1>
        <p className="panel__subtitle">Everything across every account, read-only except Reset below.</p>

        {error && (
          <p className="login-error" dir="ltr">
            {error}
          </p>
        )}

        {loading && !overview ? (
          <p className="admin-loading">Loading…</p>
        ) : (
          overview && (
            <div className="admin-overview-grid">
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalUsers}</p>
                <p className="admin-stat__label">users</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalChevrusot}</p>
                <p className="admin-stat__label">chevrusot</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalChaburot}</p>
                <p className="admin-stat__label">chaburot</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalSiyumim}</p>
                <p className="admin-stat__label">siyumim</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.learnedClaims}</p>
                <p className="admin-stat__label">perakim learned</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.openPerakim}</p>
                <p className="admin-stat__label">perakim still open</p>
              </div>
            </div>
          )
        )}

        <h2 className="account-section-title">Today's activity — everyone, live</h2>
        <p className="panel__subtitle" style={{ marginBottom: 12 }}>
          Same figures the rebbe dashboard grid shows, read directly — nothing needs to be sent to you first.
        </p>
        {activityGrid.error && (
          <p className="login-error" dir="ltr">
            {activityGrid.error}
          </p>
        )}
        {activityGrid.loading && activityGrid.students.length === 0 ? (
          <p className="admin-loading">Loading…</p>
        ) : (
          <RebbeGrid students={activityGrid.students} submissions={activityGrid.submissions} />
        )}

        <h2 className="account-section-title">Users</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Joined</th>
                <th>Mishnayot</th>
                <th>Admin</th>
                <th>Reset trackers</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : "—"}</td>
                  <td>{u.username ?? "—"}</td>
                  <td>{[u.city, u.country].filter(Boolean).join(", ") || "—"}</td>
                  <td>
                    <a className="admin-table__mailto" href={`mailto:${u.email}`}>
                      {u.email}
                    </a>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>{u.mishnayotLearned}</td>
                  <td>{u.isAdmin ? "Yes" : ""}</td>
                  <td>
                    <AdminResetCell userId={u.id} email={u.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
