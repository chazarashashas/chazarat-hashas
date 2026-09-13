import { useAdminGrowth } from "../../utils/useAdminData";
import { localDateStr } from "../../utils/localDate";
import { AdminBarChart } from "./AdminBarChart";
import { GAMES, fillDates, fillWeeks, plural } from "./adminShared";

function dayLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** App-wide numbers: who is signing up, who is learning, what they learn. */
export function GrowthSection() {
  const { data: g, loading, error } = useAdminGrowth(true);
  const today = localDateStr();

  if (error) return <p className="state state--error callout callout--bad">{error}</p>;
  if (!g) return <p className="state state--loading">{loading ? "Loading…" : "No data yet."}</p>;

  const weekly = new Map(g.signupsByWeek.map((w) => [w.week, w]));
  const signups = fillWeeks(26, today).map((week) => {
    const w = weekly.get(week);
    const google = w?.google ?? 0;
    const email = w?.email ?? 0;
    return {
      key: week,
      label: dayLabel(week),
      value: google + email,
      tooltip: `Week of ${dayLabel(week)} · ${plural(google + email, "sign-up", "sign-ups")} (${google} Google, ${email} email)`,
    };
  });

  const daily = new Map(g.activeByDay.map((a) => [a.date, a]));
  const learners = fillDates(30, today).map((date) => {
    const a = daily.get(date);
    return {
      key: date,
      label: dayLabel(date),
      value: a?.users ?? 0,
      tooltip: `${dayLabel(date)} · ${plural(a?.users ?? 0, "person", "people")} · ${plural(a?.mishnayot ?? 0, "mishnah", "mishnayot")}`,
    };
  });

  const weekDelta = g.mishnayotWeek - g.mishnayotPrevWeek;
  const tiles = [
    { n: g.usersTotal, label: "users", sub: `${g.googleTotal} via Google` },
    { n: g.activeToday, label: "learned today", sub: null },
    { n: g.activeWeek, label: "learned this week", sub: null },
    { n: g.activeMonth, label: "learned this month", sub: null },
    {
      n: g.mishnayotWeek,
      label: "mishnayot this week",
      sub: weekDelta === 0 ? "same as last week" : `${weekDelta > 0 ? "+" : "−"}${Math.abs(weekDelta)} vs last week`,
    },
    { n: g.mishnayotTotal, label: "mishnayot, all time", sub: null },
  ];

  return (
    <>
      <div className="admin-overview-grid">
        {tiles.map((t) => (
          <div key={t.label} className="card admin-stat">
            <p className="admin-stat__num">{t.n.toLocaleString()}</p>
            <p className="admin-stat__label">{t.label}</p>
            {t.sub && <p className="admin-stat__sub">{t.sub}</p>}
          </div>
        ))}
      </div>

      <div className="card admin-card">
        <AdminBarChart title="Sign-ups per week · last 26 weeks" unit="sign-ups" data={signups} />
      </div>
      <div className="card admin-card">
        <AdminBarChart title="People learning per day · last 30 days" unit="people" data={learners} />
      </div>

      <div className="admin-two-col">
        <div className="card admin-card">
          <h3 className="section-title">Most-learned masechtot</h3>
          {g.topMasechtot.length === 0 ? (
            <p className="state state--empty">Nothing learned yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Masechet</th>
                  <th className="admin-table__num">Mishnayot</th>
                  <th className="admin-table__num">People</th>
                </tr>
              </thead>
              <tbody>
                {g.topMasechtot.map((t) => (
                  <tr key={t.masechetEn}>
                    <td>{t.masechetEn}</td>
                    <td className="admin-table__num">{t.mishnayot.toLocaleString()}</td>
                    <td className="admin-table__num">{t.learners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card admin-card">
          <h3 className="section-title">Games played</h3>
          <table className="admin-table">
            <tbody>
              {GAMES.map((game) => (
                <tr key={game.id}>
                  <td>{game.label}</td>
                  <td className="admin-table__num">
                    {g.gamePlays[game.id].toLocaleString()} {game.id === "sort" || game.id === "sidrei" ? "completed" : "plays"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="field__hint">Counts only games played while signed in.</p>
        </div>
      </div>
    </>
  );
}
