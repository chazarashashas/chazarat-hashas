// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useToday } from "./useToday";

afterEach(() => vi.useRealTimers());

describe("useToday", () => {
  it("rolls over at local midnight with the app left open — erev ends on time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 11, 23, 59, 0));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-09-11");
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(result.current).toBe("2026-09-12");
  });
});
