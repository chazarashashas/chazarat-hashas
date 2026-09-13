import { useState } from "react";
import { useAdminGroupMembers, type AdminGroupRow } from "../../utils/useAdminGroups";
import { useAdminGroupDetail } from "../../utils/useAdminData";
import { adminAction } from "../../utils/adminRpc";
import { logAdminAction } from "../../utils/useAdminAudit";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { SEDARIM } from "../../data/shas";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import { fullName, plural, shortDate } from "./adminShared";

type GroupFilter = "active" | "chaburot" | "chevrusot" | "archived";

const FILTERS: { id: GroupFilter; label: string }[] = [
  { id: "active", label: "All active" },
  { id: "chaburot", label: "Chaburos" },
  { id: "chevrusot", label: "Chevrusos" },
  { id: "archived", label: "Archived" },
];

function kind(g: { isClass: boolean; isChabura: boolean }): string {
  return g.isClass ? "Rebbe & class" : g.isChabura ? "Chabura" : "Chevrusa";
}

export function ChaburotSection({
  groups,
  loading,
  error,
  onOpenGroup,
}: {
  groups: AdminGroupRow[];
  loading: boolean;
  error: string | null;
  onOpenGroup: (id: string) => void;
}) {
  const [filter, setFilter] = useState<GroupFilter>("active");
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const shown = groups.filter((g) => {
    if (filter === "archived" ? !g.archivedAt : g.archivedAt) return false;
    if (filter === "chaburot" && !g.isChabura) return false;
    if (filter === "chevrusot" && g.isChabura) return false;
    if (needle && ![g.name, g.masechetEn, g.teacherEmail, g.joinCode].some((v) => (v ?? "").toLowerCase().includes(needle))) {
      return false;
    }
    return true;
  });

  return (
    <>
      <label className="field">
        <span className="field__label">Find a chabura</span>
        <input
          className="field__input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, masechet, rebbe's email or join code"
        />
      </label>
      <div className="pill-row admin-subfilters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={"pill pill--compact" + (filter === f.id ? " pill--active" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="state state--error callout callout--bad">{error}</p>
      ) : loading && groups.length === 0 ? (
        <p className="state state--loading">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="state state--empty">{groups.length === 0 ? "No chaburos or chevrusos yet." : "None match that."}</p>
      ) : (
        <div className="admin-rows">
          {shown.map((g) => (
            <button key={g.id} className="card admin-row" onClick={() => onOpenGroup(g.id)}>
              <span className="admin-row__main">
                <span className="admin-row__name">{g.name ?? g.masechetEn}</span>
                <span className="admin-row__sub">
                  {kind(g)} · {g.masechetEn}
                  {g.teacherEmail ? ` · ${g.teacherEmail}` : ""}
                </span>
              </span>
              {g.pendingInvites > 0 && (
                <span className="pill pill--compact admin-row__tag">{plural(g.pendingInvites, "invite", "invites")} pending</span>
              )}
              {g.archivedAt && <span className="pill pill--compact admin-row__tag">Archived</span>}
              <span className="admin-row__meta">
                <span className="admin-row__figure">{g.memberCount}</span>
                <span className="admin-row__figure-label">members</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================
   One chabura — what the rebbe sees, and the support actions
   ============================================================ */

export function GroupDrawer({
  group,
  onClose,
  onChanged,
  onOpenUser,
}: {
  group: AdminGroupRow;
  onClose: () => void;
  onChanged: () => void;
  onOpenUser: (id: string) => void;
}) {
  useEscapeKey(onClose);
  const [rosterTick, setRosterTick] = useState(0);
  const roster = useAdminGroupMembers(group.id, rosterTick);
  const detail = useAdminGroupDetail(group.id);
  const [name, setName] = useState(group.name ?? "");
  const [masechet, setMasechet] = useState(group.masechetEn);
  const [confirming, setConfirming] = useState<
    { kind: "archive" } | { kind: "rebbe"; userId: string; label: string } | { kind: "invite"; id: string; email: string } | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changed = (name.trim() || null) !== group.name || masechet !== group.masechetEn;
  const archived = Boolean(group.archivedAt);
  const target = { email: group.teacherEmail ?? undefined };

  async function act(fn: () => Promise<string | null>, success: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    const err = await fn();
    setBusy(false);
    if (err) {
      setError(err);
      return false;
    }
    setConfirming(null);
    setNote(success);
    onChanged();
    return true;
  }

  const save = () =>
    act(async () => {
      const err = await adminAction("admin_update_group", { p_group_id: group.id, p_name: name, p_masechet_en: masechet });
      if (!err) await logAdminAction("edit_chabura", target, { group: group.id, name: name.trim(), masechet });
      return err;
    }, "Saved.");

  async function confirm() {
    if (!confirming) return;
    if (confirming.kind === "archive") {
      await act(async () => {
        const err = await adminAction("admin_set_group_archived", { p_group_id: group.id, p_archived: !archived });
        if (!err) await logAdminAction(archived ? "unarchive_chabura" : "archive_chabura", target, { group: group.name ?? group.masechetEn });
        return err;
      }, archived ? "Restored. It's back in its members' lists." : "Archived. It's gone from its members' lists.");
    } else if (confirming.kind === "rebbe") {
      const { userId, label } = confirming;
      const ok = await act(async () => {
        const err = await adminAction("admin_transfer_rebbe", { p_group_id: group.id, p_user_id: userId });
        if (!err) await logAdminAction("transfer_rebbe", { id: userId }, { group: group.name ?? group.masechetEn, to: label });
        return err;
      }, `${label} is now the rebbe.`);
      if (ok) setRosterTick((t) => t + 1);
    } else {
      const { id, email } = confirming;
      const ok = await act(async () => {
        const err = await adminAction("admin_delete_invite", { p_invite_id: id });
        if (!err) await logAdminAction("delete_invite", { email }, { group: group.name ?? group.masechetEn });
        return err;
      }, `Invite to ${email} removed.`);
      if (ok) detail.refresh();
    }
  }

  const byDate = new Map<string, typeof detail.data.submissions>();
  for (const s of detail.data.submissions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-label="Chabura" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>

        <h2 className="modal__title">{group.name ?? group.masechetEn}</h2>
        <p className="admin-drawer__email">
          {kind(group)} · {group.masechetEn}
          {archived ? " · Archived" : ""}
        </p>

        {note && <p className="callout callout--good">{note}</p>}
        {error && !confirming && <p className="callout callout--bad">{error}</p>}

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
          <div>
            <dt>Join code</dt>
            <dd>{group.joinCode ?? "—"}</dd>
          </div>
          <div>
            <dt>Invites pending</dt>
            <dd>{group.pendingInvites}</dd>
          </div>
          <div>
            <dt>Last submission</dt>
            <dd>{shortDate(group.lastSubmission)}</dd>
          </div>
        </dl>

        <h3 className="section-title">Roster</h3>
        {roster.loading && roster.members.length === 0 ? (
          <p className="state state--loading">Loading…</p>
        ) : roster.error ? (
          <p className="state state--error callout callout--bad">{roster.error}</p>
        ) : roster.members.length === 0 ? (
          <p className="state state--empty">Nobody has joined yet.</p>
        ) : (
          <ul className="admin-roster">
            {roster.members.map((m) => {
              const label = fullName(m) || m.email;
              const canBeRebbe = group.isClass && m.role !== "teacher";
              return (
                <li key={m.userId} className={"admin-roster__row" + (canBeRebbe ? " admin-roster__row--action" : "")}>
                  <button className="admin-link admin-roster__name" onClick={() => onOpenUser(m.userId)}>
                    {label}
                  </button>
                  <span className="admin-roster__email">
                    {m.email} · {m.role === "teacher" ? "Rebbe" : group.isChabura ? "Talmid" : "Chevrusa"}
                    {m.joinedAt ? ` · joined ${shortDate(m.joinedAt)}` : ""}
                  </span>
                  {canBeRebbe && (
                    <button
                      className="btn btn--quiet btn--compact admin-roster__action"
                      onClick={() => setConfirming({ kind: "rebbe", userId: m.userId, label })}
                    >
                      Make rebbe
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="section-title">Invites</h3>
        {detail.error ? (
          <p className="state state--error callout callout--bad">{detail.error}</p>
        ) : detail.loading && detail.data.invites.length === 0 ? (
          <p className="state state--loading">Loading…</p>
        ) : detail.data.invites.length === 0 ? (
          <p className="state state--empty">No invites.</p>
        ) : (
          <ul className="admin-roster">
            {detail.data.invites.map((i) => (
              <li key={i.id} className="admin-roster__row admin-roster__row--action">
                <span className="admin-roster__name">{i.email}</span>
                <span className="admin-roster__email">
                  {i.status === "pending" ? "Waiting for an answer" : i.status === "declined" ? "Declined" : "Accepted"}
                  {i.createdAt ? ` · sent ${shortDate(i.createdAt)}` : ""}
                </span>
                <button
                  className="btn btn--quiet btn--compact admin-roster__action"
                  onClick={() => setConfirming({ kind: "invite", id: i.id, email: i.email })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {group.isChabura && (
          <>
            <h3 className="section-title">Daily submissions · last 60 days</h3>
            {detail.loading && detail.data.submissions.length === 0 ? (
              <p className="state state--loading">Loading…</p>
            ) : byDate.size === 0 ? (
              <p className="state state--empty">Nothing sent in the last 60 days.</p>
            ) : (
              <div className="admin-history">
                {Array.from(byDate.entries()).map(([date, subs]) => (
                  <div key={date} className="admin-history__day">
                    <p className="admin-history__date">
                      {shortDate(date)} · {plural(subs.length, "talmid", "talmidim")}
                    </p>
                    <ul className="admin-roster">
                      {subs.map((s) => (
                        <li key={s.userId} className="admin-roster__row">
                          <span className="admin-roster__name">{s.firstName ?? s.username ?? s.email ?? "Talmid"}</span>
                          <span className="admin-roster__email">
                            {s.activities.length === 0 ? "Sent with nothing to report" : s.activities.map((a) => `${a.label} ${a.figure}`).join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <h3 className="section-title">Edit</h3>
        <label className="field">
          <span className="field__label">Name</span>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="No name" />
        </label>
        <label className="field">
          <span className="field__label">Masechet</span>
          <select className="field__input" value={masechet} onChange={(e) => setMasechet(e.target.value)}>
            {SEDARIM.map((seder) => (
              <optgroup key={seder.id} label={seder.en}>
                {seder.masechtot.map((m) => (
                  <option key={m.en} value={m.en}>
                    {m.en}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="btn btn--secondary btn--compact" disabled={busy || !changed} onClick={save}>
          Save
        </button>

        <h3 className="section-title">{archived ? "Restore" : "Archive"}</h3>
        <p className="field__hint admin-drawer__hint">
          {archived
            ? "Puts it back in its members' lists, exactly as it was."
            : "Takes it out of its members' lists. Nothing is deleted, and it can be restored."}
        </p>
        <button className="btn btn--danger-outline btn--compact" onClick={() => setConfirming({ kind: "archive" })}>
          {archived ? "Restore" : "Archive"}
        </button>

        {confirming && (
          <ConfirmModal
            title={
              confirming.kind === "archive"
                ? `${archived ? "Restore" : "Archive"} ${group.name ?? group.masechetEn}?`
                : confirming.kind === "rebbe"
                  ? `Make ${confirming.label} the rebbe?`
                  : `Remove the invite to ${confirming.email}?`
            }
            body={
              confirming.kind === "rebbe"
                ? "The current rebbe stays in the chabura as a talmid. It will be recorded in the audit log."
                : "It will be recorded in the audit log."
            }
            confirmLabel={confirming.kind === "archive" ? (archived ? "Restore" : "Archive") : confirming.kind === "rebbe" ? "Make rebbe" : "Remove"}
            busyLabel="Saving…"
            busy={busy}
            destructive={confirming.kind !== "rebbe"}
            error={error}
            onConfirm={confirm}
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
