import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { useDirection, useLocale } from "../../i18n";
import { useChevrusa, type Group } from "../../utils/useChevrusa";
import { useRebbeChabura, standingsBySilence, historyFor, type StudentStanding } from "../../utils/useRebbeChabura";
import type { SubmissionActivity } from "../../utils/useDailySubmission";
import { localDateStr } from "../../utils/localDate";
import "./RebbeDashboardScreen.css";

type View = "today" | "week" | "grid";

function initials(name: string | null, username: string | null): string {
  const label = name ?? username ?? "?";
  return label.slice(0, 2).toUpperCase();
}

function timeAgoLabel(sentAt: string | null): string {
  if (!sentAt) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(sentAt).getTime()) / 60000));
  if (mins < 1) return i18n.t("groups:rebbe.time.justNow");
  if (mins < 60) return i18n.t("groups:rebbe.time.minutes", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return i18n.t("groups:rebbe.time.hours", { count: hours });
  const days = Math.round(hours / 24);
  return i18n.t("groups:rebbe.time.days", { count: days });
}

function StatusLine({ standing }: { standing: StudentStanding }) {
  const { t } = useTranslation("groups");
  if (standing.daysQuiet === null)
    return <span className="rebbe-row__status">{t("rebbe.sentAgo", { time: timeAgoLabel(standing.lastSentAt) })}</span>;
  if (!isFinite(standing.daysQuiet)) return <span className="rebbe-row__status">{t("rebbe.nothingYet")}</span>;
  return (
    <span className="rebbe-row__status rebbe-row__status--quiet">{t("rebbe.quietFor", { count: standing.daysQuiet })}</span>
  );
}

function InviteAndJoinPanel({ group, onSent }: { group: Group; onSent: () => void }) {
  const { t } = useTranslation("groups");
  const direction = useDirection();
  const { addMembers, rotateJoinCode } = useChevrusa();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  async function handleInvite() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const result = await addMembers(group.id, [email]);
    setBusy(false);
    if (result) setError(result);
    else {
      setEmail("");
      onSent();
    }
  }

  async function handleRotate() {
    setRotating(true);
    await rotateJoinCode(group.id);
    setRotating(false);
  }

  return (
    <div className="rebbe-invite">
      <label className="login-field">
        <span className="login-field__label">{t("rebbe.inviteLabel")}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
      </label>
      <button className="restart" disabled={busy || !email.trim()} onClick={handleInvite}>
        {busy ? t("rebbe.sending") : t("rebbe.invite")}
      </button>
      {error && (
        <p className="login-error" dir={direction}>
          {error}
        </p>
      )}

      <div className="rebbe-joincode">
        {group.joinCode ? (
          <>
            <p className="rebbe-joincode__label">{t("rebbe.joinCode")}</p>
            <p className="rebbe-joincode__code">{group.joinCode}</p>
            <div className="rebbe-joincode__actions">
              <button
                className="rebbe-joincode__link"
                onClick={() => navigator.clipboard?.writeText(group.joinCode ?? "")}
              >
                {t("rebbe.copy")}
              </button>
              <button className="rebbe-joincode__link" onClick={handleRotate} disabled={rotating}>
                {rotating ? "…" : t("rebbe.newCode")}
              </button>
            </div>
          </>
        ) : (
          <button className="restart" disabled={rotating} onClick={handleRotate}>
            {rotating ? "…" : t("rebbe.generateCode")}
          </button>
        )}
      </div>
    </div>
  );
}

