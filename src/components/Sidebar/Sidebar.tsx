import { NavIcon } from "../Icon/NavIcon";
import { BrandMark } from "../BrandMark";
import { HUE, NAV_GROUPS, ADMIN_ITEM, REBBE_ITEM, type NavItemDef } from "../../utils/navItems";
import "./Sidebar.css";

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  isAdmin?: boolean;
  /** Holds the "teacher" role in at least one class chabura — students
      never see this entry (REBBE-DASHBOARD-BRIEF.md §5). */
  isRebbe?: boolean;
}

function NavButton({ item, active, onSelect }: { item: NavItemDef; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      className={"nav-item" + (active ? " nav-item--active" : "")}
      style={active ? { background: HUE[item.id] ?? "var(--gold)" } : undefined}
      onClick={() => onSelect(item.id)}
    >
      <span className="nav-item__icon">
        <NavIcon id={item.id} />
      </span>
      <span className="nav-item__label">{item.label}</span>
    </button>
  );
}

export function Sidebar({ activeId, onSelect, isAdmin, isRebbe }: SidebarProps) {
  return (
    <nav className="sidebar">
      <BrandMark variant="reversed" className="sidebar__brand" />
      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <span className="nav-group__label">{group.label}</span>
          {group.items.map((item) => (
            <NavButton key={item.id} item={item} active={activeId === item.id} onSelect={onSelect} />
          ))}
        </div>
      ))}
      {isAdmin && (
        <div className="nav-group nav-group--login">
          <NavButton item={ADMIN_ITEM} active={activeId === ADMIN_ITEM.id} onSelect={onSelect} />
        </div>
      )}
      {isRebbe && (
        <div className="nav-group nav-group--login">
          <NavButton item={REBBE_ITEM} active={activeId === REBBE_ITEM.id} onSelect={onSelect} />
        </div>
      )}
    </nav>
  );
}
