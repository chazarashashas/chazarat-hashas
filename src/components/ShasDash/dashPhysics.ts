/* The maths behind Shas Dash, kept apart from the component so the parts
   that are correctness issues rather than feel — frame-rate independence
   above all — can be tested directly. */

// The crossing eases from 9.0s toward 3.6s at 0.945^score.
export const START_MS = 9000;
export const FLOOR_MS = 3600;
const DECAY = 0.945;

export function crossingMs(score: number): number {
  return FLOOR_MS + (START_MS - FLOOR_MS) * Math.pow(DECAY, score);
}

/** Where a crossing sits on the 9.0s → 3.6s ramp, as 0–5 pips. */
export function speedPips(ms: number): number {
  return Math.round(((START_MS - ms) / (START_MS - FLOOR_MS)) * 5);
}

// A lane change closes 30% of the remaining distance per 60Hz frame, which
// settles in about 130ms.
const EASE_PER_FRAME = 0.3;
const FRAME_60HZ_MS = 16.67;
export const MAX_DT_MS = 64;

/**
 * One frame of lane easing, independent of refresh rate. The plain
 * `y += (target - y) * 0.3` form moves twice as fast on a 120Hz panel —
 * every current Galaxy S and most A models — because it runs twice as
 * often. Scaling the exponent by the frame's share of a 60Hz frame makes
 * two 8ms frames land exactly where one 16.7ms frame would.
 */
export function easeToward(y: number, target: number, dtMs: number): number {
  const k = Math.min(Math.max(dtMs, 0), MAX_DT_MS) / FRAME_60HZ_MS;
  return y + (target - y) * (1 - Math.pow(1 - EASE_PER_FRAME, k));
}

/** The gate box whose band contains the card's centre — which is the
    answer. There is no separate catch line. */
export function laneAt(centreY: number, laneH: number, lanes: number): number {
  return Math.max(0, Math.min(lanes - 1, Math.floor(centreY / laneH)));
}

export const MAX_BONUS_S = 8;

/** Locking in early earns the whole seconds still left, up to 8. Measured
    from wall-clock time at arrival minus paused time, never from summed
    frame deltas — those drift from real time whenever frames drop. */
export function lockBonus(crossing: number, elapsedMs: number): number {
  return Math.min(MAX_BONUS_S, Math.max(0, Math.floor((crossing - elapsedMs) / 1000)));
}
