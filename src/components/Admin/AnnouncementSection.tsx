import { useState } from "react";
import { useAdminAnnouncement, type AdminAnnouncement } from "../../utils/useAdminData";
import { adminAction } from "../../utils/adminRpc";
import { logAdminAction } from "../../utils/useAdminAudit";
import { AnnouncementBanner } from "../Announcement/AnnouncementBanner";
import { shortDateTime } from "./adminShared";

const MAX_LENGTH = 280;

/** One message at the top of the app for everyone — a chag message, an
    outage notice. Loads first, then the editor mounts with what is saved. */
export function AnnouncementSection() {
  const saved = useAdminAnnouncement(true);
  if (saved.error) return <p className="state state--error callout callout--bad">{saved.error}</p>;
  if (saved.loading && saved.data.updatedAt === null) return <p className="state state--loading">Loading…</p>;
  return <AnnouncementEditor key={saved.data.updatedAt ?? "new"} saved={saved.data} onSaved={saved.refresh} />;
}

function AnnouncementEditor({ saved, onSaved }: { saved: AdminAnnouncement; onSaved: () => void }) {
  const [message, setMessage] = useState(saved.message);
  const [active, setActive] = useState(saved.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const trimmed = message.trim();
  const changed = trimmed !== saved.message || active !== saved.active;

  async function save() {
    setBusy(true);
    setError(null);
    setNote(null);
    const err = await adminAction("admin_set_announcement", { p_message: trimmed, p_active: active && trimmed !== "" });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    await logAdminAction("set_announcement", {}, { active: active && trimmed !== "", message: trimmed });
    setNote(active && trimmed ? "Saved. Everyone sees it the next time they open the app." : "Saved. Nobody sees a message now.");
    onSaved();
  }

  return (
    <div className="card admin-card">
      <p className="admin-drawer__line admin-status">
        {saved.active ? "Showing to everyone" : "Not showing"}
        {saved.updatedAt ? ` · last changed ${shortDateTime(saved.updatedAt)}` : ""}
      </p>

      <label className="field">
        <span className="field__label">Message</span>
        <textarea
          className="field__input admin-textarea"
          value={message}
          maxLength={MAX_LENGTH}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Chag sameach! Daily Limmud picks up again on Motzei Yom Tov."
        />
        <span className="field__hint">
          {trimmed.length}/{MAX_LENGTH}. Anyone can close it; a new or edited message shows again.
        </span>
      </label>

      <label className="admin-check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Show it at the top of the app for everyone
      </label>

      {trimmed && (
        <>
          <p className="field__label admin-preview-label">Preview</p>
          <AnnouncementBanner message={trimmed} />
        </>
      )}

      {note && <p className="callout callout--good">{note}</p>}
      {error && <p className="callout callout--bad">{error}</p>}

      <button className="btn btn--primary btn--compact" disabled={busy || !changed || (active && !trimmed)} onClick={save}>
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
