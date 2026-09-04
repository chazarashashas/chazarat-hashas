import { useState } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MATCH_VIEWS } from "./data/matchViews";
import { MatchBoard } from "./components/MatchBoard/MatchBoard";
import { TabBar } from "./components/TabBar/TabBar";
import { MishnaIdScreen } from "./components/MishnaId/MishnaIdScreen";
import { PerekNamesScreen } from "./components/PerekNames/PerekNamesScreen";
import { HomeScreen } from "./components/Home/HomeScreen";
import { SederSortScreen } from "./components/SederSort/SederSortScreen";
import { ShasDashScreen } from "./components/ShasDash/ShasDashScreen";
import { RecallScreen } from "./components/Recall/RecallScreen";
import { ResourcesScreen } from "./components/Resources/ResourcesScreen";
import { shuffle } from "./utils/shuffle";
import type { ViewState } from "./types/viewState";
import "./App.css";

function initViewState(items: string[]): ViewState {
  return { placed: new Array(items.length).fill(null), pool: shuffle(items) };
}

function SedarimSection() {
  const [activeId, setActiveId] = useState(MATCH_VIEWS[0].id);
  const [viewStates, setViewStates] = useState<Record<string, ViewState>>(() =>
    Object.fromEntries(MATCH_VIEWS.map((v) => [v.id, initViewState(v.items)])),
  );

  const activeView = MATCH_VIEWS.find((v) => v.id === activeId)!;
  const activeState = viewStates[activeId];

  function handlePlace(itemId: string, slotIndex: number) {
    setViewStates((prev) => {
      const s = prev[activeId];
      const placed = [...s.placed];
      placed[slotIndex] = itemId;
      const pool = s.pool.filter((id) => id !== itemId);
      return { ...prev, [activeId]: { placed, pool } };
    });
  }

  function handleReset() {
    setViewStates((prev) => ({ ...prev, [activeId]: initViewState(activeView.items) }));
  }

  return (
    <>
      <MatchBoard view={activeView} state={activeState} onPlace={handlePlace} onReset={handleReset} />
      <TabBar
        tabs={MATCH_VIEWS.map((v) => ({ id: v.id, label: v.label }))}
        activeId={activeId}
        onSelect={setActiveId}
        wrap
      />
    </>
  );
}

function App() {
  const [section, setSection] = useState("home");

  return (
    <div className="app">
      <Sidebar activeId={section} onSelect={setSection} />
      <main className="main">
        <div className={"main__content" + (section === "dash" ? " main__content--wide" : "")}>
          {section === "home" ? (
            <HomeScreen onNavigate={setSection} />
          ) : section === "sedarim" ? (
            <SedarimSection />
          ) : section === "mishna" ? (
            <MishnaIdScreen />
          ) : section === "perek" ? (
            <PerekNamesScreen />
          ) : section === "sort" ? (
            <SederSortScreen />
          ) : section === "dash" ? (
            <ShasDashScreen />
          ) : section === "resources" ? (
            <ResourcesScreen />
          ) : (
            <RecallScreen />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
