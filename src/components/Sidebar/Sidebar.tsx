import { NavIcon } from "./NavIcon";
import "./Sidebar.css";

interface NavItem {
  id: string;
  label: string;
  built: boolean;
}

const HOME_ITEM: NavItem = { id: "home", label: "Home", built: true };

/** Mirrors Home's own "My Mishna" / "Learning Tools" split exactly — a
    student who's already parsed Home's two sections shouldn't have to
    learn a second, different grouping here. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "My Mishna",
    items: [
      { id: "limmud", label: "Daily Limmud", built: true },
      { id: "map", label: "Map of Shas", built: true },
      { id: "perek", label: "Mishna Notes", built: true },
      { id: "progress", label: "Progress", built: true },
      { id: "chevrusa", label: "Chevrusa", built: true },
      { id: "login", label: "Log In", built: true },
    ],
  },
  {
    label: "Learning Tools",
    items: [
      { id: "sedarim", label: "Sidrei Hamishna", built: true },
      { id: "mishna", label: "Mishna Quiz", built: true },
      { id: "sort", label: "Seder Sort", built: true },
      { id: "recall", label: "Mishna Chazara", built: true },
      { id: "dash", label: "Shas Dash", built: true },
      { id: "resources", label: "Resources", built: true },
    ],
  },
];

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

function NavButton({ item, active, onSelect }: { item: NavItem; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      className={"nav-item" + (active ? " nav-item--active" : "") + (item.built ? "" : " nav-item--disabled")}
      disabled={!item.built}
      title={item.built ? undefined : "Coming soon"}
      onClick={() => onSelect(item.id)}
    >
      <span className="nav-item__icon">
        <NavIcon id={item.id} />
      </span>
      <span className="nav-item__label">{item.label}</span>
    </button>
  );
}

export function Sidebar({ activeId, onSelect }: SidebarProps) {
  return (
    <nav className="sidebar">
      <NavButton item={HOME_ITEM} active={activeId === HOME_ITEM.id} onSelect={onSelect} />
      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <span className="nav-group__divider" aria-hidden="true" />
          <span className="nav-group__label">{group.label}</span>
          {group.items.map((item) => (
            <NavButton key={item.id} item={item} active={activeId === item.id} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </nav>
  );
}
