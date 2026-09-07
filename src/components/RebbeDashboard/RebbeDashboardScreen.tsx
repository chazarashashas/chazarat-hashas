import { useState } from "react";
import { useChevrusa, type Group } from "../../utils/useChevrusa";
import { useRebbeChabura, standingsBySilence, historyFor, type StudentStanding } from "../../utils/useRebbeChabura";
import type { SubmissionActivity } from "../../utils/useDailySubmission";
import "./RebbeDashboardScreen.css";

type View = "today" | "week" | "grid";

function initials(name: string | null, username: string | null): string {
  const label = name ?? username ?? "?";
  return label.slice(0, 2).toUpperCase();
}

function timeAgoLabel(sentAt: string | null): string {
  if (!sentAt) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(sentAt).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function StatusLine({ standing }: { standing: StudentStanding }) {
  if (standing.daysQuiet === null) return <span className="rebbe-row__status">Sent {timeAgoLabel(standing.lastSentAt)}</span>;
  if (!isFinite(standing.daysQuiet)) return <span className="rebbe-row__status">Nothing sent yet</span>;
  return (
    <span className="rebbe-row__status rebbe-row__status--quiet">
      Nothing sent for {standing.daysQuiet} day{standing.daysQuiet === 1 ? "" : "s"}
    </span>
  );
}

function InviteAndJoinPanel({ group, onSent }: { group: Group; onSent: () => void }) {
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
        <span className="login-field__label">Invite by email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
      </label>
      <button className="restart" disabled={busy || !email.trim()} onClick={handleInvite}>
        {busy ? "Sending…" : "Invite"}
      </button>
      {error && (
        <p className="login-error" dir="ltr">
          {error}
        </p>
      )}

      <div className="rebbe-joincode">
        {group.joinCode ? (
          <>
            <p className="rebbe-joincode__label">Join code</p>
            <p className="rebbe-joincode__code">{group.joinCode}</p>
            <div className="rebbe-joincode__actions">
              <button
                className="rebbe-joincode__link"
                onClick={() => navigator.clipboard?.writeText(group.joinCode ?? "")}
              >
                Copy
              </button>
              <button className="rebbe-joincode__link" onClick={handleRotate} disabled={rotating}>
                {rotating ? "…" : "New code"}
              </button>
            </div>
          </>
        ) : (
          <button className="restart" disabled={rotating} onClick={handleRotate}>
            {rotating ? "…" : "Generate a join code"}
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
  const name = standing.student.firstName ?? standing.student.username ?? "Student";
  const sentDays = history.length;
  return (
    <div className="rebbe-detail">
      <button className="rebbe-back" onClick={onBack}>
        ← Back
      </button>
      <div className="rebbe-detail__head">
        <div className="rebbe-detail__avatar">{initials(standing.student.firstName, standing.student.username)}</div>
        <div>
          <p className="rebbe-detail__name">{name}</p>
          <p className="rebbe-detail__sub">
            Sent {sentDays} of the last {Math.min(30, sentDays || 7)} days
          </p>
        </div>
      </div>
      <div className="rebbe-detail__days">
        {history.length === 0 ? (
          <p className="chevrusa-empty">Nothing sent yet for {group.name ?? group.masechetEn}.</p>
        ) : (
          history.map((day) => (
            <div key={day.date} className="rebbe-day-card">
              <div className="rebbe-day-card__head">
                <span className="rebbe-day-card__date">{day.date}</span>
                <span className="rebbe-day-card__time">{timeAgoLabel(day.sentAt)}</span>
              </div>
              {day.activities.map((a) => (
                <p key={a.key} className="rebbe-day-card__line">
                  <strong>{a.label}:</strong> {a.detail}
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
    weekDays.push(d.toISOString().slice(0, 10));
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
            <h1 className="panel__title rebbe-title">{group.name ?? group.masechetEn}</h1>
            <p className="rebbe-sub">
              {students.length} student{students.length === 1 ? "" : "s"} · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
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
              Today
            </button>
            <button className={"pill" + (view === "week" ? " pill--active" : "")} onClick={() => setView("week")}>
              Week
            </button>
            <button className={"pill" + (view === "grid" ? " pill--active" : "")} onClick={() => setView("grid")}>
              Grid
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <>
            <p className="panel__subtitle">Add your first students to get started — invite by email, or share a join code.</p>
            <InviteAndJoinPanel group={group} onSent={refresh} />
          </>
        ) : view === "grid" ? (
          <RebbeGrid students={students} submissions={submissions} />
        ) : (
          <>
            <div className="rebbe-summary">
              <div className="rebbe-summary__figure rebbe-summary__figure--sent">
                <p className="rebbe-summary__num">{sentToday}</p>
                <p className="rebbe-summary__label">sent today</p>
              </div>
              <div className="rebbe-summary__figure rebbe-summary__figure--wait">
                <p className="rebbe-summary__num">{notYetToday}</p>
                <p className="rebbe-summary__label">not yet today</p>
              </div>
              <div className="rebbe-summary__figure rebbe-summary__figure--quiet">
                <p className="rebbe-summary__num">{quiet3Plus}</p>
                <p className="rebbe-summary__label">quiet 3+ days</p>
              </div>
            </div>

            <div className="rebbe-list-head">
              <span>Quiet longest first</span>
              <button className="rebbe-sort-toggle" onClick={() => setSortByName((v) => !v)}>
                {sortByName ? "Sort by silence" : "Sort by name"}
              </button>
            </div>

            <div className="rebbe-list">
              {displayed.map((s) => {
                const ruleColor = s.daysQuiet === null ? "#cfc7b2" : (s.daysQuiet ?? 0) >= 3 ? "#b8543f" : "#b8862b";
                return (
                  <button
                    key={s.student.userId}
                    className="rebbe-row"
                    style={{ borderLeftColor: ruleColor }}
                    onClick={() => setSelectedStudent(s.student.userId)}
                  >
                    <span className="rebbe-row__avatar">{initials(s.student.firstName, s.student.username)}</span>
                    <span className="rebbe-row__body">
                      <span className="rebbe-row__name">{s.student.firstName ?? s.student.username ?? "Student"}</span>
                      <StatusLine standing={s} />
                    </span>
                    <span className="rebbe-row__figures">
                      {view === "week" ? (
                        <span className="rebbe-row__week" title={`${sentDatesByStudent.get(s.student.userId)?.size ?? 0}/7 sent`}>
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
              <summary>Add or manage students</summary>
              <InviteAndJoinPanel group={group} onSent={refresh} />
            </details>
          </>
        )}
      </div>
    </div>
  );
}

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
  a.download = `shiur-${new Date().toISOString().slice(0, 10)}.csv`;
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
  const [mobileActivity, setMobileActivity] = useState<SubmissionActivity["key"]>(GRID_ACTIVITIES[0].key);
  const today = new Date().toISOString().slice(0, 10);
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
              <th className="rebbe-grid__student-col">STUDENT</th>
              {GRID_ACTIVITIES.map((a) => (
                <th key={a.key}>
                  <span className="rebbe-grid__col-label">{a.label}</span>
                  <span className="rebbe-grid__col-unit">{a.unit}</span>
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
                    {st.firstName ?? st.username ?? "Student"}
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
              <td className="rebbe-grid__student-col">Shiur average</td>
              {averages.map((a) => (
                <td key={a.key}>
                  {a.avg ? (
                    <>
                      {a.avg}
                      <span className="rebbe-grid__avg-count"> · {a.count} of {students.length}</span>
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
          <p className="rebbe-grid__legend">Em-dash means nothing attempted today, not a zero.</p>
          <button className="rebbe-grid__csv" onClick={() => downloadCsv(students, todaysByStudent)}>
            Export CSV
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
              {a.label}
            </button>
          ))}
        </div>
        <div className="rebbe-grid-mobile__list">
          {students.map((st) => {
            const entry = todaysByStudent.get(st.userId)?.get(mobileActivity);
            return (
              <div key={st.userId} className="rebbe-grid-mobile__row">
                <span className="rebbe-grid__avatar">{initials(st.firstName, st.username)}</span>
                <span className="rebbe-grid-mobile__name">{st.firstName ?? st.username ?? "Student"}</span>
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
              Shiur average: {avg.avg} · {avg.count} of {students.length}
            </p>
          ) : null;
        })()}
      </div>
    </>
  );
}
