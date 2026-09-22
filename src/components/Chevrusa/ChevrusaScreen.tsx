import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDirection, useName } from "../../i18n";
import { SEDARIM, findMasechet } from "../../data/shas";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa, type PendingInvite, type SentInvite, type GroupPace } from "../../utils/useChevrusa";
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
  const { t } = useTranslation(["groups", "common"]);
  const name = useName();
  const masechetName = (masechetEn: string) => {
    const m = findMasechet(masechetEn);
    return m ? name(m) : masechetEn;
  };
  const { groups, pendingInvites, sentInvites, createGroup, addMembers, acceptInvite, declineInvite, cancelInvite, leaveGroup } =
    useChevrusa();

  const paceOptions: { value: GroupPace; label: string }[] = [
    { value: "1", label: t("pace.optionOne") },
    { value: "2", label: t("pace.optionTwo") },
    { value: "perek", label: t("pace.optionPerek") },
  ];

  const [inviteValue, setInviteValue] = useState("");
  const [masechetValue, setMasechetValue] = useState("");
  const [invitePace, setInvitePace] = useState<GroupPace>("1");

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
          <h1 className="gate2-title">{t("chevrusa.title")}</h1>
          <p className="gate2-subtitle">{t("chevrusa.subtitle")}</p>

          <div className="gate2-facts">
            <FactCard head={t("chevrusa.factInviteHead")} body={t("chevrusa.factInviteBody")}>
              <InviteRowPreview email="yehuda.klein@…" pillLabel={t("chevrusa.accepted")} />
            </FactCard>
            <FactCard head={t("chevrusa.factDotsHead")} body={t("chevrusa.factDotsBody")}>
              <WeekDotsPreview pattern={[true, true, false, true, true, false, true]} note={t("chevrusa.dotsNote")} />
            </FactCard>
            <FactCard head={t("gate.nudgeHead")} body={t("chevrusa.factNudgeBody")}>
              <NudgeCardPreview from={t("chevrusa.nudgeFrom")} text={t("chevrusa.nudgeText")} />
            </FactCard>
            <FactCard head={t("chevrusa.factNotesHead")} body={t("chevrusa.factNotesBody")}>
              <NoteCardPreview
                author={t("you")}
                source={t("chevrusa.noteSource")}
                body={t("chevrusa.noteBody")}
                replyAuthor={t("chevrusa.noteReplyAuthor")}
                reply={t("chevrusa.noteReply")}
              />
            </FactCard>
          </div>

          {onOpenLogin && (
            <GateCTA
              heading={t("gate.readyHeading")}
              body={t("gate.readyBody")}
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
        <h1 className="panel__title">{t("chevrusa.title")}</h1>

        <ReceivedNudges />

        <CreateCard heading={t("chevrusa.createHeading")} subtitle={t("chevrusa.createSubtitle")}>
          <div className="create-card__fields">
            <FieldInset label={t("masechetField")} select hint={t("masechetHint")}>
              <MasechetSelect value={masechetValue} onChange={setMasechetValue} />
            </FieldInset>

            <FieldInset label={t("chevrusa.partnerField")}>
              <input
                type="email"
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder={t("chevrusa.partnerPlaceholder")}
              />
            </FieldInset>

            <PaceSegment options={paceOptions} value={invitePace} onChange={setInvitePace} hint={t("pace.hint")} />
          </div>

          {error && <ErrorRow message={error} />}

          <CreateCta
            label={busy ? t("chevrusa.sending") : t("chevrusa.send")}
            note={t("chevrusa.sendNote")}
            disabled={busy || !inviteValue || !masechetValue}
            onClick={handleSendInvite}
          />
        </CreateCard>

        <div className="chevrusa-section">
          <p className="section-title">{t("waitingForYou")}</p>
          {chevrusaPending.length === 0 ? (
            <p className="state state--empty">{t("noPending")}</p>
          ) : (
            chevrusaPending.map((inv) => (
              <InviteQueueRow
                key={inv.id}
                waitingOnMe
                title={inv.fromName ? `${inv.fromName}` : t("someone")}
                detail={t("chevrusa.inviteDetail", { masechet: masechetName(inv.masechetEn) })}
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
          <p className="section-title">{t("chevrusa.yoursTitle")}</p>
          {chevrusot.length === 0 ? (
            <p className="state state--empty">{t("chevrusa.yoursEmpty")}</p>
          ) : (
            chevrusot.map((g) => (
              <GroupCard key={g.id} group={g} meId={session.user.id} onLeave={handleLeave} onAddMembers={handleAddMembers} />
            ))
          )}
        </div>

        <div className="chevrusa-section">
          <p className="section-title">{t("sentTitle")}</p>
          {chevrusaSent.length === 0 ? (
            <p className="state state--empty">{t("noOutstanding")}</p>
          ) : (
            chevrusaSent.map((inv) => (
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
    </div>
  );
}
