import { useState } from "react";
import { useAdmin, type AdminUserRow } from "../../utils/useAdmin";
import { useAdminActivityGrid } from "../../utils/useAdminActivityGrid";
import { useAdminAudit, logAdminAction, auditActionLabel } from "../../utils/useAdminAudit";
import { useAdminGroups, useAdminGroupMembers, type AdminGroupRow } from "../../utils/useAdminGroups";
import { useAuth } from "../../utils/useAuth";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { friendlyError } from "../../utils/friendlyError";
import { supabase } from "../../utils/supabase";
import { RebbeGrid } from "../RebbeDashboard/RebbeDashboardScreen";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import "../RebbeDashboard/RebbeDashboardScreen.css";
import "./AdminScreen.css";

const RESET_SCOPES = [
  { value: "daily_limmud", label: "Daily Limmud & streak" },
  { value: "perek_notes", label: "Perek Notes & notebook" },
  { value: "concepts", label: "Concepts to review" },
  { value: "game_stats", label: "Practice game stats" },
  { value: "everything", label: "Everything" },
] as const;

type Section = "users" | "chaburot" | "activity" | "log";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "chaburot", label: "Chaburos" },
  { id: "activity", label: "Today" },
  { id: "log", label: "Audit log" },
];

function fullName(u: { firstName: string | null; lastName: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ============================================================
   User drawer — everything about one account, and the two
   privileged actions, in one place rather than as table cells.
   ============================================================ */

interface UserDrawerProps {
  user: AdminUserRow;
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function UserDrawer({ user, isSelf, onClose, onChanged }: UserDrawerProps) {
  useEscapeKey(onClose);
  const auth = useAuth();
  const [scope, setScope] = useState<string>(RESET_SCOPES[0].value);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("admin_reset_user_data", {
      p_user_id: user.id,
      p_scope: scope,
    });
    setBusy(false);
    setConfirmingReset(false);
    if (err) {
      setError(friendlyError(err, "admin-reset"));
      return;
    }
    await logAdminAction("reset_user_data", { id: user.id, email: user.email }, { scope });
    setNote(`Reset ${RESET_SCOPES.find((s) => s.value === scope)?.label ?? scope}.`);
    onChanged();
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const err = await auth.adminDeleteUser(user.id);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    await logAdminAction("delete_user", { id: user.id, email: user.email });
    setConfirmingDelete(false);
    onChanged();
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-label="User" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>

        <h2 className="modal__title">{fullName(user) || user.username || user.email}</h2>
        <p className="admin-drawer__email">{user.email}</p>

        <dl className="admin-drawer__facts">
          <div>
            <dt>Username</dt>
            <dd>{user.username ?? "—"}</dd>
          </div>
          <div>
            <dt>Signed up via</dt>
            <dd>{user.signedUpVia === "google" ? "Google" : "Email"}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{shortDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{[user.city, user.country].filter(Boolean).join(", ") || "—"}</dd>
          </div>
          <div>
            <dt>Mishnayot learned</dt>
            <dd>{user.mishnayotLearned}</dd>
          </div>
          <div>
            <dt>Super admin</dt>
            <dd>{user.isAdmin ? "Yes" : "No"}</dd>
          </div>
        </dl>

        {note && <p className="callout callout--good">{note}</p>}
        {error && <p className="field__error">{error}</p>}

        <h3 className="section-title">Reset trackers</h3>
        <label className="field">
          <span className="field__label">What to reset</span>
          <select
            className="field__input"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {RESET_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn--danger-outline btn--compact"
          onClick={() => setConfirmingReset(true)}
        >
          Reset
        </button>

        <h3 className="section-title">Delete account</h3>
        {isSelf ? (
          <p className="state state--empty">
            This is your own account — delete it from My Account.
          </p>
        ) : (
          <button className="btn btn--danger btn--compact" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        )}

        {confirmingReset && (
          <ConfirmModal
            title={`Reset ${RESET_SCOPES.find((s) => s.value === scope)?.label ?? scope} for ${user.email}?`}
            body="This can't be undone. It will be recorded in the audit log."
            confirmLabel="Yes, reset"
            busyLabel="Resetting…"
            busy={busy}
            destructive
            onConfirm={handleReset}
            onCancel={() => setConfirmingReset(false)}
          />
        )}
        {confirmingDelete && (
          <ConfirmModal
            title={`Permanently delete ${user.email}'s account?`}
            body="This can't be undone. It will be recorded in the audit log. Type DELETE to confirm."
            icon="⚠"
            confirmLabel="Confirm delete"
            busyLabel="Deleting…"
            busy={busy}
            destructive
            typeToConfirm="DELETE"
            error={error}
            onConfirm={handleDelete}
            onCancel={() => {
              setError(null);
              setConfirmingDelete(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Chabura drawer — what the rebbe sees, for support
   ============================================================ */

function GroupDrawer({ group, onClose }: { group: AdminGroupRow; onClose: () => void }) {
  useEscapeKey(onClose);
  const { members, loading, error } = useAdminGroupMembers(group.id);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-label="Chabura" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>

        <h2 className="modal__title">{group.name ?? group.masechetEn}</h2>
        <p className="admin-drawer__email">
          {group.isClass ? "Rebbe & class" : group.isChabura ? "Chabura" : "Chevrusa"} ·{" "}
          {group.masechetEn}
        </p>

        <dl className="admin-drawer__facts">
          <div>
            <dt>Rebbe</dt>
            <dd>{group.teacherEmail ?? "—"}</dd>
          </div>
          <div>
            <dt>Members</dt>
            <dd>{group.memberCount}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{shortDate(group.createdAt)}</dd>
          </div>
        </dl>

        <h3 className="section-title">Roster</h3>
        {loading ? (
          <p className="state state--loading">Loading…</p>
        ) : error ? (
          <p className="state state--error callout callout--bad">{error}</p>
        ) : members.length === 0 ? (
          <p className="state state--empty">Nobody has joined yet.</p>
        ) : (
          <ul className="admin-roster">
            {members.map((m) => (
              <li key={m.userId} className="admin-roster__row">
                <span className="admin-roster__name">{fullName(m) || m.email}</span>
                <span className="admin-roster__email">{m.email}</span>
                <span className="admin-roster__role">{m.role === "teacher" ? "Rebbe" : "Talmid"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   The panel
   ============================================================ */

export function AdminScreen() {
  const auth = useAuth();
  const { overview, users, loading, error, refresh } = useAdmin(true);
  const activityGrid = useAdminActivityGrid(true);
  const audit = useAdminAudit(true);
  const groups = useAdminGroups(true);

  const [section, setSection] = useState<Section>("users");
  const [openUser, setOpenUser] = useState<AdminUserRow | null>(null);
  const [openGroup, setOpenGroup] = useState<AdminGroupRow | null>(null);
  const [search, setSearch] = useState("");

  const needle = search.trim().toLowerCase();
  const shownUsers = needle
    ? users.filter((u) =>
        [u.email, u.username, fullName(u)].some((v) => (v ?? "").toLowerCase().includes(needle)),
      )
    : users;

  function refreshAll() {
    refresh();
    audit.refresh();
    groups.refresh();
  }

  return (
    <div className="stage">
      <div className="panel">
        <div className="screen-head">
          <h1 className="screen-head__title">Admin</h1>
          <p className="screen-head__sub">Every account, chabura and privileged action.</p>
          <div className="screen-head__aside">
            <button className="btn btn--secondary btn--compact" onClick={refreshAll} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && <p className="state state--error callout callout--bad">{error}</p>}

        {overview && (
          <div className="admin-overview-grid">
            {[
              { n: overview.totalUsers, label: "users" },
              { n: overview.totalChevrusot, label: "chevrusos" },
              { n: overview.totalChaburot, label: "chaburos" },
              { n: overview.totalSiyumim, label: "siyumim" },
              { n: overview.learnedClaims, label: "perakim learned" },
              { n: overview.openPerakim, label: "perakim still open" },
            ].map((s) => (
              <div key={s.label} className="card admin-stat">
                <p className="admin-stat__num">{s.n}</p>
                <p className="admin-stat__label">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="pill-row admin-sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={"pill pill--compact" + (section === s.id ? " pill--active" : "")}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === "users" && (
          <>
            <label className="field">
              <span className="field__label">Find a user</span>
              <input
                className="field__input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, username or email"
              />
            </label>
            {loading && users.length === 0 ? (
              <p className="state state--loading">Loading…</p>
            ) : shownUsers.length === 0 ? (
              <p className="state state--empty">No user matches that.</p>
            ) : (
              <div className="admin-rows">
                {shownUsers.map((u) => (
                  <button key={u.id} className="card admin-row" onClick={() => setOpenUser(u)}>
                    <span className="admin-row__main">
                      <span className="admin-row__name">{fullName(u) || u.username || "—"}</span>
                      <span className="admin-row__sub">{u.email}</span>
                    </span>
                    <span className="admin-row__meta">
                      <span className="admin-row__figure">{u.mishnayotLearned}</span>
                      <span className="admin-row__figure-label">mishnayot</span>
                    </span>
                    {u.isAdmin && <span className="pill pill--compact admin-row__tag">Admin</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {section === "chaburot" && (
          <>
            {groups.error && <p className="state state--error callout callout--bad">{groups.error}</p>}
            {groups.loading && groups.groups.length === 0 ? (
              <p className="state state--loading">Loading…</p>
            ) : groups.groups.length === 0 ? (
              <p className="state state--empty">No chaburos or chevrusos yet.</p>
            ) : (
              <div className="admin-rows">
                {groups.groups.map((g) => (
                  <button key={g.id} className="card admin-row" onClick={() => setOpenGroup(g)}>
                    <span className="admin-row__main">
                      <span className="admin-row__name">{g.name ?? g.masechetEn}</span>
                      <span className="admin-row__sub">
                        {g.isClass ? "Rebbe & class" : g.isChabura ? "Chabura" : "Chevrusa"} ·{" "}
                        {g.masechetEn}
                        {g.teacherEmail ? ` · ${g.teacherEmail}` : ""}
                      </span>
                    </span>
                    <span className="admin-row__meta">
                      <span className="admin-row__figure">{g.memberCount}</span>
                      <span className="admin-row__figure-label">members</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {section === "activity" && (
          <>
            {activityGrid.error && (
              <p className="state state--error callout callout--bad">{activityGrid.error}</p>
            )}
            {activityGrid.loading && activityGrid.students.length === 0 ? (
              <p className="state state--loading">Loading…</p>
            ) : (
              <RebbeGrid students={activityGrid.students} submissions={activityGrid.submissions} />
            )}
          </>
        )}

        {section === "log" && (
          <>
            {audit.error && <p className="state state--error callout callout--bad">{audit.error}</p>}
            {audit.loading && audit.entries.length === 0 ? (
              <p className="state state--loading">Loading…</p>
            ) : audit.entries.length === 0 ? (
              <p className="state state--empty">
                Nothing logged yet. Resets, deletions and rebbe views appear here.
              </p>
            ) : (
              <div className="admin-rows">
                {audit.entries.map((e) => (
                  <div key={e.id} className="card admin-row admin-row--static">
                    <span className="admin-row__main">
                      <span className="admin-row__name">{auditActionLabel(e.action)}</span>
                      <span className="admin-row__sub">
                        {e.actorEmail}
                        {e.targetEmail ? ` → ${e.targetEmail}` : ""}
                        {typeof e.detail.scope === "string" ? ` · ${e.detail.scope}` : ""}
                      </span>
                    </span>
                    <span className="admin-row__meta">
                      <span className="admin-row__figure-label">{shortDateTime(e.createdAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {openUser && (
        <UserDrawer
          user={openUser}
          isSelf={openUser.id === auth.session?.user.id}
          onClose={() => setOpenUser(null)}
          onChanged={refreshAll}
        />
      )}
      {openGroup && <GroupDrawer group={openGroup} onClose={() => setOpenGroup(null)} />}
    </div>
  );
}
