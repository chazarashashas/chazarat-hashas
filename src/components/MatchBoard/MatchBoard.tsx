import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MATCH_VIEWS } from "../../data/matchViews";
import type { MatchView } from "../../data/matchViews";
import type { ViewState } from "../../types/viewState";
import "./MatchBoard.css";

const SEDER_VIEWS = MATCH_VIEWS.slice(1);

interface MatchBoardProps {
  view: MatchView;
  state: ViewState;
  onPlace: (itemId: string, slotIndex: number) => void;
  onReset: () => void;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  originLeft: number;
  originTop: number;
  width: number;
}

/** Below this much movement, a pointerdown→up is treated as a tap rather
    than a drag — so tap-to-select works as an alternative to dragging on
    touch devices where a precise drag can be awkward. */
const TAP_MOVE_THRESHOLD = 6;

export function MatchBoard({ view, state, onPlace, onReset }: MatchBoardProps) {
  const { placed, pool } = state;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [rejectIndex, setRejectIndex] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const completed = placed.every((p) => p !== null);

  function attemptPlace(id: string, slotIndex: number) {
    if (placed[slotIndex] || view.items[slotIndex] !== id) {
      setRejectIndex(slotIndex);
      window.setTimeout(() => setRejectIndex(null), 300);
      return;
    }
    onPlace(id, slotIndex);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    // Some environments (and rare real-world edge cases) can fail to
    // register the pointer as active before this fires; don't let that
    // abort the rest of the gesture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — the gesture still works without capture, it just won't
      // keep tracking the pointer if it leaves this element's bounds.
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      id,
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
    const draggedId = e.currentTarget?.dataset.chipId;
    const { clientX, clientY } = e;
    if (!draggedId) return;

    setDrag((prev) => (prev && prev.id === draggedId ? { ...prev, x: clientX, y: clientY } : prev));

    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest<HTMLElement>("[data-slot-index]");
    setHoverIndex(slotEl ? Number(slotEl.dataset.slotIndex) : null);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    try {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    } catch {
      // no-op — see handlePointerDown
    }
    const wasTap =
      drag && Math.abs(drag.x - drag.startX) < TAP_MOVE_THRESHOLD && Math.abs(drag.y - drag.startY) < TAP_MOVE_THRESHOLD;
    setDrag(null);

    const slotIndex = hoverIndex;
    setHoverIndex(null);

    if (wasTap) {
      setSelectedId((prev) => (prev === id ? null : id));
      return;
    }

    if (slotIndex == null) return;
    attemptPlace(id, slotIndex);
  }

  function handleSlotTap(slotIndex: number) {
    if (!selectedId || placed[slotIndex]) return;
    attemptPlace(selectedId, slotIndex);
    setSelectedId(null);
  }

  return (
    <div className="stage">
      <div className="panel board-card">
        <button className="restart-icon" title="Restart" onClick={onReset}>
          ↺
        </button>
        <p className="app-title">Chazarat Hashas</p>
        <h2 className="panel__title">{view.title}</h2>
        <p className="panel__subtitle">
          Drag each {view.id === "sedarim" ? "seder" : "masechet"} into its correct spot — or tap one,
          then tap where it goes. You can alternate between sedarim using the navigation bar below.
        </p>

        <div className="board-progress">
          <span
            className={"board-progress__star" + (view.id === "sedarim" ? " board-progress__star--active" : "")}
          >
            ★
          </span>
          {SEDER_VIEWS.map((sv) => (
            <span
              key={sv.id}
              className={"board-progress__dot" + (view.id === sv.id ? " board-progress__dot--active" : "")}
            >
              ●
            </span>
          ))}
        </div>

        <div className="board-cols">
          <div className="board-col">
            <div className="board-col__stack">
              <div className="board-col__label">Order</div>
              {placed.map((filledId, i) => {
                const isFilled = filledId !== null;
                const className =
                  "slot" +
                  (isFilled ? " slot--filled" : "") +
                  (drag && !isFilled && hoverIndex === i ? " slot--dragover" : "") +
                  (!drag && selectedId && !isFilled ? " slot--selectable" : "") +
                  (rejectIndex === i ? " slot--reject" : "");
                return (
                  <div
                    key={i}
                    data-slot-index={i}
                    className={className}
                    onClick={() => handleSlotTap(i)}
                  >
                    <span className="slot__num">{i + 1}</span>
                    <span className="slot__label">{isFilled ? filledId : ""}</span>
                    {isFilled && <span className="slot__check">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="board-col">
            <div className="board-col__stack">
              <div className="board-col__label">{view.label}</div>
              {pool.map((id) => {
                const isDragging = drag?.id === id;
                return (
                  <div
                    key={id}
                    data-chip-id={id}
                    className={
                      "chip" + (isDragging ? " chip--dragging" : "") + (selectedId === id ? " chip--selected" : "")
                    }
                    onPointerDown={(e) => handlePointerDown(e, id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => handlePointerUp(e, id)}
                    onPointerCancel={(e) => handlePointerUp(e, id)}
                  >
                    {id}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {drag && (
        <div
          className="chip-ghost"
          style={{
            left: drag.originLeft + (drag.x - drag.startX),
            top: drag.originTop + (drag.y - drag.startY),
            width: drag.width,
          }}
        >
          {drag.id}
        </div>
      )}

      {completed && (
        <div className="scrim">
          <div className="popup">
            <div className="popup__mark">✓</div>
            <div className="popup__text">All {view.items.length} matched</div>
            <button className="popup__restart" onClick={onReset}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
