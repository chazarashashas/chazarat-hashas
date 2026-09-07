import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type PendingInvite, type SentInvite } from "../../utils/useChevrusa";
import type { Pace } from "../../utils/useLearningProgress";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { GateCard } from "../GateCard/GateCard";
import { GroupCard } from "../GroupCard/GroupCard";
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
          A chabura is a group of any size learning one masechet together — casual ("Friends and
          Family"), or led by a rebbe ("Rebbe & Class"). Starting a Rebbe &amp; Class chabura makes
          you its rebbe automatically; everyone else who joins is a talmid.
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

/**
 * Group learning — a chabura of any size, either a casual "Friends and
 * Family" group or a Rebbe-led class. Split out from one-on-one
 * chevrusa pairing (see ../Chevrusa/ChevrusaScreen) since the two are
 * different features with different shapes: a chevrusa is a fixed pair,
 * a chabura is an open group that can have a teacher role, a join code,
 * and (for a class) the rebbe dashboard's daily reports.
 */
interface ChaburaScreenProps {
  onOpenLogin?: (mode?: "signIn" | "signUp") => void;
  onOpenNishmat?: () => void;
}

export function ChaburaScreen({ onOpenLogin, onOpenNishmat }: ChaburaScreenProps) {
  const { session } = useAuth();
  const { groups, pendingInvites, sentInvites, createGroup, addMembers, acceptInvite, declineInvite, cancelInvite, leaveGroup } =
    useChevrusa();

  const [chaburaKind, setChaburaKind] = useState<ChaburaKind>("friends");
  const [chaburaName, setChaburaName] = useState("");
  const [chaburaMasechet, setChaburaMasechet] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);
  const [chaburaPace, setChaburaPace] = useState<Pace>("1");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

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
    const result = await createGroup(chaburaMasechet, true, chaburaName, memberEmails, chaburaPace, chaburaKind === "class");
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
          <h1 className="panel__title">Chabura</h1>
          <p className="panel__subtitle">Start or join a group learning together — with or without a rebbe.</p>
          <button className="chabura-about-link" onClick={() => setAboutOpen(true)}>
            How rebbe &amp; talmid works →
          </button>
          {onOpenLogin && (
            <GateCard
              title="Starting a chabura needs an account"
              body="Your chabura has to be able to find you, and everyone needs to see who learned today. That only works with an account behind it."
              onCreateAccount={() => onOpenLogin("signUp")}
              onSignIn={() => onOpenLogin("signIn")}
            />
          )}
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

        {onOpenNishmat && (
          <button className="chevrusa-nishmat-link" onClick={onOpenNishmat}>
            Looking for a bigger group commitment? Join a siyum in L'Iluy Nishmat →
          </button>
        )}

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
            As the Rebbe, you'll see each student's learned-today status, and their daily reports on
            your Dashboard. Students only see their own — not their classmates'.
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

          <button className="restart" disabled={busy || !chaburaName || !chaburaMasechet} onClick={handleStartChabura}>
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
            chaburot.map((g) => (
              <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Pending invites</p>
          {chaburaPending.length === 0 ? (
            <p className="chevrusa-empty">No pending invites.</p>
          ) : (
            chaburaPending.map((inv) => (
              <div key={inv.id} className="invite-row">
                <span className="invite-row__text">
                  Chabura "{inv.groupName}" — {inv.masechetEn}
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
          {chaburaSent.length === 0 ? (
            <p className="chevrusa-empty">No outstanding invites.</p>
          ) : (
            chaburaSent.map((inv) => (
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
      {aboutOpen && <AboutChaburaModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
