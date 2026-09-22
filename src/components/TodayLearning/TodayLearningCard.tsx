import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale, useName } from "../../i18n";
import { findMasechet } from "../../data/shas";
import type { Group } from "../../utils/useChevrusa";
import type { TodaySnapshot, SubmissionActivity } from "../../utils/useDailySubmission";
import { useSendDailySubmission, fetchMyWeek, type WeekDay } from "../../utils/useDailySubmission";
import { useAuth } from "../../utils/useAuth";
import { NavIcon } from "../Icon/NavIcon";
import { localDateStr } from "../../utils/localDate";
import "./TodayLearningCard.css";

const ICON_BY_KEY: Record<SubmissionActivity["key"], string> = {
  limmud: "limmud",
  quiz: "mishna",
  sidrei: "sedarim",
  sort: "sort",
  dash: "dash",
  chazara: "recall",
};

const HUE_BY_KEY: Record<SubmissionActivity["key"], string> = {
  limmud: "var(--hue-limmud)",
  quiz: "var(--hue-quiz)",
  sidrei: "var(--hue-sedarim)",
  sort: "var(--hue-sort)",
  dash: "var(--hue-dash)",
  chazara: "var(--hue-chazara)",
};

function dateLabel(date: string, locale: string | undefined): string {
  return new Date(date + "T00:00:00").toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
}

function WeekStrip({ week }: { week: WeekDay[] }) {
  const today = localDateStr();
  return (
    <div className="today-week-strip">
      {week.map((d) => {
        const isToday = d.date === today;
        const isFuture = d.date > today;
        return (
          <span
            key={d.date}
            className={
              "today-week-strip__cell" +
              (d.sent ? " today-week-strip__cell--sent" : isFuture ? " today-week-strip__cell--future" : " today-week-strip__cell--missed")
            }
            title={d.date}
          >
            {d.sent ? "✓" : isFuture || isToday ? "—" : ""}
          </span>
        );
      })}
    </div>
  );
}

interface TodayLearningCardProps {
  group: Group;
  snapshot: TodaySnapshot;
}

/**
 * One card per class chabura the student belongs to — a student in two
 * shiurim gets two cards, each sending independently, rather than one
 * card with a hidden target selector (REBBE-DASHBOARD-BRIEF.md §7's
 * "decide before building": the app already lets a student hold more
 * than one chabura membership, so the single-card design would silently
 * drop the ability to report to a second rebbe).
 *
 * Stays visible even on a day with nothing done yet — a card that
 * vanishes reads as broken, not as "nothing to report." The empty state
 * says so plainly and disables Send, same pattern as Chevrusa's
 * disabled-button hints.
 */
export function TodayLearningCard({ group, snapshot }: TodayLearningCardProps) {
  const { t } = useTranslation("home");
  const locale = useLocale();
  const name = useName();
  const { session } = useAuth();
  const { state, error, send } = useSendDailySubmission(group.id);
  const [week, setWeek] = useState<WeekDay[] | null>(null);

  const teacher = group.members.find((m) => m.role === "teacher");
  const teacherLabel = teacher?.firstName
    ? t("todayLearning.rav", { name: teacher.firstName })
    : (teacher?.username ?? t("todayLearning.yourRebbe"));
  const groupMasechet = findMasechet(group.masechetEn);
  const groupLabel = group.name ?? (groupMasechet ? name(groupMasechet) : group.masechetEn);

  useEffect(() => {
    if (state === "sent" && session) {
      fetchMyWeek(group.id, session.user.id).then(setWeek);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const hasActivities = snapshot.activities.length > 0;

  if (state === "sent") {
    return (
      <div className="today-learning-card today-learning-card--sent">
        <div className="today-sent__tick">✓</div>
        <p className="today-sent__title">{t("todayLearning.sentTo", { teacher: teacherLabel })}</p>
        <p className="today-sent__summary">
          {snapshot.activities.map((a) => a.figure).join(" · ")} — {groupLabel}
        </p>
        <div className="today-sent__update">
          <span>{t("todayLearning.learnedMore")}</span>
          <button onClick={() => send(snapshot)} disabled={state !== "sent"}>
            {t("todayLearning.sendUpdate")}
          </button>
        </div>
        {week && <WeekStrip week={week} />}
      </div>
    );
  }

  return (
    <div className="today-learning-card">
      <div className="today-learning-card__head">
        <div>
          <p className="today-learning-card__title">{t("todayLearning.title")}</p>
          <p className="today-learning-card__sub">
            {groupLabel} · {teacherLabel}
          </p>
        </div>
        <span className="today-learning-card__date">{dateLabel(snapshot.date, locale)}</span>
      </div>

      {hasActivities ? (
        snapshot.activities.map((a) => (
          <div className="today-activity-row" key={a.key}>
            <span className="today-activity-row__tick" style={{ background: HUE_BY_KEY[a.key] }}>
              <NavIcon id={ICON_BY_KEY[a.key]} />
            </span>
            <div className="today-activity-row__body">
              <p className="today-activity-row__label">{a.label}</p>
              <p className="today-activity-row__detail">{a.detail}</p>
            </div>
            <span className="today-activity-row__figure" style={{ color: HUE_BY_KEY[a.key] }}>
              {a.figure}
            </span>
          </div>
        ))
      ) : (
        <p className="today-learning-card__empty">{t("todayLearning.empty")}</p>
      )}

      <button
        className="today-learning-card__send"
        onClick={() => send(snapshot)}
        disabled={state === "sending" || !hasActivities}
      >
        {state === "sending" ? t("todayLearning.sending") : t("todayLearning.sendTo", { teacher: teacherLabel })}
      </button>
      <p className="today-learning-card__note">{t("todayLearning.note")}</p>
      {state === "error" && error && (
        <p className="login-error" dir="auto">
          {error}
        </p>
      )}
    </div>
  );
}
