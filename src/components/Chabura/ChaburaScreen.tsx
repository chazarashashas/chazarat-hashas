import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type PendingInvite, type SentInvite } from "../../utils/useChevrusa";
import type { Pace } from "../../utils/useLearningProgress";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { GroupCard } from "../GroupCard/GroupCard";
import { ReceivedNudges } from "../GroupCard/ReceivedNudges";
import {
  KindTabs,
  FactCard,
  InviteRowPreview,
  WeekDotsPreview,
  NudgeCardPreview,
  NoteCardPreview,
  RosterPreview,
  BundlePreview,
  GateCTA,
} from "../SignedOutGate/SignedOutGate";
import {
  CreateCard,
  ShiurNotice,
  FieldInset,
  PaceSegment,
  InviteRepeaterRow,
  CreateCta,
  JoinByCodeCard,
  InviteQueueRow,
} from "../GroupCreateCard/GroupCreateCard";
import "../Chevrusa/ChevrusaScreen.css";
import "./ChaburaScreen.css";

/** Explains the rebbe/talmid roles a "Rebbe & Class" chabura creates —
    nothing in the create-a-chabura form itself teaches a new rebbe what
    their Dashboard does, or a new student what "sending" means, so this
    is the one place both sides can go read it. Mirrors Home's "How this
    app works" popup (same scrim/popup shell, its own content). */
function AboutChaburaModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose);
  return (
    <div className="scrim intro-scrim" onClick={onClose}>
      <div className="popup intro-popup" onClick={(e) => e.stopPropagation()}>
        <button className="intro-popup__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>
        <h2 className="intro-popup__title">About Chaburas</h2>
        <p className="intro-popup__lead">
          A chabura is a group of any size learning one masechet together — with your shiur or
          class, or among friends. Starting one with your shiur or class makes you its rebbe
          automatically; everyone else who joins is a talmid.
        </p>

        <p className="intro-popup__subtitle">If you're the rebbe</p>
        <div className="intro-job intro-job--gold">
          <p className="intro-job__title">Get your class in</p>
          <p className="intro-job__text">
            Share the join code shown on your Dashboard, or invite students by email from here.
          </p>
        </div>
        <div className="intro-job intro-job--gold">
          <p className="intro-job__title">See who's quiet</p>
          <p className="intro-job__text">
            Your Dashboard (in the sidebar once you have a class) lists students quietest-first, so
            you always know who to check on. Switch to Grid for the whole shiur at a glance, or
            export it as a CSV.
          </p>
        </div>
        <div className="intro-job intro-job--gold">
          <p className="intro-job__title">Only what they send</p>
          <p className="intro-job__text">
            You see a student's daily report — what they learned and where. Their own notes and
            concepts stay theirs.
          </p>
        </div>

        <p className="intro-popup__subtitle">If you're a talmid</p>
        <div className="intro-job">
          <p className="intro-job__title">Learn as usual</p>
          <p className="intro-job__text">
            Daily Limmud, Mishna Quiz, any of the Practice games — nothing about how you learn
            changes.
          </p>
        </div>
        <div className="intro-job">
          <p className="intro-job__title">Send it with one tap</p>
          <p className="intro-job__text">
            Home shows a "Today's learning" card summarizing what you've done, with a button to send
            it to your rebbe. One send a day — keep learning after, and sending again updates it.
          </p>
        </div>
        <div className="intro-job">
          <p className="intro-job__title">Just you and your rebbe</p>
          <p className="intro-job__text">Classmates never see your report, and you never see theirs.</p>
        </div>

        <p className="intro-popup__text" style={{ marginTop: 14, marginBottom: 0 }}>
          Looking to pair with one study partner instead, no group or rebbe? That's Chevrusa.
        </p>
      </div>
    </div>
  );
}

type ChaburaKind = "shiur" | "friends";

const KIND_OPTIONS = [
  { value: "shiur" as const, label: "With your shiur or class", note: "your rebbe adds you, you send your day in" },
  { value: "friends" as const, label: "Among friends", note: "anyone starts one, anyone invites" },
];

const SIGNED_OUT_KIND = {
  shiur: {
    standfirst: "Your shiur or class on one masechet, with each day's learning sent in.",
    weekPattern: [true, true, false, true, true, false, true],
    weekNote: "sent 5 of 7",
    nudgeFrom: "Rav Romi sent you chizuk",
    nudgeText: "Saw you sent four yesterday. Keep it going.",
    gateHeading: "Your rebbe adds you to the chabura",
    gateBody: "Sign in with the email he has for you and it will be waiting here.",
  },
  friends: {
    standfirst: "A few friends on one masechet, with everyone in it having the same say.",
    weekPattern: [true, true, true, false, true, true, true],
    weekNote: "someone, 6 of 7",
    nudgeFrom: "Shimon sent you chizuk",
    nudgeText: "Two perakim left in Shabbat. Finish it with us.",
    gateHeading: "Ready to start one?",
    gateBody: "A name and an email is all it takes.",
  },
};

