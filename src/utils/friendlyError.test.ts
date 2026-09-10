import { describe, it, expect, vi, afterEach } from "vitest";
import { friendlyError, FRIENDLY_ERRORS } from "./friendlyError";

vi.mock("./monitoring", () => ({ reportHandledError: vi.fn() }));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

afterEach(() => setOnline(true));

describe("friendlyError", () => {
  it("says you're offline when the browser knows it is", () => {
    setOnline(false);
    expect(friendlyError(new Error("anything at all"))).toBe(FRIENDLY_ERRORS.offline);
  });

  it("still says offline when a fetch failed but navigator claims online", () => {
    expect(friendlyError(new Error("Failed to fetch"))).toBe(FRIENDLY_ERRORS.offline);
  });

  it("says couldn't load for a load failure", () => {
    expect(friendlyError(new Error("Request timeout"))).toBe(FRIENDLY_ERRORS.load);
  });

  it("falls back to the generic sentence", () => {
    expect(friendlyError(new Error("column users.foo does not exist"))).toBe(
      FRIENDLY_ERRORS.generic,
    );
  });

  it("never returns the raw message, whatever is thrown", () => {
    const raw = "PGRST202: permission denied for relation profiles";
    for (const thrown of [new Error(raw), raw, { message: raw }, null, undefined]) {
      const shown = friendlyError(thrown);
      expect(shown).not.toContain("PGRST202");
      expect(Object.values(FRIENDLY_ERRORS)).toContain(shown);
    }
  });
});
