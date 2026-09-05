import "./Sidebar.css";

interface NavItem {
  id: string;
  icon: string;
  label: string;
  built: boolean;
}

const HOME_ITEM: NavItem = { id: "home", icon: "⌂", label: "Home", built: true };

/** Mirrors Home's own "My Mishna" / "Learning Tools" split exactly — a
    student who's already parsed Home's two sections shouldn't have to
    learn a second, different grouping here. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "My Mishna",
    items: [
      { id: "limmud", icon: "◷", label: "Daily Limmud", built: true },
      { id: "map", icon: "⊞", label: "Map of Shas", built: true },
      { id: "perek", icon: "❖", label: "Mishna Notes", built: true },
      { id: "progress", icon: "◐", label: "Progress", built: true },
      { id: "chevrusa", icon: "⚯", label: "Chevrusa", built: true },
      { id: "login", icon: "⚿", label: "Log In", built: true },
    ],
  },
  {
    label: "Learning Tools",
    items: [
      { id: "sedarim", icon: "★", label: "Sidrei Hamishna", built: true },
      { id: "mishna", icon: "◆", label: "Mishna Quiz", built: true },
      { id: "sort", icon: "▧", label: "Seder Sort", built: true },
      { id: "recall", icon: "✎", label: "Mishna Chazara", built: true },
      { id: "dash", icon: "↯", label: "Shas Dash", built: true },
      { id: "resources", icon: "⎙", label: "Resources", built: true },
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
      <span className="nav-item__icon">{item.icon}</span>
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