function StudentDetail({
  standing,
  group,
  history,
  onBack,
}: {
  standing: StudentStanding;
  group: Group;
  history: ReturnType<typeof historyFor>;
  onBack: () => void;
}) {
  const { t } = useTranslation("groups");
  const name = standing.student.firstName ?? standing.student.username ?? t("rebbe.student");
  const sentDays = history.length;
  return (
    <div className="rebbe-detail">
      <button className="rebbe-back" onClick={onBack}>
        {t("rebbe.back")}
      </button>
      <div className="rebbe-detail__head">
        <div className="rebbe-detail__avatar">{initials(standing.student.firstName, standing.student.username)}</div>
        <div>
          <p className="rebbe-detail__name">{name}</p>
          <p className="rebbe-detail__sub">{t("rebbe.sentOfLast", { sent: sentDays, days: Math.min(30, sentDays || 7) })}</p>
        </div>
      </div>
      <div className="rebbe-detail__days">
        {history.length === 0 ? (
          <p className="chevrusa-empty">{t("rebbe.nothingSentFor", { name: group.name ?? group.masechetEn })}</p>
        ) : (
          history.map((day) => (
            <div key={day.date} className="rebbe-day-card">
              <div className="rebbe-day-card__head">
                <span className="rebbe-day-card__date">{day.date}</span>
                <span className="rebbe-day-card__time">{timeAgoLabel(day.sentAt)}</span>
              </div>
              {day.activities.map((a) => (
                <p key={a.key} className="rebbe-day-card__line">
                  {/* The label is stored in the student's report; name it by
                      its key so the rebbe reads it in his own language. */}
                  <strong>{t(`activity.${a.key}`, { defaultValue: a.label })}:</strong> {a.detail}
                </p>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface RebbeDashboardScreenProps {
  shiurim: Group[];
}

export function RebbeDashboardScreen({ shiurim }: RebbeDashboardScreenProps) {
  const { t } = useTranslation("groups");
  const locale = useLocale();
  const [shiurId, setShiurId] = useState(shiurim[0]?.id ?? "");
  const group = shiurim.find((g) => g.id === shiurId) ?? shiurim[0];
  const { students, submissions, refresh } = useRebbeChabura(group?.id ?? null);
  const [view, setView] = useState<View>("today");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [sortByName, setSortByName] = useState(false);

  if (!group) return null;

  const standings = standingsBySilence(students, submissions);
  const weekDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekDays.push(localDateStr(d));
  }
  const sentDatesByStudent = new Map<string, Set<string>>();
  for (const s of submissions) {
    if (!weekDays.includes(s.date)) continue;
    if (!sentDatesByStudent.has(s.userId)) sentDatesByStudent.set(s.userId, new Set());
    sentDatesByStudent.get(s.userId)!.add(s.date);
  }
  const displayed = sortByName
    ? [...standings].sort((a, b) => (a.student.firstName ?? a.student.username ?? "").localeCompare(b.student.firstName ?? b.student.username ?? ""))
    : standings;

  const sentToday = standings.filter((s) => s.daysQuiet === null).length;
  const notYetToday = standings.length - sentToday;
  const quiet3Plus = standings.filter((s) => isFinite(s.daysQuiet ?? 0) && (s.daysQuiet ?? 0) >= 3).length;

  if (selectedStudent) {
    const standing = standings.find((s) => s.student.userId === selectedStudent);
    if (standing) {
      return (
        <div className="stage">
          <div className="panel rebbe-panel">
            <StudentDetail
              standing={standing}
              group={group}
              history={historyFor(submissions, selectedStudent)}
              onBack={() => setSelectedStudent(null)}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="stage">
      <div className="panel rebbe-panel">
        <div className="rebbe-head">
          <div>
            <h1 className="screen-head__title rebbe-title">{group.name ?? group.masechetEn}</h1>
            <p className="rebbe-sub">
              {t("rebbe.subtitle", {
                count: students.length,
                date: new Date().toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" }),
              })}
            </p>
          </div>
          {shiurim.length > 1 && (
            <select className="rebbe-shiur-select" value={shiurId} onChange={(e) => setShiurId(e.target.value)}>
              {shiurim.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name ?? g.masechetEn}
                </option>
              ))}
            </select>
          )}
          <div className="pill-row rebbe-view-pills">
            <button className={"pill" + (view === "today" ? " pill--active" : "")} onClick={() => setView("today")}>
              {t("rebbe.viewToday")}
            </button>
            <button className={"pill" + (view === "week" ? " pill--active" : "")} onClick={() => setView("week")}>
              {t("rebbe.viewWeek")}
            </button>
            <button className={"pill" + (view === "grid" ? " pill--active" : "")} onClick={() => setView("grid")}>
              {t("rebbe.viewGrid")}
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <>
            <p className="panel__subtitle">{t("rebbe.empty")}</p>
            <InviteAndJoinPanel group={group} onSent={refresh} />
          </>
        ) : view === "grid" ? (
          <RebbeGrid students={students} submissions={submissions} />
        ) : (
          <>
            <div className="rebbe-summary">
              <div className="rebbe-summary__figure rebbe-summary__figure--sent">
                <p className="rebbe-summary__num">{sentToday}</p>
                <p className="rebbe-summary__label">{t("rebbe.sentToday")}</p>
              </div>
              <div className="rebbe-summary__figure rebbe-summary__figure--wait">
                <p className="rebbe-summary__num">{notYetToday}</p>
                <p className="rebbe-summary__label">{t("rebbe.notYetToday")}</p>
              </div>
              <div className="rebbe-summary__figure rebbe-summary__figure--quiet">
                <p className="rebbe-summary__num">{quiet3Plus}</p>
                <p className="rebbe-summary__label">{t("rebbe.quiet3")}</p>
              </div>
            </div>

            <div className="rebbe-list-head">
              <span>{t("rebbe.quietFirst")}</span>
              <button className="rebbe-sort-toggle" onClick={() => setSortByName((v) => !v)}>
                {sortByName ? t("rebbe.sortBySilence") : t("rebbe.sortByName")}
              </button>
            </div>

            <div className="rebbe-list">
              {displayed.map((s) => {
                const ruleColor =
                  s.daysQuiet === null
                    ? "var(--line)"
                    : (s.daysQuiet ?? 0) >= 3
                      ? "var(--bad-dot)"
                      : "var(--gold)";
                return (
                  <button
                    key={s.student.userId}
                    className="rebbe-row"
                    style={{ borderInlineStartColor: ruleColor }}
                    onClick={() => setSelectedStudent(s.student.userId)}
                  >
                    <span className="rebbe-row__avatar">{initials(s.student.firstName, s.student.username)}</span>
                    <span className="rebbe-row__body">
                      <span className="rebbe-row__name">{s.student.firstName ?? s.student.username ?? t("rebbe.student")}</span>
                      <StatusLine standing={s} />
                    </span>
                    <span className="rebbe-row__figures">
                      {view === "week" ? (
                        <span
                          className="rebbe-row__week"
                          title={t("rebbe.weekSent", { n: sentDatesByStudent.get(s.student.userId)?.size ?? 0 })}
                        >
                          {weekDays.map((d) => (
                            <span
                              key={d}
                              className={
                                "rebbe-row__week-cell" +
                                (sentDatesByStudent.get(s.student.userId)?.has(d) ? " rebbe-row__week-cell--sent" : "")
                              }
                            />
                          ))}
                        </span>
                      ) : s.todayActivities.length > 0 ? (
                        s.todayActivities.slice(0, 2).map((a) => (
                          <span key={a.key} className="rebbe-row__figure">
                            {a.figure}
                          </span>
                        ))
                      ) : (
                        <span className="rebbe-row__figure rebbe-row__figure--empty">—</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <details className="rebbe-invite-details">
              <summary>{t("rebbe.manage")}</summary>
              <InviteAndJoinPanel group={group} onSent={refresh} />
            </details>
          </>
        )}
      </div>
    </div>
  );
}

/** `label` stays English: it heads the CSV export's columns, a
    spreadsheet file that keeps English headers. On screen, `key` names
    the column through groups:rebbe.grid. */
const GRID_ACTIVITIES: { key: SubmissionActivity["key"]; label: string; unit: string }[] = [
  { key: "limmud", label: "Limmud", unit: "mishnayot" },
  { key: "quiz", label: "Quiz", unit: "grade" },
  { key: "sidrei", label: "Sidrei", unit: "placed" },
  { key: "sort", label: "Sort", unit: "placed" },
  { key: "dash", label: "Dash", unit: "score" },
  { key: "chazara", label: "Chazara", unit: "recalled" },
];

function letterGradeFromPct(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}
const GPA_POINTS: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
function gpaToLetter(gpa: number): string {
  if (gpa >= 3.5) return "A";
  if (gpa >= 2.5) return "B";
  if (gpa >= 1.5) return "C";
  if (gpa >= 0.5) return "D";
  return "F";
}

/** Averages honestly over students who attempted, per REBBE-DASHBOARD-
    BRIEF.md §3b: grades convert to a 4-point scale and back to the
    nearest letter; placed/total figures average as a fraction; plain
    counts average arithmetically. Never averages across activities. */
function averageFigure(key: SubmissionActivity["key"], entries: SubmissionActivity[]): string | null {
  if (entries.length === 0) return null;
  if (key === "quiz") {
    const gpas = entries.map((e) => GPA_POINTS[letterGradeFromPct((e.value / (e.outOf || 1)) * 100)] ?? 0);
    return gpaToLetter(gpas.reduce((a, b) => a + b, 0) / gpas.length);
  }
  if (key === "sidrei" || key === "sort") {
    const avgPlaced = Math.round(entries.reduce((a, e) => a + e.value, 0) / entries.length);
    const total = entries[0].outOf ?? avgPlaced;
    return `${avgPlaced}/${total}`;
  }
  return String(Math.round(entries.reduce((a, e) => a + e.value, 0) / entries.length));
}

function downloadCsv(
  students: { userId: string; firstName: string | null; username: string | null }[],
  todaysByStudent: Map<string, Map<string, SubmissionActivity>>,
) {
  const header = ["Student", ...GRID_ACTIVITIES.map((a) => a.label)];
  const rows = students.map((st) => {
    const figures = todaysByStudent.get(st.userId);
    return [
      st.firstName ?? st.username ?? "Student",
      ...GRID_ACTIVITIES.map((a) => figures?.get(a.key)?.figure ?? ""),
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shiur-${localDateStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RebbeGrid({
  students,
  submissions,
}: {
  students: { userId: string; firstName: string | null; username: string | null }[];
  submissions: ReturnType<typeof useRebbeChabura>["submissions"];
}) {
  const { t } = useTranslation("groups");
  const [mobileActivity, setMobileActivity] = useState<SubmissionActivity["key"]>(GRID_ACTIVITIES[0].key);
  const today = localDateStr();
  const todaysByStudent = new Map<string, Map<string, SubmissionActivity>>();
  for (const s of submissions) {
    if (s.date !== today) continue;
    todaysByStudent.set(s.userId, new Map(s.activities.map((a) => [a.key, a])));
  }

  const averages = GRID_ACTIVITIES.map((a) => {
    const entries: SubmissionActivity[] = [];
    for (const figures of todaysByStudent.values()) {
      const entry = figures.get(a.key);
      if (entry) entries.push(entry);
    }
    return { key: a.key, avg: averageFigure(a.key, entries), count: entries.length };
  });

  return (
    <>
      <div className="rebbe-grid-wrap rebbe-grid-wrap--desktop">
        <table className="rebbe-grid">
          <thead>
            <tr>
              <th className="rebbe-grid__student-col">{t("rebbe.student")}</th>
              {GRID_ACTIVITIES.map((a) => (
                <th key={a.key}>
                  <span className="rebbe-grid__col-label">{t(`rebbe.grid.${a.key}`)}</span>
                  <span className="rebbe-grid__col-unit">{t(`rebbe.grid.${a.key}Unit`)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const figures = todaysByStudent.get(st.userId);
              return (
                <tr key={st.userId}>
                  <td className="rebbe-grid__student-col">
                    <span className="rebbe-grid__avatar">{initials(st.firstName, st.username)}</span>
                    {st.firstName ?? st.username ?? t("rebbe.student")}
                  </td>
                  {GRID_ACTIVITIES.map((a) => {
                    const entry = figures?.get(a.key);
                    return (
                      <td key={a.key} className={entry ? "" : "rebbe-grid__empty"}>
                        {entry?.figure ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="rebbe-grid__avg-row">
              <td className="rebbe-grid__student-col">{t("rebbe.shiurAverage")}</td>
              {averages.map((a) => (
                <td key={a.key}>
                  {a.avg ? (
                    <>
                      {a.avg}
                      <span className="rebbe-grid__avg-count">{t("rebbe.avgCount", { n: a.count, total: students.length })}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        <div className="rebbe-grid__foot">
          <p className="rebbe-grid__legend">{t("rebbe.legend")}</p>
          <button className="rebbe-grid__csv" onClick={() => downloadCsv(students, todaysByStudent)}>
            {t("rebbe.exportCsv")}
          </button>
        </div>
      </div>

      <div className="rebbe-grid-mobile">
        <div className="pill-row rebbe-grid-mobile__pills">
          {GRID_ACTIVITIES.map((a) => (
            <button
              key={a.key}
              className={"pill" + (mobileActivity === a.key ? " pill--active" : "")}
              onClick={() => setMobileActivity(a.key)}
            >
              {t(`rebbe.grid.${a.key}`)}
            </button>
          ))}
        </div>
        <div className="rebbe-grid-mobile__list">
          {students.map((st) => {
            const entry = todaysByStudent.get(st.userId)?.get(mobileActivity);
            return (
              <div key={st.userId} className="rebbe-grid-mobile__row">
                <span className="rebbe-grid__avatar">{initials(st.firstName, st.username)}</span>
                <span className="rebbe-grid-mobile__name">{st.firstName ?? st.username ?? t("rebbe.student")}</span>
                <span className={entry ? "rebbe-grid-mobile__figure" : "rebbe-grid-mobile__figure rebbe-grid__empty"}>
                  {entry?.figure ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
        {(() => {
          const avg = averages.find((a) => a.key === mobileActivity);
          return avg?.avg ? (
            <p className="rebbe-grid-mobile__avg">
              {t("rebbe.mobileAverage", { avg: avg.avg, n: avg.count, total: students.length })}
            </p>
          ) : null;
        })()}
      </div>
    </>
  );
}
