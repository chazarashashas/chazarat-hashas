import { useState } from "react";
import { useAuth } from "../../utils/useAuth";
import { useGroupNotes, type GroupNote } from "../../utils/useGroupNotes";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import "./GroupNotes.css";

function relativeTime(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor((Date.now() - then.getTime()) / 3_600_000);
    if (hours <= 0) return "just now";
    if (hours === 1) return "an hour ago";
    return `${hours} hours ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString();
}

function NoteComposer({ onSave }: { onSave: (perek: number, mishnah: number, body: string) => Promise<string | null> }) {
  const [perek, setPerek] = useState("");
  const [mishnah, setMishnah] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const p = Number(perek);
    const m = Number(mishnah);
    if (!p || !m) {
      setError("Add the perek and mishnah this note is about.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onSave(p, m, body);
    setBusy(false);
    if (result) setError(result);
    else {
      setPerek("");
      setMishnah("");
      setBody("");
    }
  }

  return (
    <div className="group-notes__composer">
      <div className="group-notes__composer-ref">
        <input
          className="group-notes__composer-num"
          type="number"
          min={1}
          value={perek}
          onChange={(e) => setPerek(e.target.value)}
          placeholder="Perek"
        />
        <input
          className="group-notes__composer-num"
          type="number"
          min={1}
          value={mishnah}
          onChange={(e) => setMishnah(e.target.value)}
          placeholder="Mishnah"
        />
      </div>
      <textarea
        className="group-notes__composer-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a note against this mishnah…"
      />
      {error && (
        <p className="login-error" dir="ltr">
          {error}
        </p>
      )}
      <button className="group-notes__composer-save" disabled={busy || !body.trim()} onClick={handleSave}>
        {busy ? "Saving…" : "Save note"}
      </button>
    </div>
  );
}

function CommentComposer({ onSend }: { onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setBusy(true);
    await onSend(body);
    setBusy(false);
    setBody("");
  }

  return (
    <div className="group-notes__comment-composer">
      <input
        className="group-notes__comment-input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Reply…"
        disabled={busy}
        autoFocus
      />
      <button className="group-notes__comment-send" disabled={busy || !body.trim()} onClick={handleSend}>
        Reply
      </button>
    </div>
  );
}

function NoteCard({
  note,
  isMine,
  onEdit,
  onComment,
}: {
  note: GroupNote;
  isMine: boolean;
  onEdit: (body: string) => Promise<string | null>;
  onComment: (body: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [commentOpen, setCommentOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveEdit() {
    const result = await onEdit(draft);
    if (result) setError(result);
    else setEditing(false);
  }

  async function handleSendComment(body: string) {
    const result = await onComment(body);
    if (result) setError(result);
    else setCommentOpen(false);
  }

  return (
    <div className={"group-note" + (isMine ? " group-note--mine" : "")}>
      <div className="group-note__head">
        <span className="group-note__author">{note.authorName}</span>
        <span className="group-note__source" dir="ltr">
          Perek <span dir="rtl">{hebrewNumeral(note.perek)}</span>:{note.mishnah} · {relativeTime(note.createdAt)}
          {note.editedAt && " · edited"}
        </span>
        {isMine && !editing && (
          <button className="group-note__edit" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="group-note__edit-form">
          <textarea className="group-note__edit-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div className="group-note__edit-actions">
            <button className="group-note__edit-save" onClick={handleSaveEdit}>
              Save
            </button>
            <button
              className="group-note__edit-cancel"
              onClick={() => {
                setDraft(note.body);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="group-note__body">{note.body}</p>
      )}

      {note.comments.length > 0 && (
        <div className="group-note__comments">
          {note.comments.map((c) => (
            <div className="group-note__comment" key={c.id}>
              <span className="group-note__comment-author">{c.authorName}</span> {c.body}
              <span className="group-note__comment-time">{relativeTime(c.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="login-error" dir="ltr">
          {error}
        </p>
      )}

      {commentOpen ? (
        <CommentComposer onSend={handleSendComment} />
      ) : (
        <button className="group-note__comment-toggle" onClick={() => setCommentOpen(true)}>
          {note.comments.length > 0 ? "Add a comment" : "Be the first to comment"}
        </button>
      )}
    </div>
  );
}

/** Shared notes for one group's masechet — every note carries whose it
    is, only the author edits theirs, and anyone in the group can reply.
    See CHEVRUSA-CHABURA-BRIEF.md §4 and useGroupNotes. */
export function GroupNotes({ groupId, masechetEn, subtitle }: { groupId: string; masechetEn: string; subtitle: string }) {
  const { session } = useAuth();
  const { notes, addNote, editNote, addComment } = useGroupNotes(groupId, masechetEn);
  if (!session) return null;

  return (
    <div className="group-notes">
      <div className="group-notes__head">
        <p className="group-notes__title">Shared notes</p>
        <span className="group-notes__subtitle">{subtitle}</span>
      </div>
      <NoteComposer onSave={(p, m, body) => addNote(p, m, body)} />
      {notes.length > 0 && (
        <div className="group-notes__list">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              isMine={n.authorId === session.user.id}
              onEdit={(body) => editNote(n.id, body)}
              onComment={(body) => addComment(n.id, body)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
