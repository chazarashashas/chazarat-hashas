import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type Group, type PendingInvite, type SentInvite } from "../../utils/useChevrusa";
import type { Pace } from "../../utils/useLearningProgress";
import { GateCard } from "../GateCard/GateCard";
import "./ChevrusaScreen.css";

type Mode = "chevrusa" | "chabura";
type ChaburaKind = "friends" | "class";

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: "1", label: "1 Mishnah/day" },
  { value: "2", label: "2 Mishnayot/day" },
  { value: "perek", label: "1 Perek/day" },
];

function PaceSelect({ value, onChange }: { value: Pace; onChange: (value: Pace) => void }) {
  return (
    <div className="pill-row">
      {PACE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={"pill" + (value === opt.value ? " pill--active" : "")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="chevrusa-error" dir="ltr">
      <span className="chevrusa-error__dot" aria-hidden="true" />
      {message}
    </div>
  );
}

/** A disabled submit button with no explanation just looks broken —
    names whatever's still missing so the next step is obvious, without
    it reading as an error (nothing has gone wrong yet). */
function missingFieldsHint(missing: string[]): string | null {
  if (missing.length === 0) return null;
  if (missing.length === 1) return `Add ${missing[0]} to continue.`;
  return `Add ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]} to continue.`;
}

function FormHint({ missing }: { missing: string[] }) {
  const hint = missingFieldsHint(missing);
  if (!hint) return null;
  return <p className="chevrusa-form-hint">{hint}</p>;
}

/** Joining by code is the faster alternative to being emailed an invite
    — a rebbe reads the code out in shiur rather than typing eighteen
    addresses. Entering it is the student's own consenting action, same
    as accepting an emailed invite. */
function JoinByCode() {
  const { joinByCode } = useChevrusa();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function handleJoin() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const result = await joinByCode(code);
    setBusy(false);
    if (result) setError(result);
    else {
      setJoined(true);
      setCode("");
      window.setTimeout(() => setJoined(false), 3000);
    }
  }

  return (
    <div className="join-by-code">
      <label className="login-field">
        <span className="login-field__label">Have a join code from your rebbe?</span>
        <div className="join-by-code__row">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7M4XQ"
            maxLength={6}
          />
          <button className="join-by-code__btn" disabled={busy || !code.trim()} onClick={handleJoin}>
            {busy ? "…" : joined ? "Joined ✓" : "Join"}
          </button>
        </div>
      </label>
      {error && <ErrorRow message={error} />}
    </div>
  );
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

/**
 * Real chevrusa/chabura pairing, backed by Supabase (groups,
 * group_members, group_invites, group_activity — see useChevrusa). An
 * invite is stored by email and shows up under "Pending invites" once
 * that person logs in with a matching email. "Learned today" is a
 * green dot only — no streaks compared, no shared notes, per the
 * original design.
 */
interface ChevrusaScreenProps {
  onOpenLogin?: (mode?: "signIn" | "signUp") => void;
  onOpenNishmat?: () => void;
}

export function ChevrusaScreen({ onOpenLogin, onOpenNishmat }: ChevrusaScreenProps) {
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
  const [invitePace, setInvitePace] = useState<Pace>("1");

  const [chaburaKind, setChaburaKind] = useState<ChaburaKind>("friends");
  const [chaburaName, setChaburaName] = useState("");
  const [chaburaMasechet, setChaburaMasechet] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);
  const [chaburaPace, setChaburaPace] = useState<Pace>("1");

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
    const result = await createGroup(masechetValue, false, null, [inviteValue], invitePace);
    setBusy(false);
    if (result) {
      setError(result);
    } else {
      setInviteValue("");
      setMasechetValue("");
      setInvitePace("1");
    }
  }

  async function handleStartChabura() {
    setError(null);
    setBusy(true);
    const result = await createGroup(
      chaburaMasechet,
      true,
      chaburaName,
      memberEmails,
      chaburaPace,
      chaburaKind === "class",
    );
    setBusy(false);
    if (result) {
      setError(result);
    } else {
      setChaburaName("");
      setChaburaMasechet("");
      setMemberEmails([""]);
      setChaburaPace("1");
      setChaburaKind("friends");
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
          {onOpenLogin && (
            <GateCard
              title="Starting a chabura needs an account"
              body="Your chevrusa has to be able to find you, and you both need to see who learned today. That only works with an account behind it."
              onCreateAccount={() => onOpenLogin("signUp")}
              onSignIn={() => onOpenLogin("signIn")}
            />
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

        {onOpenNishmat && (
          <button className="chevrusa-nishmat-link" onClick={onOpenNishmat}>
            Looking for a bigger group commitment? Join a siyum in L'Iluy Nishmat →
          </button>
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
            <div className="chevrusa-form">
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

              <label className="login-field">
                <span className="login-field__label">Pace</span>
                <PaceSelect value={invitePace} onChange={setInvitePace} />
              </label>

              {error && <ErrorRow message={error} />}

              <button
                className="restart"
                disabled={busy || !inviteValue || !masechetValue}
                onClick={handleSendInvite}
              >
                {busy ? "Sending…" : "Send invite"}
              </button>
              <FormHint
                missing={[
                  !inviteValue ? "their email" : null,
                  !masechetValue ? "a masechet" : null,
                ].filter((m): m is string => m !== null)}
              />
            </div>

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
            <JoinByCode />

            <label className="login-field">
              <span className="login-field__label">Learning with</span>
              <div className="pill-row">
                <button
                  className={"pill" + (chaburaKind === "friends" ? " pill--active" : "")}
                  onClick={() => setChaburaKind("friends")}
                >
                  Friends and Family
                </button>
                <button
                  className={"pill" + (chaburaKind === "class" ? " pill--active" : "")}
                  onClick={() => setChaburaKind("class")}
                >
                  Rebbe & Class
                </button>
              </div>
            </label>

            {chaburaKind === "class" && (
              <div className="note-banner login-notice">
                As the Rebbe, you'll see each student's learned-today status. Students only see their
                own — not their classmates'.
              </div>
            )}

            <div className="chevrusa-form">
              <label className="login-field">
                <span className="login-field__label">{chaburaKind === "class" ? "Class name" : "Chabura name"}</span>
                <input
                  type="text"
                  value={chaburaName}
                  onChange={(e) => setChaburaName(e.target.value)}
                  placeholder={chaburaKind === "class" ? "e.g. 9th Grade Gemara" : "e.g. Tuesday Night Seder Nezikin"}
                />
              </label>

              <label className="login-field">
                <span className="login-field__label">Masechet to learn together</span>
                <MasechetSelect value={chaburaMasechet} onChange={setChaburaMasechet} />
              </label>

              <label className="login-field">
                <span className="login-field__label">Pace</span>
                <PaceSelect value={chaburaPace} onChange={setChaburaPace} />
              </label>

              <div className="login-field">
                <span className="login-field__label">
                  {chaburaKind === "class" ? "Invite students by email" : "Invite members by email"}
                </span>
                {memberEmails.map((email, i) => (
                  <div className="chabura-member-row" key={i}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateMember(i, e.target.value)}
                      placeholder={chaburaKind === "class" ? "student@example.com" : "member@example.com"}
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

              {error && <ErrorRow message={error} />}

              <button
                className="restart"
                disabled={busy || !chaburaName || !chaburaMasechet}
                onClick={handleStartChabura}
              >
                {busy ? "Creating…" : chaburaKind === "class" ? "Start class" : "Start chabura"}
              </button>
              <FormHint
                missing={[
                  !chaburaName ? (chaburaKind === "class" ? "a class name" : "a chabura name") : null,
                  !chaburaMasechet ? "a masechet" : null,
                ].filter((m): m is string => m !== null)}
              />
            </div>

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
