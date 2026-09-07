import { useEffect, useState } from "react";
import type { Group } from "../../utils/useChevrusa";
import type { TodaySnapshot, SubmissionActivity } from "../../utils/useDailySubmission";
import { useSendDailySubmission, fetchMyWeek, type WeekDay } from "../../utils/useDailySubmission";
import { useAuth } from "../../utils/useAuth";
import { NavIcon } from "../Sidebar/NavIcon";
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

function dateLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function WeekStrip({ week }: { week: WeekDay[] }) {
  const today = new Date().toISOString().slice(0, 10);
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
  const { session } = useAuth();
  const { state, error, send } = useSendDailySubmission(group.id);
  const [week, setWeek] = useState<WeekDay[] | null>(null);

  const teacher = group.members.find((m) => m.role === "teacher");
  const teacherLabel = teacher?.firstName ? `Rav ${teacher.firstName}` : (teacher?.username ?? "your rebbe");

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
        <p className="today-sent__title">Sent to {teacherLabel}</p>
        <p className="today-sent__summary">
          {snapshot.activities.map((a) => a.figure).join(" · ")} — {group.name ?? group.masechetEn}
        </p>
        <div className="today-sent__update">
          <span>Learned more since?</span>
          <button onClick={() => send(snapshot)} disabled={state !== "sent"}>
            Send an update →
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
          <p className="today-learning-card__title">Today's learning</p>
          <p className="today-learning-card__sub">
            {group.name ?? group.masechetEn} · {teacherLabel}
          </p>
        </div>
        <span className="today-learning-card__date">{dateLabel(snapshot.date)}</span>
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
        <p className="today-learning-card__empty">Nothing yet to submit — do your Daily Limmud or a drill first.</p>
      )}

      <button
        className="today-learning-card__send"
        onClick={() => send(snapshot)}
        disabled={state === "sending" || !hasActivities}
      >
        {state === "sending" ? "Sending…" : `Send to ${teacherLabel}`}
      </button>
      <p className="today-learning-card__note">
        One send a day. Keep learning after — anything you add today goes with it if you send again.
      </p>
      {state === "error" && error && (
        <p className="login-error" dir="ltr">
          {error}
        </p>
      )}
    </div>
  );
}
