import { useState } from "react";
import type { Group } from "../../utils/useChevrusa";
import "./GroupCard.css";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function memberLabel(m: { firstName: string | null; username: string | null }): string {
  return m.firstName ?? m.username ?? "Someone";
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

  return (
    <div className="group-card">
      <div className="group-card__head">
        <span className="group-card__title">{group.name || group.masechetEn}</span>
        {group.name && <span className="group-card__masechet">{group.masechetEn}</span>}
        {group.isClass && <span className="group-card__class-badge">Class</span>}
      </div>
      <div className="group-card__members">
        {group.members.map((m) => (
          <span key={m.userId} className="group-member">
            <span className={"group-member__dot" + (m.lastLearnedDate === today ? " group-member__dot--done" : "")} />
            {m.userId === meId ? "You" : memberLabel(m)}
            {m.role === "teacher" && <span className="group-member__role"> (Rebbe)</span>}
          </span>
        ))}
      </div>
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
    </div>
  );
}
