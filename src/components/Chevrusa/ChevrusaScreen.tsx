import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type PendingInvite, type SentInvite } from "../../utils/useChevrusa";
import type { Pace } from "../../utils/useLearningProgress";
import { GroupCard } from "../GroupCard/GroupCard";
import { ReceivedNudges } from "../GroupCard/ReceivedNudges";
import {
  FactCard,
  InviteRowPreview,
  WeekDotsPreview,
  NudgeCardPreview,
  NoteCardPreview,
  GateCTA,
} from "../SignedOutGate/SignedOutGate";
import { CreateCard, FieldInset, PaceSegment, CreateCta, InviteQueueRow } from "../GroupCreateCard/GroupCreateCard";
import "./ChevrusaScreen.css";

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: "1", label: "1 Mishnah/day" },
  { value: "2", label: "2/day" },
  { value: "perek", label: "1 Perek/day" },
];

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
          <h1 className="gate2-title">Chevrusa</h1>
          <p className="gate2-subtitle">One partner, one masechet, each of you learning when the day allows.</p>

          <div className="gate2-facts">
            <FactCard head="Invite by email, and you are set" body="Once they accept, they see your progress on the masechet and you see theirs.">
              <InviteRowPreview email="yehuda.klein@…" pillLabel="Accepted" />
            </FactCard>
            <FactCard head="A dot for each day you learn" body="Enough to know your chevrusa is in it with you.">
              <WeekDotsPreview pattern={[true, true, false, true, true, false, true]} note="both, 5 of 7" />
            </FactCard>
            <FactCard
              head="A nudge, with a line if you want one"
              body="One tap sends chizuk. Adding a sentence of your own is usually the part that lands."
            >
              <NudgeCardPreview from="Yehuda sent you chizuk" text="Perek beis is where it clicks. Worth pushing through." />
            </FactCard>
            <FactCard head="Notes you both write" body="Every note carries whose it is. Edit your own, reply under either.">
              <NoteCardPreview
                author="You"
                source="Berachot 1:1 · this morning"
                body="The three watches are the key to the whole sugya."
                replyAuthor="Yehuda"
                reply="That framing helped — I had it as one list."
              />
            </FactCard>
          </div>

          {onOpenLogin && (
            <GateCTA
              heading="Ready to start one?"
              body="A name and an email is all it takes."
              onAction={() => onOpenLogin("signUp")}
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

        <ReceivedNudges />

        <CreateCard heading="Start a chevrusa" subtitle="Pick the masechet and send one invitation. They see your progress on it once they accept.">
          <div className="create-card__fields">
            <FieldInset label="Masechet to learn together" select hint="Anywhere in Shas — it need not follow your own sequential limmud.">
              <MasechetSelect value={masechetValue} onChange={setMasechetValue} />
            </FieldInset>

            <FieldInset label="Who are you learning with">
              <input
                type="email"
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder="Their email address…"
              />
            </FieldInset>

            <PaceSegment
              options={PACE_OPTIONS}
              value={invitePace}
              onChange={setInvitePace}
              hint="A shared target, not a rule — nobody is held to it and nobody is told when it slips."
            />
          </div>

          {error && <ErrorRow message={error} />}

          <CreateCta
            label={busy ? "Sending…" : "Send the invitation"}
            note="One invitation, and nothing sent to anyone else."
            disabled={busy || !inviteValue || !masechetValue}
            onClick={handleSendInvite}
          />
        </CreateCard>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Waiting for you</p>
          {chevrusaPending.length === 0 ? (
            <p className="chevrusa-empty">No pending invites.</p>
          ) : (
            chevrusaPending.map((inv) => (
              <InviteQueueRow
                key={inv.id}
                waitingOnMe
                title={inv.fromName ? `${inv.fromName}` : "Someone"}
                detail={`Chevrusa on ${inv.masechetEn}`}
              >
                <button className="invite-queue-row__accept" onClick={() => handleAccept(inv)}>
                  Accept
                </button>
                <button className="invite-queue-row__text-btn" onClick={() => handleDecline(inv)}>
                  Decline
                </button>
              </InviteQueueRow>
            ))
          )}
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
          <p className="chevrusa-section__label">Invitations you've sent</p>
          {chevrusaSent.length === 0 ? (
            <p className="chevrusa-empty">No outstanding invites.</p>
          ) : (
            chevrusaSent.map((inv) => (
              <InviteQueueRow
                key={inv.id}
                waitingOnMe={false}
                title={inv.invitedEmail}
                detail={inv.status === "declined" ? "Declined" : "Waiting for them to accept"}
              >
                <button className="invite-queue-row__text-btn" onClick={() => handleCancel(inv)}>
                  Cancel
                </button>
              </InviteQueueRow>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
