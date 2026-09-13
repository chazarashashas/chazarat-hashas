import { useState } from "react";
import { AUDIT_ACTIONS, auditActionLabel, type AuditEntry } from "../../utils/useAdminAudit";
import { plural, shortDateTime } from "./adminShared";

/** "scope: game_stats · to: beni2" — the entry's own detail, briefly. */
function detailLine(detail: Record<string, unknown>): string {
  return Object.entries(detail)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export function AuditLogSection({ entries, loading, error }: { entries: AuditEntry[]; loading: boolean; error: string | null }) {
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [search, setSearch] = useState("");
  const actors = Array.from(new Set(entries.map((e) => e.actorEmail))).sort();
  const needle = search.trim().toLowerCase();
  const shown = entries.filter(
    (e) =>
      (action === "all" || e.action === action) &&
      (actor === "all" || e.actorEmail === actor) &&
      (!needle || [e.targetEmail, detailLine(e.detail)].some((v) => (v ?? "").toLowerCase().includes(needle))),
  );

  return (
    <>
      <div className="admin-filters">
        <label className="field">
          <span className="field__label">Action</span>
          <select className="field__input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="all">Every action</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {auditActionLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Admin</span>
          <select className="field__input" value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="all">Every admin</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">User or detail</span>
          <input className="field__input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Email, name or word" />
        </label>
      </div>
      <p className="admin-toolbar__count">
        {plural(shown.length, "entry", "entries")}
        {entries.length >= 500 ? " · showing the latest 500" : ""}
      </p>

      {error && <p className="state state--error callout callout--bad">{error}</p>}
      {loading && entries.length === 0 ? (
        <p className="state state--loading">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="state state--empty">
          {entries.length === 0 ? "Nothing logged yet. Every admin change appears here." : "No entry matches that."}
        </p>
      ) : (
        <div className="admin-rows">
          {shown.map((e) => {
            const extra = detailLine(e.detail);
            return (
              <div key={e.id} className="card admin-row admin-row--static">
                <span className="admin-row__main">
                  <span className="admin-row__name">{auditActionLabel(e.action)}</span>
                  <span className="admin-row__sub">
                    {e.actorEmail}
                    {e.targetEmail ? ` → ${e.targetEmail}` : ""}
                  </span>
                  {extra && <span className="admin-row__sub">{extra}</span>}
                </span>
                <span className="admin-row__meta">
                  <span className="admin-row__figure-label">{shortDateTime(e.createdAt)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
