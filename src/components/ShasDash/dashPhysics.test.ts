import { describe, it, expect } from "vitest";
import { crossingMs, speedPips, easeToward, laneAt, lockBonus, START_MS, FLOOR_MS } from "./dashPhysics";

/** Runs the easing at a given refresh rate for exactly `spanMs` of wall
    clock — the last frame is the remainder, so every rate covers the same
    time rather than rounding to whole frames. */
function easeFor(hz: number, spanMs: number, from = 0, to = 100): number {
  const frame = 1000 / hz;
  let y = from;
  let elapsed = 0;
  while (elapsed < spanMs - 1e-9) {
    const dt = Math.min(frame, spanMs - elapsed);
    y = easeToward(y, to, dt);
    elapsed += dt;
  }
  return y;
}

describe("lane easing", () => {
  it("covers the same distance at 60Hz, 90Hz, 120Hz and 144Hz", () => {
    // The whole point of the frame-rate-independent form: a Galaxy running
    // at 120Hz must not steer twice as fast as a 60Hz laptop.
    const at60 = easeFor(60, 100);
    for (const hz of [90, 120, 144]) {
      expect(Math.abs(easeFor(hz, 100) - at60)).toBeLessThan(1);
    }
  });

  it("the naive per-frame form would not have — the test would catch it", () => {
    const naive = (hz: number) => {
      let y = 0;
      for (let t = 0; t < 100; t += 1000 / hz) y += (100 - y) * 0.3;
      return y;
    };
    expect(naive(120) - naive(60)).toBeGreaterThan(5);
  });

  it("settles in about 130ms", () => {
    // ~94% of the way at 130ms: under 3px short on a 46px lane change,
    // which reads as arrived. Well short of it at 50ms, so it visibly eases.
    expect(easeFor(60, 130)).toBeGreaterThan(93);
    expect(easeFor(60, 50)).toBeLessThan(80);
  });

  it("clamps a huge frame gap instead of leaping", () => {
    // A dropped second of frames must not teleport the card either.
    expect(easeToward(0, 100, 1000)).toBeCloseTo(easeToward(0, 100, 64), 6);
  });
});

describe("the catch is the gate box", () => {
  it("answers with whichever box the card's centre is inside", () => {
    expect(laneAt(23, 46, 6)).toBe(0);
    expect(laneAt(45.9, 46, 6)).toBe(0);
    expect(laneAt(46, 46, 6)).toBe(1);
    expect(laneAt(275, 46, 6)).toBe(5);
  });

  it("a card caught mid-ease lands where it is, not where it was heading", () => {
    // Heading for lane 3 (centre 161) from lane 2 (centre 115): after one
    // 60Hz frame it is still inside lane 2's box.
    const y = easeToward(115, 161, 16.67);
    expect(laneAt(y, 46, 6)).toBe(2);
  });

  it("never answers outside the six boxes", () => {
    expect(laneAt(-10, 46, 6)).toBe(0);
    expect(laneAt(999, 46, 6)).toBe(5);
  });
});

describe("lock-in bonus", () => {
  it("is the whole seconds still left", () => {
    expect(lockBonus(9000, 3500)).toBe(5);
    expect(lockBonus(9000, 8999)).toBe(0);
  });

  it("is capped at 8", () => {
    expect(lockBonus(9000, 0)).toBe(8);
  });

  it("is never negative", () => {
    expect(lockBonus(3600, 5000)).toBe(0);
  });
});

describe("crossing time", () => {
  it("starts at 9.0s and eases toward 3.6s", () => {
    expect(crossingMs(0)).toBe(START_MS);
    expect(crossingMs(10)).toBeLessThan(START_MS);
    expect(crossingMs(10)).toBeGreaterThan(FLOOR_MS);
    expect(crossingMs(500)).toBeCloseTo(FLOOR_MS, 0);
  });

  it("maps onto five pips", () => {
    expect(speedPips(START_MS)).toBe(0);
    expect(speedPips(FLOOR_MS)).toBe(5);
  });
});
