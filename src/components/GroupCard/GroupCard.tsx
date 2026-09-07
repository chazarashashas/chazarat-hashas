import { useRef, useState } from "react";
import type { Group, GroupMember } from "../../utils/useChevrusa";
import { useGroupNudges } from "../../utils/useGroupNudges";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { GroupNotes } from "./GroupNotes";
import "./GroupCard.css";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function memberLabel(m: { firstName: string | null; username: string | null }): string {
  return m.firstName ?? m.username ?? "Someone";
}

/** The inline composer for one member's Nudge pill — opens directly
    beneath that row, never a modal (CHEVRUSA-CHABURA-BRIEF.md §3). Empty
    is a valid send: the default chizuk still goes, the note is only for
    whoever wants to add their own line. */
function NudgeComposer({
  name,
  onSend,
  onCancel,
}: {
  name: string;
  onSend: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEscapeKey(onCancel);

  async function handleSend() {
    setBusy(true);
    await onSend(note);
    setBusy(false);
  }

  return (
    <div className="nudge-composer">
      <p className="nudge-composer__title">Nudge {name}</p>
      <p className="nudge-composer__hint">It arrives as a short word of chizuk from you — add a line if you have one.</p>
      <input
        className="nudge-composer__input"
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a word of your own — optional"
        maxLength={200}
        disabled={busy}
      />
      <div className="nudge-composer__actions">
        <button className="nudge-composer__send" disabled={busy} onClick={handleSend}>
          {busy ? "Sending…" : "Send the nudge"}
        </button>
        <button className="nudge-composer__cancel" disabled={busy} onClick={onCancel}>
          Not now
        </button>
      </div>
    </div>
  );
}

/** One chevrusa or chabura's member list and actions — shared by both
    the Chevrusa and Chabura screens, since a pairing and a group are
    rendered identically once you have the Group data: same avatar-dot
    member row, same invite/leave actions, same class-visibility note. */
export function GroupCard({
  group,
  meId,
  onLeave,
  onAddMembers,
}: {
  group: Group;
  meId: string;
  onLeave: (groupId: string) => void;
  onAddMembers: (groupId: string, email: string) => Promise<string | null>;
}) {
  const today = todayStr();
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [nudgeOpenFor, setNudgeOpenFor] = useState<string | null>(null);
  const [nudgeError, setNudgeError] = useState<string | null>(null);
  const [justNudged, setJustNudged] = useState<string | null>(null);
  const { nudgedTodayIds, sendNudge } = useGroupNudges(group.id);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function closeNudgeComposer(userId: string) {
    setNudgeOpenFor(null);
    pillRefs.current.get(userId)?.focus();
  }

  const me = group.members.find((m) => m.userId === meId);
  // Class chabura: only the teacher nudges, and only talmidim — matches
  // the brief's "a rebbe can nudge any talmid; talmidim do not nudge
  // each other there." Friends chabura or chevrusa: anyone nudges anyone.
  function canNudge(m: GroupMember): boolean {
    if (m.userId === meId) return false;
    if (m.lastLearnedDate === today) return false;
    if (nudgedTodayIds.has(m.userId)) return false;
    if (!group.isClass) return true;
    return me?.role === "teacher" && m.role !== "teacher";
  }

  async function handleAdd() {
    setAddBusy(true);
    setAddError(null);
    const result = await onAddMembers(group.id, addEmail);
    setAddBusy(false);
    if (result) {
      setAddError(result);
    } else {
      setAddEmail("");
      setAddOpen(false);
    }
  }

  async function handleSendNudge(toUserId: string, note: string) {
    setNudgeError(null);
    const result = await sendNudge(toUserId, note);
    if (result) {
      setNudgeError(result);
    } else {
      setNudgeOpenFor(null);
      setJustNudged(toUserId);
      window.setTimeout(() => setJustNudged((prev) => (prev === toUserId ? null : prev)), 3000);
    }
  }

  return (
    <div className="group-card">
      <div className="group-card__head">
        <span className="group-card__title">{group.name || group.masechetEn}</span>
        {group.name && <span className="group-card__masechet">{group.masechetEn}</span>}
        {group.isClass && <span className="group-card__class-badge">Class</span>}
      </div>
      <div className="group-card__members">
        {group.members.map((m) => (
          <div key={m.userId} className="group-member-wrap">
            <span className="group-member">
              <span
                className={"group-member__dot" + (m.lastLearnedDate === today ? " group-member__dot--done" : "")}
                role="img"
                aria-label={m.lastLearnedDate === today ? "learned today" : "not yet today"}
              />
              {m.userId === meId ? "You" : memberLabel(m)}
              {m.role === "teacher" && <span className="group-member__role"> (Rebbe)</span>}
              {justNudged === m.userId ? (
                <span className="group-member__nudged">Nudging</span>
              ) : (
                canNudge(m) && (
                  <button
                    ref={(el) => {
                      if (el) pillRefs.current.set(m.userId, el);
                      else pillRefs.current.delete(m.userId);
                    }}
                    className="group-member__nudge-pill"
                    onClick={() => {
                      setNudgeError(null);
                      setNudgeOpenFor(nudgeOpenFor === m.userId ? null : m.userId);
                    }}
                  >
                    Nudge
                  </button>
                )
              )}
            </span>
            {nudgeOpenFor === m.userId && (
              <NudgeComposer
                name={memberLabel(m)}
                onSend={(note) => handleSendNudge(m.userId, note)}
                onCancel={() => closeNudgeComposer(m.userId)}
              />
            )}
          </div>
        ))}
      </div>
      {nudgeError && (
        <p className="login-error" dir="ltr">
          {nudgeError}
        </p>
      )}
      {group.isClass && group.members.some((m) => m.userId === meId && m.role === "member") && (
        <p className="group-card__class-note">Only you and the Rebbe can see your progress here.</p>
      )}

      <div className="group-card__actions">
        {group.isChabura &&
          (!group.isClass || group.members.some((m) => m.userId === meId && m.role === "teacher")) &&
          (addOpen ? (
            <div className="group-card__add-row">
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="new.member@example.com"
              />
              <button className="group-card__add-confirm" disabled={addBusy || !addEmail} onClick={handleAdd}>
                {addBusy ? "…" : "Invite"}
              </button>
              <button className="group-card__link" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="group-card__link" onClick={() => setAddOpen(true)}>
              + Invite more
            </button>
          ))}
        <button className="group-card__link group-card__link--leave" onClick={() => onLeave(group.id)}>
          Leave
        </button>
      </div>
      {addError && (
        <p className="login-error" dir="ltr">
          {addError}
        </p>
      )}
      <GroupNotes
        groupId={group.id}
        masechetEn={group.masechetEn}
        subtitle={group.isChabura ? "anyone writes, everyone can reply" : "either of you writes, both can reply"}
      />
    </div>
  );
}
