import { useState } from "react";
import type { AdminUserRow } from "../../utils/useAdmin";
import { useAdminUserDetail } from "../../utils/useAdminData";
import type { GameStats } from "../../utils/useGameStats";
import { adminAction } from "../../utils/adminRpc";
import { logAdminAction } from "../../utils/useAdminAudit";
import { useAuth } from "../../utils/useAuth";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { localDateStr } from "../../utils/localDate";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import { AdminBarChart } from "./AdminBarChart";
import {
  GAMES,
  agoLabel,
  fullName,
  gameSummary,
  lastDays,
  paceText,
  plural,
  positionLabel,
  shortDate,
  streakFor,
} from "./adminShared";

const RESET_SCOPES = [
  { value: "daily_limmud", label: "Daily Limmud & streak" },
  { value: "perek_notes", label: "Perek Notes & notebook" },
  { value: "concepts", label: "Concepts to review" },
  { value: "game_stats", label: "Practice game stats" },
  { value: "everything", label: "Everything" },
] as const;

interface UserDrawerProps {
  user: AdminUserRow;
  isSelf: boolean;
  /** Undefined when this account has never played while signed in. */
  games: GameStats | undefined;
  gamesError: string | null;
  onClose: () => void;
  onChanged: () => void;
  onOpenGroup: (id: string) => void;
  onOpenSiyum: (id: string) => void;
}

/** Everything about one account, and the privileged actions on it, in
    one place rather than as table cells. */
