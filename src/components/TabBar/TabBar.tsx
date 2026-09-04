import "./TabBar.css";

export interface TabBarItem {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: TabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Wrap onto multiple lines and size tabs to their label instead of
      shrinking everything to fit one line — for tab sets with more items
      or longer labels than the usual single-word set. */
  wrap?: boolean;
}

export function TabBar({ tabs, activeId, onSelect, wrap }: TabBarProps) {
  return (
    <nav className={"tab-bar" + (wrap ? " tab-bar--wrap" : "")}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={"tab-bar__tab" + (tab.id === activeId ? " tab-bar__tab--active" : "")}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
