import "./Sidebar.css";

interface NavItem {
  id: string;
  icon: string;
  label: string;
  built: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: "⌂", label: "Home", built: true },
  { id: "sedarim", icon: "★", label: "Sidrei Hamishna", built: true },
  { id: "mishna", icon: "◆", label: "Mishna Quiz", built: true },
  { id: "sort", icon: "▧", label: "Seder Sort", built: true },
  { id: "recall", icon: "✎", label: "Mishna Chazara", built: true },
  { id: "dash", icon: "↯", label: "Shas Dash", built: true },
  { id: "perek", icon: "❖", label: "My Mishna", built: true },
];

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ activeId, onSelect }: SidebarProps) {
  return (
    <nav className="sidebar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={
            "nav-item" +
            (item.id === activeId ? " nav-item--active" : "") +
            (item.built ? "" : " nav-item--disabled")
          }
          disabled={!item.built}
          title={item.built ? undefined : "Coming soon"}
          onClick={() => onSelect(item.id)}
        >
          <span className="nav-item__icon">{item.icon}</span>
          <span className="nav-item__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
