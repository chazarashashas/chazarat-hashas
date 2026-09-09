import { useState } from "react";
import { NavIcon } from "../Icon/NavIcon";
import {
  HUE,
  ALL_NAV_ITEMS,
  NAV_GROUPS,
  ADMIN_ITEM,
  REBBE_ITEM,
  LOGIN_ITEM,
  GUIDE_ITEM,
  type NavItemDef,
} from "../../utils/navItems";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./BottomBar.css";

function itemFor(id: string): NavItemDef | undefined {
  return ALL_NAV_ITEMS.find((i) => i.id === id);
}

interface MoreSheetProps {
  activeId: string;
  barIds: string[];
  isAdmin?: boolean;
  isRebbe?: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function MoreSheet({ activeId, barIds, isAdmin, isRebbe, onSelect, onClose }: MoreSheetProps) {
  useEscapeKey(onClose);
  const barSet = new Set(barIds);
  const groups = NAV_GROUPS.map((g) => ({ label: g.label, items: g.items.filter((i) => !barSet.has(i.id)) })).filter(
    (g) => g.items.length > 0,
  );
  const accountItems: NavItemDef[] = [
    ...(isRebbe ? [REBBE_ITEM] : []),
    ...(isAdmin ? [ADMIN_ITEM] : []),
    GUIDE_ITEM,
    LOGIN_ITEM,
  ].filter((i) => !barSet.has(i.id));

  return (
    <div className="more-sheet-scrim" onClick={onClose}>
      <div className="more-sheet" role="dialog" aria-label="More" onClick={(e) => e.stopPropagation()}>
        <span className="more-sheet__handle" aria-hidden="true" />
        {groups.map((group) => (
          <div className="more-sheet__group" key={group.label}>
            <p className="more-sheet__group-label">{group.label}</p>
            <div className="more-sheet__grid">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={"more-sheet__item" + (activeId === item.id ? " more-sheet__item--active" : "")}
                  onClick={() => onSelect(item.id)}
                >
                  <span
                    className="more-sheet__tile"
                    style={activeId === item.id ? { background: HUE[item.id] ?? "var(--gold)" } : undefined}
                  >
                    <NavIcon id={item.id} size={19} />
                  </span>
                  <span className="more-sheet__label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {accountItems.length > 0 && (
          <div className="more-sheet__group">
            <div className="more-sheet__grid">
              {accountItems.map((item) => (
                <button
                  key={item.id}
                  className={"more-sheet__item" + (activeId === item.id ? " more-sheet__item--active" : "")}
                  onClick={() => onSelect(item.id)}
                >
                  <span
                    className="more-sheet__tile"
                    style={activeId === item.id ? { background: HUE[item.id] ?? "var(--gold)" } : undefined}
                  >
                    <NavIcon id={item.id} size={19} />
                  </span>
                  <span className="more-sheet__label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BottomBarProps {
  activeId: string;
  onSelect: (id: string) => void;
  barIds: string[];
  isAdmin?: boolean;
  isRebbe?: boolean;
}

/** The phone nav — four destinations the user chose (My Account → "Your
    bottom bar") plus More. Replaces the old 760px fallback that turned
    the full 16-item sidebar into a horizontal scroller with no affordance
    that most of it existed. See ANDROID-BRIEF.md §7. */
export function BottomBar({ activeId, onSelect, barIds, isAdmin, isRebbe }: BottomBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const barItems = barIds.map(itemFor).filter((i): i is NavItemDef => !!i);

  function handleSelect(id: string) {
    setMoreOpen(false);
    onSelect(id);
  }

  return (
    <>
      <nav className="bottom-bar">
        {barItems.map((item) => (
          <button
            key={item.id}
            className={"bottom-bar__item" + (activeId === item.id ? " bottom-bar__item--active" : "")}
            onClick={() => handleSelect(item.id)}
          >
            <span
              className="bottom-bar__tile"
              style={activeId === item.id ? { background: HUE[item.id] ?? "var(--gold)" } : undefined}
            >
              <NavIcon id={item.id} size={20} />
            </span>
            <span className="bottom-bar__label">{item.label}</span>
          </button>
        ))}
        <button
          className={"bottom-bar__item" + (moreOpen ? " bottom-bar__item--active" : "")}
          aria-haspopup="true"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <span className="bottom-bar__tile" style={moreOpen ? { background: "var(--gold)" } : undefined}>
            <NavIcon id="more" size={20} />
          </span>
          <span className="bottom-bar__label">More</span>
        </button>
      </nav>

      {moreOpen && (
        <MoreSheet
          activeId={activeId}
          barIds={barIds}
          isAdmin={isAdmin}
          isRebbe={isRebbe}
          onSelect={handleSelect}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </>
  );
}