const ROSTER_PREVIEW = [
  { name: "Yitzy Feldman", learned: true, value: "4 mishnayot · B+" },
  { name: "Moshe Guttman", learned: true, value: "2 mishnayot · A−" },
  { name: "Eli Brandwein", learned: true, value: "1 mishnah", valueMuted: true },
  { name: "Shmuli Klein", learned: false, value: "not yet today", valueMuted: true },
];

const BUNDLE_PREVIEW = [
  { text: "4 mishnayot", hue: "var(--good)" },
  { text: "quiz B+", hue: "var(--gold)" },
  { text: "Sedarim 6/6", hue: "var(--ink-2)" },
];

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: "1", label: "1 Mishnah/day" },
  { value: "2", label: "2 Mishnayot/day" },
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
 * Group learning — a chabura of any size, either a casual friends group
 * or a rebbe-led shiur/class. Split out from one-on-one chevrusa pairing
 * (see ../Chevrusa/ChevrusaScreen) since the two are different features
 * with different shapes: a chevrusa is a fixed pair, a chabura is an
 * open group that can have a teacher role, a join code, and (for a
 * shiur) the rebbe dashboard's daily reports.
 */
interface ChaburaScreenProps {
  onOpenLogin?: (mode?: "signIn" | "signUp") => void;
  onNavigate?: (id: string) => void;
}

