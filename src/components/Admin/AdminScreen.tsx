import { useState } from "react";
import { useAdmin } from "../../utils/useAdmin";
import { useAdminActivityGrid } from "../../utils/useAdminActivityGrid";
import { useAdminAudit } from "../../utils/useAdminAudit";
import { useAdminGroups } from "../../utils/useAdminGroups";
import { useAdminGameStats } from "../../utils/useAdminGameStats";
import { useAdminSiyumim } from "../../utils/useAdminData";
import { useAuth } from "../../utils/useAuth";
import { RebbeGrid } from "../RebbeDashboard/RebbeDashboardScreen";
import { UsersSection } from "./UsersSection";
import { UserDrawer } from "./UserDrawer";
import { GrowthSection } from "./GrowthSection";
import { SiyumimSection, SiyumDrawer } from "./SiyumimSection";
import { ChaburotSection, GroupDrawer } from "./ChaburotSection";
import { ModerationSection } from "./ModerationSection";
import { GamesSection } from "./GamesSection";
import { AuditLogSection } from "./AuditLogSection";
import { AnnouncementSection } from "./AnnouncementSection";
import "../RebbeDashboard/RebbeDashboardScreen.css";
import "./AdminScreen.css";

type Section = "users" | "growth" | "siyumim" | "chaburot" | "moderation" | "activity" | "games" | "log" | "announcement";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "growth", label: "Growth" },
  { id: "siyumim", label: "Siyumim" },
  { id: "chaburot", label: "Chaburos" },
  { id: "moderation", label: "Moderation" },
  { id: "activity", label: "Today" },
  { id: "games", label: "Games" },
  { id: "log", label: "Audit log" },
  { id: "announcement", label: "Message" },
];

type Drawer = { kind: "user" | "group" | "siyum"; id: string } | null;

export function AdminScreen() {
  const auth = useAuth();
  const { overview, users, loading, error, refresh } = useAdmin(true);
  const activityGrid = useAdminActivityGrid(true);
  const audit = useAdminAudit(true);
  const groups = useAdminGroups(true);
  const gameStats = useAdminGameStats(true);
  const siyumim = useAdminSiyumim(true);

  const [section, setSection] = useState<Section>("users");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const open = (kind: "user" | "group" | "siyum") => (id: string) => setDrawer({ kind, id });

  function refreshAll() {
    refresh();
    audit.refresh();
    groups.refresh();
    gameStats.refresh();
    siyumim.refresh();
  }

  const openUser = drawer?.kind === "user" ? users.find((u) => u.id === drawer.id) : undefined;
  const openGroup = drawer?.kind === "group" ? groups.groups.find((g) => g.id === drawer.id) : undefined;
  const openSiyum = drawer?.kind === "siyum" ? siyumim.data.find((s) => s.id === drawer.id) : undefined;

  return (
    <div className="stage">
      <div className="panel">
        <div className="screen-head">
          <h1 className="screen-head__title">Admin</h1>
          <p className="screen-head__sub">Every account, chabura, siyum and privileged action.</p>
          <div className="screen-head__aside">
            <button className="btn btn--secondary btn--compact" onClick={refreshAll} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && <p className="state state--error callout callout--bad">{error}</p>}

        {overview && (
          <div className="admin-overview-grid">
            {[
              { n: overview.totalUsers, label: "users" },
              { n: overview.totalChevrusot, label: "chevrusos" },
              { n: overview.totalChaburot, label: "chaburos" },
              { n: overview.totalSiyumim, label: "siyumim" },
              { n: overview.learnedClaims, label: "perakim learned" },
              { n: overview.openPerakim, label: "perakim still open" },
            ].map((s) => (
              <div key={s.label} className="card admin-stat">
                <p className="admin-stat__num">{s.n}</p>
                <p className="admin-stat__label">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="pill-row admin-sections" role="tablist" aria-label="Admin sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={section === s.id}
              className={"pill pill--compact" + (section === s.id ? " pill--active" : "")}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === "users" && <UsersSection users={users} loading={loading} onOpenUser={open("user")} />}

        {section === "growth" && <GrowthSection />}

        {section === "siyumim" && (
          <SiyumimSection siyumim={siyumim.data} loading={siyumim.loading} error={siyumim.error} onOpenSiyum={open("siyum")} />
        )}

        {section === "chaburot" && (
          <ChaburotSection groups={groups.groups} loading={groups.loading} error={groups.error} onOpenGroup={open("group")} />
        )}

        {section === "moderation" && (
          <ModerationSection
            siyumim={siyumim.data}
            onOpenUser={open("user")}
            onOpenGroup={open("group")}
            onOpenSiyum={open("siyum")}
          />
        )}

        {section === "activity" && (
          <>
            {activityGrid.error && <p className="state state--error callout callout--bad">{activityGrid.error}</p>}
            {activityGrid.loading && activityGrid.students.length === 0 ? (
              <p className="state state--loading">Loading…</p>
            ) : (
              <RebbeGrid students={activityGrid.students} submissions={activityGrid.submissions} />
            )}
          </>
        )}

        {section === "games" && (
          <GamesSection
            users={users}
            byUser={gameStats.byUser}
            loading={gameStats.loading}
            error={gameStats.error}
            onOpenUser={open("user")}
          />
        )}

        {section === "log" && <AuditLogSection entries={audit.entries} loading={audit.loading} error={audit.error} />}

        {section === "announcement" && <AnnouncementSection />}
      </div>

      {openUser && (
        <UserDrawer
          key={openUser.id}
          user={openUser}
          isSelf={openUser.id === auth.session?.user.id}
          games={gameStats.byUser.get(openUser.id)}
          gamesError={gameStats.error}
          onClose={() => setDrawer(null)}
          onChanged={refreshAll}
          onOpenGroup={open("group")}
          onOpenSiyum={open("siyum")}
        />
      )}
      {openGroup && (
        <GroupDrawer
          key={openGroup.id}
          group={openGroup}
          onClose={() => setDrawer(null)}
          onChanged={refreshAll}
          onOpenUser={open("user")}
        />
      )}
      {openSiyum && (
        <SiyumDrawer
          key={openSiyum.id}
          siyum={openSiyum}
          onClose={() => setDrawer(null)}
          onChanged={refreshAll}
          onOpenUser={open("user")}
        />
      )}
    </div>
  );
}
