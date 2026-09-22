import { describe, expect, it } from "vitest";
import { en } from "./locales/en";
import { he } from "./locales/he";
import { HEBREW_ENABLED, deviceLanguage, directionOf } from "./index";

/** "ns:a.b.c" → string, for every leaf. */
function flatten(tree: Record<string, unknown>, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") for (const [kk, vv] of flatten(v as Record<string, unknown>, key)) out.set(kk, vv);
    else out.set(key, String(v));
  }
  return out;
}

const enKeys = flatten(en as unknown as Record<string, unknown>);
const heKeys = flatten(he);
const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)[^}]*\}\}/g)].map((m) => m[1]).sort();

describe("the Hebrew strings", () => {
  it("has no key English doesn't — a typo would never be shown", () => {
    expect([...heKeys.keys()].filter((k) => !enKeys.has(k))).toEqual([]);
  });

  it("keeps every {{blank}} its English has", () => {
    const mismatched = [...heKeys].filter(([k, v]) => enKeys.has(k) && placeholders(v).join() !== placeholders(enKeys.get(k)!).join());
    expect(mismatched.map(([k]) => k)).toEqual([]);
  });

  it("covers every English string before the Hebrew interface is switched on", () => {
    const missing = [...enKeys.keys()].filter((k) => !heKeys.has(k));
    if (HEBREW_ENABLED) expect(missing).toEqual([]);
    else expect(Array.isArray(missing)).toBe(true); // still being drafted
  });
});

describe("which language a visit starts in", () => {
  it("is Hebrew for a Hebrew phone, including the old 'iw' code", () => {
    expect(deviceLanguage(["he-IL", "en-US"])).toBe("he");
    expect(deviceLanguage(["iw"])).toBe("he");
  });

  it("is English otherwise", () => {
    expect(deviceLanguage(["en-GB"])).toBe("en");
    expect(deviceLanguage([])).toBe("en");
  });

  it("runs right-to-left only for Hebrew", () => {
    expect(directionOf("he")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});