export function ChaburaScreen({ onOpenLogin, onNavigate }: ChaburaScreenProps) {
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
    joinByCode,
  } = useChevrusa();

  const [chaburaKind, setChaburaKind] = useState<ChaburaKind>("friends");
  const [chaburaName, setChaburaName] = useState("");
  const [chaburaMasechet, setChaburaMasechet] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);
  const [chaburaPace, setChaburaPace] = useState<Pace>("1");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  async function handleJoinByCode() {
    if (!joinCode.trim()) return;
    setJoinBusy(true);
    setError(null);
    const result = await joinByCode(joinCode);
    setJoinBusy(false);
    if (result) setError(result);
    else {
      setJoined(true);
      setJoinCode("");
      window.setTimeout(() => setJoined(false), 3000);
    }
  }

  function updateMember(index: number, value: string) {
    setMemberEmails((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addMemberField() {
    setMemberEmails((prev) => [...prev, ""]);
  }

  function removeMemberField(index: number) {
    setMemberEmails((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleStartChabura() {
    setError(null);
    setBusy(true);
    const result = await createGroup(chaburaMasechet, true, chaburaName, memberEmails, chaburaPace, chaburaKind === "shiur");
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
    const k = SIGNED_OUT_KIND[chaburaKind];
    return (
      <div className="stage">
        <div className="panel">
          <p className="app-title">Chazarat Hashas</p>
          <h1 className="gate2-title">Chabura</h1>
          <p className="gate2-subtitle">{k.standfirst}</p>

          <KindTabs options={KIND_OPTIONS} value={chaburaKind} onChange={setChaburaKind} />

          <div className="gate2-facts">
            {chaburaKind === "shiur" ? (
              <>
                <FactCard
                  head="Your rebbe sets the masechet"
                  body="He opens the chabura and adds the talmidim; you appear in it as soon as he does."
                >
                  <InviteRowPreview email="shimon.adler@…" pillLabel="Joined" />
                </FactCard>
                <FactCard
                  head="One send a day"
                  body="The day is already listed before you press anything — the limmud, the quiz, whichever games you played."
                >
                  <BundlePreview chips={BUNDLE_PREVIEW} />
                </FactCard>
                <FactCard head="He sees one row per talmid" body="Your day beside every other name in the shiur, at a glance.">
                  <RosterPreview rows={ROSTER_PREVIEW} />
                </FactCard>
                <FactCard head="A nudge, with a line if he wants one" body="A short word of chizuk on the days it helps, with his own sentence added.">
                  <NudgeCardPreview from={k.nudgeFrom} text={k.nudgeText} />
                </FactCard>
              </>
            ) : (
              <>
                <FactCard head="Anyone can invite" body="Everyone in it has the same say — bring in whoever you like, step out freely whenever you need to.">
                  <InviteRowPreview email="shimon.adler@…" pillLabel="Joined" />
                </FactCard>
                <FactCard head="A dot for each day someone learns" body="More names than a chevrusa, and the same easy signal for each of them.">
                  <WeekDotsPreview pattern={k.weekPattern} note={k.weekNote} />
                </FactCard>
                <FactCard head="A nudge, with a line if you want one" body="One tap sends chizuk to anyone in the chabura, with a sentence of your own.">
                  <NudgeCardPreview from={k.nudgeFrom} text={k.nudgeText} />
                </FactCard>
                <FactCard head="Notes the whole chabura writes" body="Every note carries whose it is. Edit your own, reply under anyone's.">
                  <NoteCardPreview
                    author="You"
                    source="Shabbat 7:2 · this morning"
                    body="Learn the 39 in their groups — the eleven of bread first."
                    replyAuthor="Shimon"
                    reply="Second group is the eleven of a garment."
                  />
                </FactCard>
              </>
            )}
          </div>

          {onOpenLogin && (
            <GateCTA heading={k.gateHeading} body={k.gateBody} onAction={() => onOpenLogin("signUp")} />
          )}
          <p className="gate2-footer">
            Everything else is open already —{" "}
            <button onClick={() => onNavigate?.("limmud")}>carry on learning on your own</button>.
          </p>
        </div>
        {aboutOpen && <AboutChaburaModal onClose={() => setAboutOpen(false)} />}
      </div>
    );
  }

  const chaburot = groups.filter((g) => g.isChabura);
  const chaburaPending = pendingInvites.filter((inv) => inv.isChabura);
  const chaburaSent = sentInvites.filter((inv) => inv.isChabura);

  return (
    <div className="stage">
      <div className="panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Chabura</h1>
        <p className="panel__subtitle">
          Start or join a group learning together, one masechet at a time. Know when the group has
          learned today — no streaks compared, no ranking, just "they showed up."
        </p>

        <button className="chabura-about-link" onClick={() => setAboutOpen(true)}>
          How rebbe &amp; talmid works →
        </button>

        <ReceivedNudges />

        <CreateCard
          heading={chaburaKind === "shiur" ? "Open one for your class" : "Start a chabura"}
          subtitle="Name it, pick the masechet, and add whoever is learning it with you."
        >
          <KindTabs options={KIND_OPTIONS} value={chaburaKind} onChange={setChaburaKind} variant="navy" />

          {chaburaKind === "shiur" && (
            <ShiurNotice text="You are opening this as the rebbe. Every talmid you add sends his day to you, and you will see the class as one row each." />
          )}

          <div className="create-card__fields">
            <FieldInset label={chaburaKind === "shiur" ? "Class name" : "Chabura name"}>
              <input
                type="text"
                value={chaburaName}
                onChange={(e) => setChaburaName(e.target.value)}
                placeholder={chaburaKind === "shiur" ? "e.g. 9th Grade Gemara" : "e.g. Tuesday Night Seder Nezikin"}
              />
            </FieldInset>

            <FieldInset label="Masechet to learn together" select hint="Anywhere in Shas — it need not follow your own sequential limmud.">
              <MasechetSelect value={chaburaMasechet} onChange={setChaburaMasechet} />
            </FieldInset>

            <PaceSegment
              options={PACE_OPTIONS}
              value={chaburaPace}
              onChange={setChaburaPace}
              hint="A shared target, not a rule — nobody is held to it and nobody is told when it slips."
            />

            <div>
              <div className="create-field__label create-field__label-row">
                <span>{chaburaKind === "shiur" ? "Invite students by email" : "Invite members by email"}</span>
                <span className="create-field__count">{memberEmails.filter((e) => e.trim()).length} invited</span>
              </div>
              <div className="invite-repeater-list">
                {memberEmails.map((email, i) => (
                  <InviteRepeaterRow
                    key={i}
                    value={email}
                    onChange={(v) => updateMember(i, v)}
                    onRemove={memberEmails.length > 1 ? () => removeMemberField(i) : undefined}
                    placeholder={chaburaKind === "shiur" ? "student@example.com" : "member@example.com"}
                  />
                ))}
              </div>
              <button type="button" className="create-add-invite" onClick={addMemberField}>
                + Add another
              </button>
            </div>
          </div>

          {error && <ErrorRow message={error} />}

          <CreateCta
            label={busy ? "Creating…" : chaburaKind === "shiur" ? "Open the class" : "Start the chabura"}
            note="They get one invitation each, and the chabura is yours from the moment you open it."
            disabled={busy || !chaburaName || !chaburaMasechet}
            onClick={handleStartChabura}
          />
        </CreateCard>

        <JoinByCodeCard
          heading="Joining one instead?"
          value={joinCode}
          onChange={setJoinCode}
          onJoin={handleJoinByCode}
          busy={joinBusy}
          joined={joined}
        />

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Waiting for you</p>
          {chaburaPending.length === 0 ? (
            <p className="chevrusa-empty">No pending invites.</p>
          ) : (
            chaburaPending.map((inv) => (
              <InviteQueueRow
                key={inv.id}
                waitingOnMe
                title={inv.groupName ? `Chabura "${inv.groupName}"` : "Chabura"}
                detail={`${inv.masechetEn}${inv.fromName ? ` · from ${inv.fromName}` : ""}`}
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
          <p className="chevrusa-section__label">Your chaburot</p>
          {chaburot.length === 0 ? (
            <p className="chevrusa-empty">
              Not in any chabura yet. Each group you start or join will show here, with its own
              masechet and member list.
            </p>
          ) : (
            chaburot.map((g) => (
              <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Invitations you've sent</p>
          {chaburaSent.length === 0 ? (
            <p className="chevrusa-empty">No outstanding invites.</p>
          ) : (
            chaburaSent.map((inv) => (
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
      {aboutOpen && <AboutChaburaModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
