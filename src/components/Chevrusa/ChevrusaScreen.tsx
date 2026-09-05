import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type Group, type PendingInvite, type SentInvite } from "../../utils/useChevrusa";
import "./ChevrusaScreen.css";

type Mode = "chevrusa" | "chabura";

function MasechetSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a masechet…</option>
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
  );
}

function memberLabel(m: { firstName: string | null; username: string | null }): string {
  return m.firstName ?? m.username ?? "Someone";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function GroupCard({
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
      </div>
      <div className="group-card__members">
        {group.members.map((m) => (
          <span key={m.userId} className="group-member">
            <span className={"group-member__dot" + (m.lastLearnedDate === today ? " group-member__dot--done" : "")} />
            {m.userId === meId ? "You" : memberLabel(m)}
          </span>
        ))}
      </div>

      <div className="group-card__actions">
        {group.isChabura &&
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

/**
 * Real chevrusa/chabura pairing, backed by Supabase (groups,
 * group_members, group_invites, group_activity — see useChevrusa). An
 * invite is stored by email and shows up under "Pending invites" once
 * that person logs in with a matching email. "Learned today" is a
 * green dot only — no streaks compared, no shared notes, per the
 * original design.
 */
interface ChevrusaScreenProps {
  onOpenLogin?: () => void;
}

export function ChevrusaScreen({ onOpenLogin }: ChevrusaScreenProps) {
  const { session } = useAuth();
  const {
    groups,
    pendingInvites,
    sentInvites,
    createGroup,
    addMembers,
    acceptInvite,
    declineInvite,
    cancelInvite,
    leaveGroup,
  } = useChevrusa();

  const [mode, setMode] = useState<Mode>("chevrusa");
  const [inviteValue, setInviteValue] = useState("");
  const [masechetValue, setMasechetValue] = useState("");

  const [chaburaName, setChaburaName] = useState("");
  const [chaburaMasechet, setChaburaMasechet] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateMember(index: number, value: string) {
    setMemberEmails((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addMemberField() {
    setMemberEmails((prev) => [...prev, ""]);
  }

  function removeMemberField(index: number) {
    setMemberEmails((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSendInvite() {
    setError(null);
    setBusy(true);
    const result = await createGroup(masechetValue, false, null, [inviteValue]);
    setBusy(false);
    if (result) {
      setError(result);
    } else {
      setInviteValue("");
      setMasechetValue("");
    }
  }

  async function handleStartChabura() {
    setError(null);
    setBusy(true);
    const result = await createGroup(chaburaMasechet, true, chaburaName, memberEmails);
    setBusy(false);
    if (result) {
      setError(result);
    } else {
      setChaburaName("");
      setChaburaMasechet("");
      setMemberEmails([""]);
    }
  }

  async function handleAccept(invite: PendingInvite) {
    setError(null);
    const result = await acceptInvite(invite);
    if (result) setError(result);
  }

  async function handleDecline(invite: PendingInvite) {
    setError(null);
    const result = await declineInvite(invite);
    if (result) setError(result);
  }

  async function handleCancel(invite: SentInvite) {
    setError(null);
    const result = await cancelInvite(invite);
    if (result) setError(result);
  }

  async function handleLeave(groupId: string) {
    setError(null);
    const result = await leaveGroup(groupId);
    if (result) setError(result);
  }

  async function handleAddMembers(groupId: string, email: string) {
    return addMembers(groupId, [email]);
  }

  if (!session) {
    return (
      <div className="stage">
        <div className="panel">
          <p className="app-title">Chazarat Hashas</p>
          <h1 className="panel__title">Chevrusa</h1>
          <p className="panel__subtitle">
            Pair one-on-one, or start a chabura with a whole group — one masechet at a time.
          </p>
          <div className="note-banner login-notice">
            Log in first — chevrusa pairing is tied to your account, so an invite can reach someone
            else's.
          </div>
          {onOpenLogin && (
            <button className="restart" onClick={onOpenLogin}>
              Go to Log In
            </button>
          )}
        </div>
      </div>
    );
  }

  const chevrusot = groups.filter((g) => !g.isChabura);
  const chaburot = groups.filter((g) => g.isChabura);

  return (
    <div className="stage">
      <div className="panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Chevrusa</h1>
        <p className="panel__subtitle">
          Pair one-on-one, or start a chabura with a whole group — one masechet at a time, so you can
          be in several, each on something different. Know when the group has learned today — no
          streaks compared, no ranking, just "they showed up."
        </p>

        {error && (
          <p className="login-error" dir="ltr">
            {error}
          </p>
        )}

        <div className="pill-row">
          <button
            className={"pill" + (mode === "chevrusa" ? " pill--active" : "")}
            onClick={() => setMode("chevrusa")}
          >
            Chevrusa (one partner)
          </button>
          <button
            className={"pill" + (mode === "chabura" ? " pill--active" : "")}
            onClick={() => setMode("chabura")}
          >
            Chabura (group)
          </button>
        </div>

        {mode === "chevrusa" ? (
          <>
            <label className="login-field">
              <span className="login-field__label">Invite by email</span>
              <input
                type="email"
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder="chevrusa@example.com"
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">Masechet to learn together</span>
              <MasechetSelect value={masechetValue} onChange={setMasechetValue} />
            </label>

            <button
              className="restart"
              disabled={busy || !inviteValue || !masechetValue}
              onClick={handleSendInvite}
            >
              {busy ? "Sending…" : "Send invite"}
            </button>

            <div className="chevrusa-section">
              <p className="chevrusa-section__label">Your chevrusot</p>
              {chevrusot.length === 0 ? (
                <p className="chevrusa-empty">
                  Not paired with anyone yet. Each pairing you make will show its own masechet here.
                </p>
              ) : (
                chevrusot.map((g) => <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />)
              )}
            </div>
          </>
        ) : (
          <>
            <label className="login-field">
              <span className="login-field__label">Chabura name</span>
              <input
                type="text"
                value={chaburaName}
                onChange={(e) => setChaburaName(e.target.value)}
                placeholder="e.g. Tuesday Night Seder Nezikin"
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">Masechet to learn together</span>
              <MasechetSelect value={chaburaMasechet} onChange={setChaburaMasechet} />
            </label>

            <div className="login-field">
              <span className="login-field__label">Invite members by email</span>
              {memberEmails.map((email, i) => (
                <div className="chabura-member-row" key={i}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateMember(i, e.target.value)}
                    placeholder="member@example.com"
                  />
                  <button
                    type="button"
                    className="chabura-member-remove"
                    onClick={() => removeMemberField(i)}
                    disabled={memberEmails.length === 1}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="chabura-add-member" onClick={addMemberField}>
                + Add another member
              </button>
            </div>

            <button
              className="restart"
              disabled={busy || !chaburaName || !chaburaMasechet}
              onClick={handleStartChabura}
            >
              {busy ? "Creating…" : "Start chabura"}
            </button>

            <div className="chevrusa-section">
              <p className="chevrusa-section__label">Your chaburot</p>
              {chaburot.length === 0 ? (
                <p className="chevrusa-empty">
                  Not in any chabura yet. Each group you start or join will show here, with its own
                  masechet and member list.
                </p>
              ) : (
                chaburot.map((g) => <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />)
              )}
            </div>
          </>
        )}

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Pending invites</p>
          {pendingInvites.length === 0 ? (
            <p className="chevrusa-empty">No pending invites.</p>
          ) : (
            pendingInvites.map((inv) => (
              <div key={inv.id} className="invite-row">
                <span className="invite-row__text">
                  {inv.isChabura ? `Chabura "${inv.groupName}"` : "Chevrusa"} — {inv.masechetEn}
                  {inv.fromName && <span className="invite-row__from"> · from {inv.fromName}</span>}
                </span>
                <button className="invite-row__accept" onClick={() => handleAccept(inv)}>
                  Accept
                </button>
                <button className="invite-row__decline" onClick={() => handleDecline(inv)}>
                  Decline
                </button>
              </div>
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Invites you've sent</p>
          {sentInvites.length === 0 ? (
            <p className="chevrusa-empty">No outstanding invites.</p>
          ) : (
            sentInvites.map((inv) => (
              <div key={inv.id} className="invite-row">
                <span className="invite-row__text">
                  {inv.invitedEmail} — {inv.masechetEn}
                  <span className="invite-row__from">
                    {" "}
                    · {inv.status === "declined" ? "declined" : "waiting for them to accept"}
                  </span>
                </span>
                <button className="invite-row__decline" onClick={() => handleCancel(inv)}>
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
