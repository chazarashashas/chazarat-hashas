import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { SEDARIM } from "../../data/shas";
import { shuffle } from "../../utils/shuffle";
import "./SederSortScreen.css";

interface FlatMasechet {
  sederId: string;
  name: string;
}

function flatList(): FlatMasechet[] {
  return SEDARIM.flatMap((seder) => seder.masechtot.map((m) => ({ sederId: seder.id, name: m.en })));
}

const ALL_MASECHTOT = flatList();
const TOTAL = ALL_MASECHTOT.length;

interface DragState {
  name: string;
  sederId: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  originLeft: number;
  originTop: number;
  width: number;
}

function initState() {
  return {
    placed: Object.fromEntries(SEDARIM.map((s) => [s.id, [] as string[]])) as Record<string, string[]>,
    pool: shuffle(ALL_MASECHTOT.map((m) => m.name)),
  };
}

export function SederSortScreen() {
  const [{ placed, pool }, setState] = useState(initState);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverBin, setHoverBin] = useState<string | null>(null);
  const [rejectBin, setRejectBin] = useState<string | null>(null);

  const placedCount = TOTAL - pool.length;
  const completed = placedCount === TOTAL;
  const bySederId = Object.fromEntries(ALL_MASECHTOT.map((m) => [m.name, m.sederId]));

  function handleReset() {
    setState(initState());
    setDrag(null);
    setHoverBin(null);
    setRejectBin(null);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>, name: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      name,
      sederId: bySederId[name],
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      width: rect.width,
    });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const draggedName = e.currentTarget?.dataset.chipName;
    const { clientX, clientY } = e;
    if (!draggedName) return;

    setDrag((prev) => (prev && prev.name === draggedName ? { ...prev, x: clientX, y: clientY } : prev));

    const el = document.elementFromPoint(clientX, clientY);
    const binEl = el?.closest<HTMLElement>("[data-bin-id]");
    setHoverBin(binEl ? (binEl.dataset.binId ?? null) : null);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>, name: string, sederId: string) {
    e.currentTarget?.releasePointerCapture(e.pointerId);
    setDrag(null);

    const targetBin = hoverBin;
    setHoverBin(null);
    if (!targetBin) return;

    if (targetBin !== sederId) {
      setRejectBin(targetBin);
      window.setTimeout(() => setRejectBin(null), 300);
      return;
    }

    setState((prev) => ({
      placed: { ...prev.placed, [sederId]: [...prev.placed[sederId], name] },
      pool: prev.pool.filter((n) => n !== name),
    }));
  }

  return (
    <div className="stage">
      <div className="panel sort-panel">
        <button className="restart-icon" title="Restart" onClick={handleReset}>
          ↺
        </button>
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Seder Sort</h1>
        <p className="panel__subtitle">
          Drag each masechet into the seder it belongs to — order doesn't matter here, just the family.
        </p>

        <p className="sort-count">
          {placedCount} / {TOTAL} placed
        </p>

        <div className="sort-bins">
          {SEDARIM.map((seder) => (
            <div
              key={seder.id}
              data-bin-id={seder.id}
              className={
                "sort-bin" +
                (drag && hoverBin === seder.id ? " sort-bin--hover" : "") +
                (rejectBin === seder.id ? " sort-bin--reject" : "")
              }
            >
              <div className="sort-bin__title">{seder.en}</div>
              <div className="sort-bin__items">
                {placed[seder.id].map((name) => (
                  <span key={name} className="sort-bin__tag">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sort-pool">
          {pool.map((name) => {
            const isDragging = drag?.name === name;
            return (
              <div
                key={name}
                data-chip-name={name}
                className={"sort-chip" + (isDragging ? " sort-chip--dragging" : "")}
                onPointerDown={(e) => handlePointerDown(e, name)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, name, bySederId[name])}
                onPointerCancel={(e) => handlePointerUp(e, name, bySederId[name])}
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {drag && (
        <div
          className="sort-chip-ghost"
          style={{
            left: drag.originLeft + (drag.x - drag.startX),
            top: drag.originTop + (drag.y - drag.startY),
            width: drag.width,
          }}
        >
          {drag.name}
        </div>
      )}

      {completed && (
        <div className="scrim">
          <div className="popup">
            <div className="popup__mark">✓</div>
            <div className="popup__text">All {TOTAL} masechtot sorted</div>
            <button className="popup__restart" onClick={handleReset}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
