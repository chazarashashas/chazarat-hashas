import "./TabBar.css";

export interface TabBarItem {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: TabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function TabBar({ tabs, activeId, onSelect }: TabBarProps) {
  return (
    <nav className="tab-bar">
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
