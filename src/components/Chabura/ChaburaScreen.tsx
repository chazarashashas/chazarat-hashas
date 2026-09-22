import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDirection, useName } from "../../i18n";
import { SEDARIM, findMasechet } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type PendingInvite, type SentInvite, type GroupPace } from "../../utils/useChevrusa";
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
import "./ChaburaScreen.css";

/** Explains the rebbe/talmid roles a "Rebbe & Class" chabura creates —
    nothing in the create-a-chabura form itself teaches a new rebbe what
    their Dashboard does, or a new student what "sending" means, so this
    is the one place both sides can go read it. Mirrors Home's "How this
    app works" popup (same scrim/popup shell, its own content). */
function AboutChaburaModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(["groups", "common"]);
  useEscapeKey(onClose);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title={t("common:close")} aria-label={t("common:close")}>
          ✕
        </button>
        <h2 className="modal__title">{t("chabura.about.title")}</h2>
        <p className="intro-popup__lead">{t("chabura.about.lead")}</p>

        <p className="intro-popup__subtitle">{t("chabura.about.rebbeTitle")}</p>
        <div className="intro-job intro-job--gold">
          <p className="intro-job__title">{t("chabura.about.classInTitle")}</p>
          <p className="intro-job__text">{t("chabura.about.classInText")}</p>
        </div>
        <div className="intro-job intro-job--gold">
          <p className="intro-job__title">{t("chabura.about.quietTitle")}</p>
          <p className="intro-job__text">{t("chabura.about.quietText")}</p>
        </div>
        <div className="intro-job intro-job--gold">
          <p className="intro-job__title">{t("chabura.about.sendOnlyTitle")}</p>
          <p className="intro-job__text">{t("chabura.about.sendOnlyText")}</p>
        </div>

        <p className="intro-popup__subtitle">{t("chabura.about.talmidTitle")}</p>
        <div className="intro-job">
          <p className="intro-job__title">{t("chabura.about.asUsualTitle")}</p>
          <p className="intro-job__text">{t("chabura.about.asUsualText")}</p>
        </div>
        <div className="intro-job">
          <p className="intro-job__title">{t("chabura.about.oneTapTitle")}</p>
          <p className="intro-job__text">{t("chabura.about.oneTapText")}</p>
        </div>
        <div className="intro-job">
          <p className="intro-job__title">{t("chabura.about.justYouTitle")}</p>
          <p className="intro-job__text">{t("chabura.about.justYouText")}</p>
        </div>

        <p className="intro-popup__text intro-popup__text--last">{t("chabura.about.chevrusaInstead")}</p>
      </div>
    </div>
  );
}

type ChaburaKind = "shiur" | "friends";

const WEEK_PATTERN: Record<ChaburaKind, boolean[]> = {
  shiur: [true, true, false, true, true, false, true],
  friends: [true, true, true, false, true, true, true],
};

function MasechetSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation("groups");
  const name = useName();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("chooseMasechet")}</option>
      {SEDARIM.map((seder) => (
        <optgroup key={seder.id} label={name(seder)}>
          {seder.masechtot.map((m) => (
            <option key={m.en} value={m.en}>
              {name(m)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function ErrorRow({ message }: { message: string }) {
  const direction = useDirection();
  return (
    <div className="callout callout--bad chevrusa-error" dir={direction}>
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
}

export function ChaburaScreen({ onOpenLogin }: ChaburaScreenProps) {
  const { session } = useAuth();
  const { t } = useTranslation(["groups", "common"]);
  const name = useName();
  const masechetName = (masechetEn: string) => {
    const m = findMasechet(masechetEn);
    return m ? name(m) : masechetEn;
  };
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

  const kindOptions = [
    { value: "shiur" as const, label: t("chabura.kind.shiurLabel"), note: t("chabura.kind.shiurNote") },
    { value: "friends" as const, label: t("chabura.kind.friendsLabel"), note: t("chabura.kind.friendsNote") },
  ];

  const paceOptions: { value: GroupPace; label: string }[] = [
    { value: "1", label: t("pace.optionOne") },
    { value: "2", label: t("pace.optionTwo") },
    { value: "perek", label: t("pace.optionPerek") },
  ];

  const [chaburaKind, setChaburaKind] = useState<ChaburaKind>("friends");
  const [chaburaName, setChaburaName] = useState("");
  const [chaburaMasechet, setChaburaMasechet] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);
  const [chaburaPace, setChaburaPace] = useState<GroupPace>("1");

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
    const shiur = chaburaKind === "shiur";
    const k = {
      standfirst: shiur ? t("chabura.signedOut.shiurStandfirst") : t("chabura.signedOut.friendsStandfirst"),
      weekPattern: WEEK_PATTERN[chaburaKind],
      weekNote: shiur ? t("chabura.signedOut.shiurWeekNote") : t("chabura.signedOut.friendsWeekNote"),
      nudgeFrom: shiur ? t("chabura.signedOut.shiurNudgeFrom") : t("chabura.signedOut.friendsNudgeFrom"),
      nudgeText: shiur ? t("chabura.signedOut.shiurNudgeText") : t("chabura.signedOut.friendsNudgeText"),
      gateHeading: shiur ? t("chabura.signedOut.shiurGateHeading") : t("gate.readyHeading"),
      gateBody: shiur ? t("chabura.signedOut.shiurGateBody") : t("gate.readyBody"),
    };
    const rosterPreview = [
      { name: t("chabura.signedOut.roster.name1"), learned: true, value: t("chabura.signedOut.roster.value1") },
      { name: t("chabura.signedOut.roster.name2"), learned: true, value: t("chabura.signedOut.roster.value2") },
      { name: t("chabura.signedOut.roster.name3"), learned: true, value: t("chabura.signedOut.roster.value3"), valueMuted: true },
      { name: t("chabura.signedOut.roster.name4"), learned: false, value: t("chabura.signedOut.roster.value4"), valueMuted: true },
    ];
    const bundlePreview = [
      { text: t("chabura.signedOut.bundle.limmud"), hue: "var(--good)" },
      { text: t("chabura.signedOut.bundle.quiz"), hue: "var(--gold)" },
      { text: t("chabura.signedOut.bundle.sedarim"), hue: "var(--ink-2)" },
    ];
    return (
      <div className="stage">
        <div className="panel">
          <h1 className="gate2-title">{t("chabura.title")}</h1>
          <p className="gate2-subtitle">{k.standfirst}</p>

          <KindTabs options={kindOptions} value={chaburaKind} onChange={setChaburaKind} />

          <div className="gate2-facts">
            {chaburaKind === "shiur" ? (
              <>
                <FactCard head={t("chabura.signedOut.factMasechetHead")} body={t("chabura.signedOut.factMasechetBody")}>
                  <InviteRowPreview email="shimon.adler@…" pillLabel={t("chabura.signedOut.joined")} />
                </FactCard>
                <FactCard head={t("chabura.signedOut.factSendHead")} body={t("chabura.signedOut.factSendBody")}>
                  <BundlePreview chips={bundlePreview} />
                </FactCard>
                <FactCard head={t("chabura.signedOut.factRowHead")} body={t("chabura.signedOut.factRowBody")}>
                  <RosterPreview rows={rosterPreview} />
                </FactCard>
                <FactCard head={t("chabura.signedOut.factRebbeNudgeHead")} body={t("chabura.signedOut.factRebbeNudgeBody")}>
                  <NudgeCardPreview from={k.nudgeFrom} text={k.nudgeText} />
                </FactCard>
              </>
            ) : (
              <>
                <FactCard head={t("chabura.signedOut.factInviteHead")} body={t("chabura.signedOut.factInviteBody")}>
                  <InviteRowPreview email="shimon.adler@…" pillLabel={t("chabura.signedOut.joined")} />
                </FactCard>
                <FactCard head={t("chabura.signedOut.factDotsHead")} body={t("chabura.signedOut.factDotsBody")}>
                  <WeekDotsPreview pattern={k.weekPattern} note={k.weekNote} />
                </FactCard>
                <FactCard head={t("gate.nudgeHead")} body={t("chabura.signedOut.factNudgeBody")}>
                  <NudgeCardPreview from={k.nudgeFrom} text={k.nudgeText} />
                </FactCard>
                <FactCard head={t("chabura.signedOut.factNotesHead")} body={t("chabura.signedOut.factNotesBody")}>
                  <NoteCardPreview
                    author={t("you")}
                    source={t("chabura.signedOut.noteSource")}
                    body={t("chabura.signedOut.noteBody")}
                    replyAuthor={t("chabura.signedOut.noteReplyAuthor")}
                    reply={t("chabura.signedOut.noteReply")}
                  />
                </FactCard>
              </>
            )}
          </div>

          {onOpenLogin && (
            <GateCTA heading={k.gateHeading} body={k.gateBody} onAction={() => onOpenLogin("signUp")} />
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
        <h1 className="panel__title">{t("chabura.title")}</h1>

        <button className="chabura-about-link" onClick={() => setAboutOpen(true)}>
          {t("chabura.aboutLink")}
        </button>

        <ReceivedNudges />

        <CreateCard
          heading={chaburaKind === "shiur" ? t("chabura.createHeadingShiur") : t("chabura.createHeadingFriends")}
          subtitle={t("chabura.createSubtitle")}
        >
          <KindTabs options={kindOptions} value={chaburaKind} onChange={setChaburaKind} variant="navy" />

          {chaburaKind === "shiur" && <ShiurNotice text={t("chabura.shiurNotice")} />}

          <div className="create-card__fields">
            <FieldInset label={chaburaKind === "shiur" ? t("chabura.nameFieldShiur") : t("chabura.nameFieldFriends")}>
              <input
                type="text"
                value={chaburaName}
                onChange={(e) => setChaburaName(e.target.value)}
                placeholder={chaburaKind === "shiur" ? t("chabura.namePlaceholderShiur") : t("chabura.namePlaceholderFriends")}
              />
            </FieldInset>

            <FieldInset label={t("masechetField")} select hint={t("masechetHint")}>
              <MasechetSelect value={chaburaMasechet} onChange={setChaburaMasechet} />
            </FieldInset>

            <PaceSegment options={paceOptions} value={chaburaPace} onChange={setChaburaPace} hint={t("pace.hint")} />

            <div>
              <div className="create-field__label create-field__label-row">
                <span>{chaburaKind === "shiur" ? t("chabura.inviteFieldShiur") : t("chabura.inviteFieldFriends")}</span>
                <span className="create-field__count">
                  {t("chabura.invitedCount", { n: memberEmails.filter((e) => e.trim()).length })}
                </span>
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
                {t("chabura.addAnother")}
              </button>
            </div>
          </div>

          {error && <ErrorRow message={error} />}

          <CreateCta
            label={busy ? t("chabura.creating") : chaburaKind === "shiur" ? t("chabura.openClass") : t("chabura.startChabura")}
            note={t("chabura.createNote")}
            disabled={busy || !chaburaName || !chaburaMasechet}
            onClick={handleStartChabura}
          />
        </CreateCard>

        <JoinByCodeCard
          heading={t("chabura.joinHeading")}
          value={joinCode}
          onChange={setJoinCode}
          onJoin={handleJoinByCode}
          busy={joinBusy}
          joined={joined}
        />

        <div className="chevrusa-section">
          <p className="section-title">{t("waitingForYou")}</p>
          {chaburaPending.length === 0 ? (
            <p className="state state--empty">{t("noPending")}</p>
          ) : (
            chaburaPending.map((inv) => (
              <InviteQueueRow
                key={inv.id}
                waitingOnMe
                title={inv.groupName ? t("chabura.inviteTitleNamed", { name: inv.groupName }) : t("chabura.inviteTitle")}
                detail={
                  inv.fromName
                    ? t("chabura.inviteDetailFrom", { masechet: masechetName(inv.masechetEn), name: inv.fromName })
                    : masechetName(inv.masechetEn)
                }
              >
                <button className="invite-queue-row__accept" onClick={() => handleAccept(inv)}>
                  {t("accept")}
                </button>
                <button className="invite-queue-row__text-btn" onClick={() => handleDecline(inv)}>
                  {t("decline")}
                </button>
              </InviteQueueRow>
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="section-title">{t("chabura.yoursTitle")}</p>
          {chaburot.length === 0 ? (
            <p className="state state--empty">{t("chabura.yoursEmpty")}</p>
          ) : (
            chaburot.map((g) => (
              <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="section-title">{t("sentTitle")}</p>
          {chaburaSent.length === 0 ? (
            <p className="state state--empty">{t("noOutstanding")}</p>
          ) : (
            chaburaSent.map((inv) => (
              <InviteQueueRow
                key={inv.id}
                waitingOnMe={false}
                title={inv.invitedEmail}
                detail={inv.status === "declined" ? t("declined") : t("waitingForThem")}
              >
                <button className="invite-queue-row__text-btn" onClick={() => handleCancel(inv)}>
                  {t("common:cancel")}
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
