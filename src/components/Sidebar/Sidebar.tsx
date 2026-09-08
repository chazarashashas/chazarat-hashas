import { NavIcon } from "../Icon/NavIcon";
import { BrandMark } from "../BrandMark";
import "./Sidebar.css";

interface NavItem {
  id: string;
  label: string;
  built: boolean;
}

/** Each item's own section hue for its active fill — matches the design
    reference's SECTION map exactly, including the shared terracotta
    between Chevrusa and L'Iluy Nishmat (both group-commitment features). */
const HUE: Record<string, string> = {
  home: "var(--hue-home)",
  limmud: "var(--hue-limmud)",
  review: "var(--hue-review)",
  map: "var(--hue-explore)",
  perek: "var(--hue-notes)",
  progress: "var(--hue-siyumim)",
  liluy: "var(--hue-chevrusa)",
  chevrusa: "var(--hue-chevrusa)",
  chabura: "var(--hue-chevrusa)",
  login: "var(--hue-login)",
  sedarim: "var(--hue-sedarim)",
  mishna: "var(--hue-quiz)",
  sort: "var(--hue-sort)",
  recall: "var(--hue-chazara)",
  dash: "var(--hue-dash)",
  resources: "var(--hue-resources)",
  admin: "var(--hue-login)",
  rebbe: "var(--hue-login)",
};

/** Mirrors Home's own "My Mishna" / "Learning Tools" split, with Home
    itself as the group's first item (matches the design reference — a
    student who's already parsed Home's two sections shouldn't have to
    learn a second, different grouping here). */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "My Mishna",
    items: [
      { id: "home", label: "Home", built: true },
      { id: "limmud", label: "Daily Limmud", built: true },
      { id: "map", label: "Explore Shas", built: true },
      { id: "perek", label: "Mishna Notes", built: true },
      { id: "progress", label: "My Siyumim", built: true },
      { id: "chevrusa", label: "Chevrusa", built: true },
      { id: "chabura", label: "Chabura", built: true },
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
      { id: "liluy", label: "L'Iluy Nishmat", built: true },
      { id: "resources", label: "Resources", built: true },
    ],
  },
];

/** Login sits alone at the very bottom of the rail, separate from both
    groups — account access is conventionally placed apart from feature
    navigation, not buried mid-list (user feedback). */
const LOGIN_ITEM: NavItem = { id: "login", label: "My Account", built: true };
const ADMIN_ITEM: NavItem = { id: "admin", label: "Admin", built: true };
const REBBE_ITEM: NavItem = { id: "rebbe", label: "Dashboard", built: true };

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  isAdmin?: boolean;
  /** Holds the "teacher" role in at least one class chabura — students
      never see this entry (REBBE-DASHBOARD-BRIEF.md §5). */
  isRebbe?: boolean;
}

function NavButton({ item, active, onSelect }: { item: NavItem; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      className={"nav-item" + (active ? " nav-item--active" : "") + (item.built ? "" : " nav-item--disabled")}
      style={active ? { background: HUE[item.id] ?? "var(--gold)" } : undefined}
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
      <div className="nav-group nav-group--login">
        <NavButton item={LOGIN_ITEM} active={activeId === LOGIN_ITEM.id} onSelect={onSelect} />
      </div>
    </nav>
  );
}
