import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { SEDARIM } from "../../data/shas";
import { shuffle } from "../../utils/shuffle";
import { getSederHue } from "../../utils/sederHue";
import { useGameStats } from "../../utils/useGameStats";
import { GameHud } from "../GameHud/GameHud";
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

/** Below this much movement, a pointerdown→up is treated as a tap rather
    than a drag — so tap-to-select works as an alternative to dragging on
    touch devices where a precise drag can be awkward. */
const TAP_MOVE_THRESHOLD = 6;

export function SederSortScreen() {
  const { recordSortCompletion, recordSortProgress } = useGameStats();
  const [{ placed, pool }, setState] = useState(initState);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverBin, setHoverBin] = useState<string | null>(null);
  const [rejectBin, setRejectBin] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const placedCount = TOTAL - pool.length;
  const completed = placedCount === TOTAL;
  const bySederId = Object.fromEntries(ALL_MASECHTOT.map((m) => [m.name, m.sederId]));

  const recordedRef = useRef(false);
  useEffect(() => {
    if (completed && !recordedRef.current) {
      recordedRef.current = true;
      recordSortCompletion();
    }
    if (!completed) recordedRef.current = false;
  }, [completed, recordSortCompletion]);

  // Today's best placed-count, whether or not this attempt finishes —
  // an abandoned attempt still gives the rebbe dashboard a real figure.
  useEffect(() => {
    if (placedCount > 0) recordSortProgress(placedCount, TOTAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedCount]);

  function handleReset() {
    setState(initState());
    setDrag(null);
    setHoverBin(null);
    setRejectBin(null);
    setSelectedName(null);
  }

  function attemptSort(name: string, sederId: string, targetBin: string) {
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

  function handleBinTap(sederId: string) {
    if (!selectedName) return;
    attemptSort(selectedName, bySederId[selectedName], sederId);
    setSelectedName(null);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>, name: string) {
    // Some environments (and rare real-world edge cases) can fail to
    // register the pointer as active before this fires; don't let that
    // abort the rest of the gesture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — the gesture still works without capture
    }
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
    try {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    } catch {
      // no-op — see handlePointerDown
    }
    const wasTap =
      drag && Math.abs(drag.x - drag.startX) < TAP_MOVE_THRESHOLD && Math.abs(drag.y - drag.startY) < TAP_MOVE_THRESHOLD;
    setDrag(null);

    const targetBin = hoverBin;
    setHoverBin(null);

    if (wasTap) {
      setSelectedName((prev) => (prev === name ? null : name));
      return;
    }

    if (!targetBin) return;
    attemptSort(name, sederId, targetBin);
  }

  return (
    <div className="stage">
      <div className="panel">
        <button className="restart-icon" title="Restart" onClick={handleReset}>
          ↺
        </button>
        <h1 className="panel__title">Seder Sort</h1>

        <GameHud doing="Seder Sort" progress={placedCount / TOTAL} worth={`${placedCount} / ${TOTAL}`} />

        <div className="sort-bins">
          {SEDARIM.map((seder) => (
            <div
              key={seder.id}
              data-bin-id={seder.id}
              className={
                "sort-bin" +
                (drag && hoverBin === seder.id ? " sort-bin--hover" : "") +
                (!drag && selectedName ? " sort-bin--selectable" : "") +
                (rejectBin === seder.id ? " sort-bin--reject" : "")
              }
              style={{ ["--bin-hue" as string]: getSederHue(seder.id) }}
              onClick={() => handleBinTap(seder.id)}
            >
              <div className="sort-bin__head">
                <span className="sort-bin__title">{seder.en}</span>
                <span className="sort-bin__tally">
                  {placed[seder.id].length}/{seder.masechtot.length}
                </span>
              </div>
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
                className={
                  "sort-chip" +
                  (isDragging ? " sort-chip--dragging" : "") +
                  (selectedName === name ? " sort-chip--selected" : "")
                }
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
        <div className="modal-scrim">
          <div className="modal modal--sm game__end">
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
