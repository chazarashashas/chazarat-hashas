import "./GameHud.css";

interface GameHudProps {
  /** Slot 1 — what you're doing right now (mode, scope, current board). */
  doing: string;
  /** Slot 2 — always a track: how far through this session/round, 0–1. */
  progress: number;
  /** Slot 3 — whatever this game counts: score, timer, lives, grade. */
  worth: string;
  /** Flags slot 3 red instead of gold — a countdown running low, a life lost. */
  urgent?: boolean;
}

/** Shared status bar for the five drills (Mishna Quiz, Shas Dash, Sidrei
    Hamishna, Seder Sort, Mishna Chazara) — each used to invent its own
    status display. One HUD, three slots, per BUILD-BRIEF.md's drills
    section: what you're doing · how far · what it's worth. */
export function GameHud({ doing, progress, worth, urgent }: GameHudProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="game-hud">
      <span className="game-hud__doing">{doing}</span>
      <span className="game-hud__track">
        <span className="game-hud__track-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className={"game-hud__worth" + (urgent ? " game-hud__worth--urgent" : "")}>{worth}</span>
    </div>
  );
}