export function UserDrawer({ user, isSelf, games, gamesError, onClose, onChanged, onOpenGroup, onOpenSiyum }: UserDrawerProps) {
  useEscapeKey(onClose);
  const auth = useAuth();
  const detail = useAdminUserDetail(user.id);
  const d = detail.data;
  const today = localDateStr();

  const [scope, setScope] = useState<string>(RESET_SCOPES[0].value);
  const [confirming, setConfirming] = useState<"reset" | "delete" | "admin" | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState(user.username ?? "");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");

  const streak = streakFor(d, today);
  const chart = lastDays(d, 30, today);
  const learned30 = chart.reduce((a, x) => a + x.value, 0);
  const nameChanged =
    username.trim() !== (user.username ?? "") ||
    firstName.trim() !== (user.firstName ?? "") ||
    lastName.trim() !== (user.lastName ?? "");

  async function run(fn: () => Promise<string | null>, success: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    const err = await fn();
    setBusy(false);
    setConfirming(null);
    if (err) {
      setError(err);
      return false;
    }
    setNote(success);
    onChanged();
    return true;
  }

  const handleReset = () =>
    run(async () => {
      const err = await adminAction("admin_reset_user_data", { p_user_id: user.id, p_scope: scope });
      if (!err) await logAdminAction("reset_user_data", { id: user.id, email: user.email }, { scope });
      return err;
    }, `Reset ${RESET_SCOPES.find((s) => s.value === scope)?.label ?? scope}.`);

  const handleAdmin = () =>
    run(async () => {
      const err = await adminAction("admin_set_admin", { p_user_id: user.id, p_is_admin: !user.isAdmin });
      if (!err) await logAdminAction(user.isAdmin ? "revoke_admin" : "grant_admin", { id: user.id, email: user.email });
      return err;
    }, user.isAdmin ? "Admin access removed." : "Now an admin.");

  const handleName = () =>
    run(async () => {
      const err = await adminAction("admin_update_profile_name", {
        p_user_id: user.id,
        p_username: username,
        p_first_name: firstName,
        p_last_name: lastName,
      });
      if (!err) {
        await logAdminAction("edit_name", { id: user.id, email: user.email }, {
          from: user.username,
          to: username.trim(),
        });
      }
      return err;
    }, "Name saved.");

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
    setConfirming(null);
    onChanged();
    onClose();
  }

  const gameLines = games ? GAMES.map((g) => ({ g, line: g.line(games, today) })) : [];

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-label="User" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>

        <h2 className="modal__title">{fullName(user) || user.username || user.email}</h2>
        <p className="admin-drawer__email">{user.email}</p>

        {note && <p className="callout callout--good">{note}</p>}
        {error && !confirming && <p className="callout callout--bad">{error}</p>}

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
            <dt>Last sign-in</dt>
            <dd>{user.lastSignInAt ? `${shortDate(user.lastSignInAt)} · ${agoLabel(user.lastSignInAt, today)}` : "Never"}</dd>
          </div>
          <div>
            <dt>Email confirmed</dt>
            <dd>{user.emailConfirmedAt ? `Yes · ${shortDate(user.emailConfirmedAt)}` : "Not yet"}</dd>
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
            <dt>Last learned</dt>
            <dd>{agoLabel(user.lastLearnedDate, today)}</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{detail.loading && d.days.length === 0 ? "…" : `${plural(streak.current, "day", "days")} · best ${streak.longest}`}</dd>
          </div>
          <div>
            <dt>Daily Limmud up to</dt>
            <dd>{positionLabel(user.dailyLimmudPosition)}</dd>
          </div>
          <div>
            <dt>Pace</dt>
            <dd>{detail.loading && !d.dailyLimmudPace ? "…" : paceText(d.dailyLimmudPace)}</dd>
          </div>
          <div>
            <dt>Super admin</dt>
            <dd>{user.isAdmin ? "Yes" : "No"}</dd>
          </div>
        </dl>

        {detail.error && <p className="state state--error callout callout--bad">{detail.error}</p>}

        <h3 className="section-title">Learning</h3>
        {detail.loading && d.days.length === 0 ? (
          <p className="state state--loading">Loading…</p>
        ) : (
          <>
            <AdminBarChart
              title={`Last 30 days · ${plural(learned30, "mishnah", "mishnayot")}`}
              unit="mishnayot"
              data={chart.map((x) => {
                const label = new Date(x.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return { key: x.date, label, value: x.value, tooltip: `${label} · ${plural(x.value, "mishnah", "mishnayot")}` };
              })}
            />
            {d.masechtot.length > 0 && (
              <p className="admin-drawer__line">
                {d.masechtot
                  .slice(0, 6)
                  .map((m) => `${m.masechetEn} ${m.count}`)
                  .join(" · ")}
                {d.masechtot.length > 6 ? ` · +${d.masechtot.length - 6} more` : ""}
              </p>
            )}
          </>
        )}

        <h3 className="section-title">Chaburos & chevrusos</h3>
        {d.groups.length === 0 ? (
          <p className="state state--empty">{detail.loading ? "Loading…" : "Not in any."}</p>
        ) : (
          <ul className="admin-roster">
            {d.groups.map((g) => (
              <li key={g.id} className="admin-roster__row">
                <button className="admin-link admin-roster__name" onClick={() => onOpenGroup(g.id)}>
                  {g.name ?? g.masechetEn}
                  {g.archived ? " (archived)" : ""}
                </button>
                <span className="admin-roster__email">
                  {g.isClass ? "Rebbe & class" : g.isChabura ? "Chabura" : "Chevrusa"} · {g.masechetEn}
                  {g.joinedAt ? ` · joined ${shortDate(g.joinedAt)}` : ""}
                </span>
                <span className="admin-roster__role">{g.role === "teacher" ? "Rebbe" : g.isChabura ? "Talmid" : "Chevrusa"}</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="section-title">Siyum perakim taken on</h3>
        {d.claims.length === 0 ? (
          <p className="state state--empty">{detail.loading ? "Loading…" : "None."}</p>
        ) : (
          <ul className="admin-roster">
            {d.claims.map((c) => (
              <li key={c.id} className="admin-roster__row">
                <button className="admin-link admin-roster__name" onClick={() => onOpenSiyum(c.siyumId)}>
                  {c.masechetEn} {c.perek}
                </button>
                <span className="admin-roster__email">
                  {c.dedication} · taken {shortDate(c.claimedAt)}
                </span>
                <span className="admin-roster__role">{c.learned ? `Learned ${shortDate(c.learnedAt)}` : "Not yet learned"}</span>
              </li>
            ))}
          </ul>
        )}

        {d.siyumim.length > 0 && (
          <>
            <h3 className="section-title">Siyumim started</h3>
            <ul className="admin-roster">
              {d.siyumim.map((s) => (
                <li key={s.id} className="admin-roster__row">
                  <button className="admin-link admin-roster__name" onClick={() => onOpenSiyum(s.id)}>
                    {s.dedication}
                  </button>
                  <span className="admin-roster__email">Started {shortDate(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="section-title">Games</h3>
        {gamesError ? (
          <p className="state state--error callout callout--bad">{gamesError}</p>
        ) : gameLines.every(({ line }) => !line.played) ? (
          <p className="state state--empty">No games played while signed in.</p>
        ) : (
          <dl className="admin-drawer__facts admin-drawer__facts--single">
            {gameLines.map(({ g, line }) => (
              <div key={g.id}>
                <dt>{g.label}</dt>
                <dd>{gameSummary(line)}</dd>
              </div>
            ))}
          </dl>
        )}

        <h3 className="section-title">Name</h3>
        <p className="field__hint admin-drawer__hint">Shown to their chabura and on siyum boards.</p>
        <div className="admin-form">
          <label className="field">
            <span className="field__label">Username</span>
            <input className="field__input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">First name</span>
            <input className="field__input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Last name</span>
            <input className="field__input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>
        <button className="btn btn--secondary btn--compact" disabled={busy || !nameChanged} onClick={handleName}>
          Save name
        </button>

        <h3 className="section-title">Admin access</h3>
        {isSelf && user.isAdmin ? (
          <p className="state state--empty">This is you — your own admin access can't be removed here.</p>
        ) : (
          <button className="btn btn--secondary btn--compact" onClick={() => setConfirming("admin")}>
            {user.isAdmin ? "Remove admin access" : "Make admin"}
          </button>
        )}

        <h3 className="section-title">Reset trackers</h3>
        <label className="field">
          <span className="field__label">What to reset</span>
          <select className="field__input" value={scope} onChange={(e) => setScope(e.target.value)}>
            {RESET_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn--danger-outline btn--compact" onClick={() => setConfirming("reset")}>
          Reset
        </button>

        <h3 className="section-title">Delete account</h3>
        {isSelf ? (
          <p className="state state--empty">This is your own account — delete it from My Account.</p>
        ) : (
          <button className="btn btn--danger btn--compact" onClick={() => setConfirming("delete")}>
            Delete
          </button>
        )}

        {confirming === "admin" && (
          <ConfirmModal
            title={user.isAdmin ? `Remove admin access from ${user.email}?` : `Make ${user.email} an admin?`}
            body={
              user.isAdmin
                ? "They will lose the admin panel. It will be recorded in the audit log."
                : "They will see every account, chabura and siyum, and can reset or delete accounts. It will be recorded in the audit log."
            }
            confirmLabel={user.isAdmin ? "Remove admin" : "Make admin"}
            busyLabel="Saving…"
            busy={busy}
            destructive={!user.isAdmin}
            error={error}
            onConfirm={handleAdmin}
            onCancel={() => setConfirming(null)}
          />
        )}
        {confirming === "reset" && (
          <ConfirmModal
            title={`Reset ${RESET_SCOPES.find((s) => s.value === scope)?.label ?? scope} for ${user.email}?`}
            body="This can't be undone. It will be recorded in the audit log."
            confirmLabel="Yes, reset"
            busyLabel="Resetting…"
            busy={busy}
            destructive
            error={error}
            onConfirm={handleReset}
            onCancel={() => setConfirming(null)}
          />
        )}
        {confirming === "delete" && (
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
              setConfirming(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
