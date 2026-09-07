import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type PendingInvite, type SentInvite } from "../../utils/useChevrusa";
import type { Pace } from "../../utils/useLearningProgress";
import { GateCard } from "../GateCard/GateCard";
import { GroupCard } from "../GroupCard/GroupCard";
import "./ChevrusaScreen.css";

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

function MasechetSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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

/**
 * One-on-one study partner pairing — a fixed pair, backed by Supabase
 * (groups, group_members, group_invites, group_activity — see
 * useChevrusa). Split out from group learning (see
 * ../Chabura/ChaburaScreen) since a chevrusa and a chabura are different
 * features: a chevrusa never has a teacher role, a join code, or more
 * than two members. An invite is stored by email and shows up under
 * "Pending invites" once that person logs in with a matching email.
 * "Learned today" is a green dot only — no streaks compared, no shared
 * notes, per the original design.
 */
interface ChevrusaScreenProps {
  onOpenLogin?: (mode?: "signIn" | "signUp") => void;
}

export function ChevrusaScreen({ onOpenLogin }: ChevrusaScreenProps) {
  const { session } = useAuth();
  const { groups, pendingInvites, sentInvites, createGroup, addMembers, acceptInvite, declineInvite, cancelInvite, leaveGroup } =
    useChevrusa();

  const [inviteValue, setInviteValue] = useState("");
  const [masechetValue, setMasechetValue] = useState("");
  const [invitePace, setInvitePace] = useState<Pace>("1");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <p className="panel__subtitle">Pair one-on-one with a study partner, one masechet at a time.</p>
          {onOpenLogin && (
            <GateCard
              title="Starting a chevrusa needs an account"
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
  const chevrusaPending = pendingInvites.filter((inv) => !inv.isChabura);
  const chevrusaSent = sentInvites.filter((inv) => !inv.isChabura);

  return (
    <div className="stage">
      <div className="panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Chevrusa</h1>
        <p className="panel__subtitle">
          Pair one-on-one with a study partner, one masechet at a time, so you can be in several,
          each on something different. Know when they've learned today — no streaks compared, no
          ranking, just "they showed up."
        </p>

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

          <button className="restart" disabled={busy || !inviteValue || !masechetValue} onClick={handleSendInvite}>
            {busy ? "Sending…" : "Send invite"}
          </button>
          <FormHint
            missing={[!inviteValue ? "their email" : null, !masechetValue ? "a masechet" : null].filter(
              (m): m is string => m !== null,
            )}
          />
        </div>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Your chevrusot</p>
          {chevrusot.length === 0 ? (
            <p className="chevrusa-empty">
              Not paired with anyone yet. Each pairing you make will show its own masechet here.
            </p>
          ) : (
            chevrusot.map((g) => (
              <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Pending invites</p>
          {chevrusaPending.length === 0 ? (
            <p className="chevrusa-empty">No pending invites.</p>
          ) : (
            chevrusaPending.map((inv) => (
              <div key={inv.id} className="invite-row">
                <span className="invite-row__text">
                  Chevrusa — {inv.masechetEn}
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
          {chevrusaSent.length === 0 ? (
            <p className="chevrusa-empty">No outstanding invites.</p>
          ) : (
            chevrusaSent.map((inv) => (
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
