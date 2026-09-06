import { useAdmin } from "../../utils/useAdmin";
import "./AdminScreen.css";

export function AdminScreen() {
  const { overview, users, loading, error } = useAdmin(true);

  return (
    <div className="stage">
      <div className="panel admin-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Admin</h1>
        <p className="panel__subtitle">Everything across every account, read-only.</p>

        {error && (
          <p className="login-error" dir="ltr">
            {error}
          </p>
        )}

        {loading && !overview ? (
          <p className="admin-loading">Loading…</p>
        ) : (
          overview && (
            <div className="admin-overview-grid">
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalUsers}</p>
                <p className="admin-stat__label">users</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalChevrusot}</p>
                <p className="admin-stat__label">chevrusot</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalChaburot}</p>
                <p className="admin-stat__label">chaburot</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.totalSiyumim}</p>
                <p className="admin-stat__label">siyumim</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.learnedClaims}</p>
                <p className="admin-stat__label">perakim learned</p>
              </div>
              <div className="admin-stat">
                <p className="admin-stat__num">{overview.openPerakim}</p>
                <p className="admin-stat__label">perakim still open</p>
              </div>
            </div>
          )
        )}

        <h2 className="account-section-title">Users</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Mishnayot</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : "—"}</td>
                  <td>{u.username ?? "—"}</td>
                  <td>{u.email}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>{u.mishnayotLearned}</td>
                  <td>{u.isAdmin ? "Yes" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
