import { useState } from "react";
import { useAdminSiyumClaims, type AdminSiyum } from "../../utils/useAdminData";
import { adminAction } from "../../utils/adminRpc";
import { logAdminAction } from "../../utils/useAdminAudit";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import { daysSince, plural, shortDate } from "./adminShared";

const TOTAL_PERAKIM = 524;
const STALE_DAYS = 30;

type SiyumFilter = "all" | "public" | "private" | "attention";

const FILTERS: { id: SiyumFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
  { id: "attention", label: "Perakim waiting 30+ days" },
];

export function SiyumimSection({
  siyumim,
  loading,
  error,
  onOpenSiyum,
}: {
  siyumim: AdminSiyum[];
  loading: boolean;
  error: string | null;
  onOpenSiyum: (id: string) => void;
}) {
  const [filter, setFilter] = useState<SiyumFilter>("all");
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const shown = siyumim.filter((s) => {
    if (filter === "public" && s.visibility !== "public") return false;
    if (filter === "private" && s.visibility !== "private") return false;
    if (filter === "attention" && s.stale === 0) return false;
    if (needle && ![s.dedication, s.occasion, s.ownerEmail, s.ownerName].some((v) => (v ?? "").toLowerCase().includes(needle))) {
      return false;
    }
    return true;
  });

  return (
    <>
      <label className="field">
        <span className="field__label">Find a siyum</span>
        <input
          className="field__input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dedication, occasion or who started it"
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
      ) : loading && siyumim.length === 0 ? (
        <p className="state state--loading">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="state state--empty">{siyumim.length === 0 ? "No siyumim yet." : "No siyum matches that."}</p>
      ) : (
        <div className="admin-rows">
          {shown.map((s) => (
            <button key={s.id} className="card admin-row" onClick={() => onOpenSiyum(s.id)}>
              <span className="admin-row__main">
                <span className="admin-row__name">{s.dedication}</span>
                <span className="admin-row__sub">
                  {[s.occasion, s.ownerName ?? s.ownerEmail, `started ${shortDate(s.createdAt)}`].filter(Boolean).join(" · ")}
                </span>
                <span className="admin-meter" aria-hidden="true">
                  <span className="admin-meter__learned" style={{ width: `${(s.learned / TOTAL_PERAKIM) * 100}%` }} />
                  <span className="admin-meter__taken" style={{ width: `${(s.taken / TOTAL_PERAKIM) * 100}%` }} />
                </span>
              </span>
              {s.visibility === "private" && <span className="pill pill--compact admin-row__tag">Private</span>}
              {s.stale > 0 && <span className="pill pill--compact admin-row__tag">{s.stale} waiting</span>}
              <span className="admin-row__meta">
                <span className="admin-row__figure">
                  {s.learned}/{TOTAL_PERAKIM}
                </span>
                <span className="admin-row__figure-label">learned · {s.taken} taken</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================
   One siyum — its perakim, and the moderation actions on it
   ============================================================ */

export function SiyumDrawer({
  siyum,
  onClose,
  onChanged,
  onOpenUser,
}: {
  siyum: AdminSiyum;
  onClose: () => void;
  onChanged: () => void;
  onOpenUser: (id: string) => void;
}) {
  useEscapeKey(onClose);
  const claims = useAdminSiyumClaims(siyum.id);
  const [dedication, setDedication] = useState(siyum.dedication);
  const [occasion, setOccasion] = useState(siyum.occasion ?? "");
  const [visibility, setVisibility] = useState(siyum.visibility);
  const [releasing, setReleasing] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const waiting = claims.data.filter((c) => !c.learned);
  const learned = claims.data.filter((c) => c.learned);
  const open = TOTAL_PERAKIM - claims.data.length;
  const changed =
    dedication.trim() !== siyum.dedication || (occasion.trim() || null) !== siyum.occasion || visibility !== siyum.visibility;

  async function act(fn: () => Promise<string | null>, success: string | null) {
    setBusy(true);
    setError(null);
    setNote(null);
    const err = await fn();
    setBusy(false);
    if (err) {
      setError(err);
      return false;
    }
    setNote(success);
    onChanged();
    return true;
  }

  const save = () =>
    act(async () => {
      const err = await adminAction("admin_update_siyum", {
        p_siyum_id: siyum.id,
        p_dedication: dedication,
        p_occasion: occasion,
        p_visibility: visibility,
      });
      if (!err) {
        await logAdminAction("edit_siyum", { id: siyum.ownerId ?? undefined, email: siyum.ownerEmail ?? undefined }, {
          siyum: siyum.id,
          dedication: dedication.trim(),
          visibility,
        });
      }
      return err;
    }, "Saved.");

  async function release() {
    if (!releasing) return;
    const ok = await act(async () => {
      const err = await adminAction("admin_release_claim", { p_claim_id: releasing.id });
      if (!err) await logAdminAction("release_claim", {}, { siyum: siyum.dedication, perek: releasing.label });
      return err;
    }, `${releasing.label} is open again.`);
    setReleasing(null);
    if (ok) claims.refresh();
  }

  async function remove() {
    const ok = await act(async () => {
      const err = await adminAction("admin_delete_siyum", { p_siyum_id: siyum.id });
      if (!err) {
        await logAdminAction("delete_siyum", { id: siyum.ownerId ?? undefined, email: siyum.ownerEmail ?? undefined }, {
          dedication: siyum.dedication,
        });
      }
      return err;
    }, null);
    setDeleting(false);
    if (ok) onClose();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-label="Siyum" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>

        <h2 className="modal__title">{siyum.dedication}</h2>
        <p className="admin-drawer__email">
          {siyum.visibility === "public" ? "Public board" : "Private — by link only"}
          {siyum.shareSlug && (
            <>
              {" · "}
              <a className="admin-link" href={`/?siyum=${encodeURIComponent(siyum.shareSlug)}`} target="_blank" rel="noreferrer">
                Open siyum page
              </a>
            </>
          )}
        </p>

        {note && <p className="callout callout--good">{note}</p>}
        {error && !releasing && !deleting && <p className="callout callout--bad">{error}</p>}

        <dl className="admin-drawer__facts">
          <div>
            <dt>Started by</dt>
            <dd>
              {siyum.ownerId ? (
                <button className="admin-link" onClick={() => onOpenUser(siyum.ownerId!)}>
                  {siyum.ownerName ?? siyum.ownerEmail ?? "—"}
                </button>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd>{shortDate(siyum.createdAt)}</dd>
          </div>
          <div>
            <dt>Target date</dt>
            <dd>{shortDate(siyum.targetDate)}</dd>
          </div>
          <div>
            <dt>Learned</dt>
            <dd>
              {siyum.learned} of {TOTAL_PERAKIM}
            </dd>
          </div>
          <div>
            <dt>Taken, not yet learned</dt>
            <dd>{claims.loading && claims.data.length === 0 ? siyum.taken : waiting.length}</dd>
          </div>
          <div>
            <dt>Still open</dt>
            <dd>{claims.loading && claims.data.length === 0 ? TOTAL_PERAKIM - siyum.learned - siyum.taken : open}</dd>
          </div>
        </dl>

        <h3 className="section-title">Edit</h3>
        <label className="field">
          <span className="field__label">Dedication</span>
          <input className="field__input" value={dedication} onChange={(e) => setDedication(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Occasion</span>
          <input className="field__input" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Who can see it</span>
          <select
            className="field__input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value === "private" ? "private" : "public")}
          >
            <option value="public">Public board</option>
            <option value="private">Private — only people with the link</option>
          </select>
          <span className="field__hint">Making it private takes it off the public board. The link keeps working.</span>
        </label>
        <button className="btn btn--secondary btn--compact" disabled={busy || !changed} onClick={save}>
          Save
        </button>

        <h3 className="section-title">Taken, not yet learned</h3>
        {claims.error ? (
          <p className="state state--error callout callout--bad">{claims.error}</p>
        ) : claims.loading && claims.data.length === 0 ? (
          <p className="state state--loading">Loading…</p>
        ) : waiting.length === 0 ? (
          <p className="state state--empty">None waiting.</p>
        ) : (
          <ul className="admin-roster">
            {waiting.map((c) => {
              const age = daysSince(c.claimedAt) ?? 0;
              const label = `${c.masechetEn} ${c.perek}`;
              return (
                <li key={c.id} className="admin-roster__row admin-roster__row--action">
                  <span className="admin-roster__name">
                    {label}
                    {age >= STALE_DAYS ? ` · waiting ${age} days` : ""}
                  </span>
                  <span className="admin-roster__email">
                    {c.userId ? (
                      <button className="admin-link" onClick={() => onOpenUser(c.userId!)}>
                        {c.name ?? c.email ?? "Someone"}
                      </button>
                    ) : (
                      (c.name ?? "Someone")
                    )}
                    {c.anonymous ? " (shown as anonymous)" : ""}
                    {c.email && !c.userId ? ` · ${c.email}` : ""} · taken {shortDate(c.claimedAt)}
                  </span>
                  <button className="btn btn--danger-outline btn--compact admin-roster__action" onClick={() => setReleasing({ id: c.id, label })}>
                    Release
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="section-title">Learned · {plural(learned.length, "perek", "perakim")}</h3>
        {learned.length === 0 ? (
          <p className="state state--empty">{claims.loading ? "Loading…" : "None yet."}</p>
        ) : (
          <ul className="admin-roster">
            {learned.map((c) => (
              <li key={c.id} className="admin-roster__row">
                <span className="admin-roster__name">
                  {c.masechetEn} {c.perek}
                </span>
                <span className="admin-roster__email">
                  {c.name ?? c.email ?? "Someone"}
                  {c.anonymous ? " (shown as anonymous)" : ""}
                </span>
                <span className="admin-roster__role">{shortDate(c.learnedAt)}</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="section-title">Delete siyum</h3>
        <p className="field__hint admin-drawer__hint">Removes the siyum and every perek taken on for it.</p>
        <button className="btn btn--danger btn--compact" onClick={() => setDeleting(true)}>
          Delete
        </button>

        {releasing && (
          <ConfirmModal
            title={`Release ${releasing.label}?`}
            body="It goes back to open so someone else can take it on. It will be recorded in the audit log."
            confirmLabel="Release"
            busyLabel="Releasing…"
            busy={busy}
            destructive
            error={error}
            onConfirm={release}
            onCancel={() => {
              setError(null);
              setReleasing(null);
            }}
          />
        )}
        {deleting && (
          <ConfirmModal
            title={`Delete the siyum "${siyum.dedication}"?`}
            body="This can't be undone. Every perek taken on for it is removed too. Type DELETE to confirm."
            icon="⚠"
            confirmLabel="Confirm delete"
            busyLabel="Deleting…"
            busy={busy}
            destructive
            typeToConfirm="DELETE"
            error={error}
            onConfirm={remove}
            onCancel={() => {
              setError(null);
              setDeleting(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
