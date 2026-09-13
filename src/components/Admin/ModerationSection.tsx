import { useState } from "react";
import { useAdminContent, type AdminPost, type AdminSiyum } from "../../utils/useAdminData";
import { adminAction } from "../../utils/adminRpc";
import { logAdminAction } from "../../utils/useAdminAudit";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import { fullName, shortDate, shortDateTime } from "./adminShared";

type Kind = "notes" | "comments" | "dedications" | "names";

const KINDS: { id: Kind; label: string }[] = [
  { id: "notes", label: "Chabura notes" },
  { id: "comments", label: "Comments" },
  { id: "dedications", label: "Siyum dedications" },
  { id: "names", label: "Names" },
];

/**
 * Everything one person writes that other people read — chabura notes and
 * their comments, siyum dedications, usernames. Private perek notes and
 * concept notes are never here, and the SQL never reads them.
 */
export function ModerationSection({
  siyumim,
  onOpenUser,
  onOpenGroup,
  onOpenSiyum,
}: {
  siyumim: AdminSiyum[];
  onOpenUser: (id: string) => void;
  onOpenGroup: (id: string) => void;
  onOpenSiyum: (id: string) => void;
}) {
  const content = useAdminContent(true);
  const [kind, setKind] = useState<Kind>("notes");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<{ kind: "notes" | "comments"; post: AdminPost } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const needle = search.trim().toLowerCase();
  const matches = (...values: (string | null)[]) => !needle || values.some((v) => (v ?? "").toLowerCase().includes(needle));

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const { kind: k, post } = deleting;
    const err =
      k === "notes"
        ? await adminAction("admin_delete_group_note", { p_note_id: post.id })
        : await adminAction("admin_delete_note_comment", { p_comment_id: post.id });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    await logAdminAction(k === "notes" ? "delete_note" : "delete_comment", { id: post.authorId ?? undefined, email: post.authorEmail ?? undefined }, {
      group: post.groupName,
      text: post.body.slice(0, 200),
    });
    setDeleting(null);
    setNote(k === "notes" ? "Note deleted, with its comments." : "Comment deleted.");
    content.refresh();
  }

  function posts(list: AdminPost[], k: "notes" | "comments") {
    const shown = list.filter((p) => matches(p.body, p.authorEmail, p.authorName, p.groupName));
    if (content.loading && list.length === 0) return <p className="state state--loading">Loading…</p>;
    if (shown.length === 0) return <p className="state state--empty">{list.length === 0 ? "Nothing written yet." : "Nothing matches that."}</p>;
    return (
      <div className="admin-rows">
        {shown.map((p) => (
          <div key={p.id} className="card admin-post">
            <p className="admin-post__body">{p.body}</p>
            <div className="admin-post__meta">
              {p.authorId ? (
                <button className="admin-link" onClick={() => onOpenUser(p.authorId!)}>
                  {p.authorName ?? p.authorEmail ?? "Someone"}
                </button>
              ) : (
                <span>{p.authorName ?? p.authorEmail ?? "Someone"}</span>
              )}
              <span>·</span>
              <button className="admin-link" onClick={() => onOpenGroup(p.groupId)}>
                {p.groupName}
              </button>
              <span>
                · {p.masechetEn} {p.perek}:{p.mishnah} · {shortDateTime(p.createdAt)}
              </span>
              <button className="btn btn--danger-outline btn--compact admin-post__action" onClick={() => setDeleting({ kind: k, post: p })}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="pill-row admin-subfilters">
        {KINDS.map((k) => (
          <button
            key={k.id}
            className={"pill pill--compact" + (kind === k.id ? " pill--active" : "")}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field__label">Search</span>
        <input className="field__input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Words, names or emails" />
        <span className="field__hint">Newest first. Private perek notes are never shown here.</span>
      </label>

      {note && <p className="callout callout--good">{note}</p>}
      {content.error && <p className="state state--error callout callout--bad">{content.error}</p>}

      {kind === "notes" && posts(content.data.notes, "notes")}
      {kind === "comments" && posts(content.data.comments, "comments")}

      {kind === "dedications" && (
        <div className="admin-rows">
          {siyumim
            .filter((s) => matches(s.dedication, s.occasion, s.ownerEmail, s.ownerName))
            .map((s) => (
              <button key={s.id} className="card admin-row" onClick={() => onOpenSiyum(s.id)}>
                <span className="admin-row__main">
                  <span className="admin-row__name">{s.dedication}</span>
                  <span className="admin-row__sub">
                    {[s.occasion, s.ownerName ?? s.ownerEmail, shortDate(s.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="pill pill--compact admin-row__tag">{s.visibility === "public" ? "Public" : "Private"}</span>
                <span className="admin-row__meta">
                  <span className="admin-row__figure-label">Edit</span>
                </span>
              </button>
            ))}
        </div>
      )}

      {kind === "names" && (
        <div className="admin-rows">
          {content.data.names
            .filter((n) => matches(n.username, n.firstName, n.lastName, n.email))
            .map((n) => (
              <button key={n.userId} className="card admin-row" onClick={() => onOpenUser(n.userId)}>
                <span className="admin-row__main">
                  <span className="admin-row__name">{n.username ?? "—"}</span>
                  <span className="admin-row__sub">
                    {[fullName(n), n.email, `joined ${shortDate(n.createdAt)}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="admin-row__meta">
                  <span className="admin-row__figure-label">Edit</span>
                </span>
              </button>
            ))}
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title={deleting.kind === "notes" ? "Delete this note?" : "Delete this comment?"}
          body={
            deleting.kind === "notes"
              ? "The note and every comment on it are removed for the whole chabura. It will be recorded in the audit log."
              : "The comment is removed for the whole chabura. It will be recorded in the audit log."
          }
          confirmLabel="Delete"
          busyLabel="Deleting…"
          busy={busy}
          destructive
          error={error}
          onConfirm={remove}
          onCancel={() => {
            setError(null);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
