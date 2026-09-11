import { describe, expect, it } from "vitest";
import vercel from "../../vercel.json";
import { PATH_LINKS, sectionForPath } from "./pathLinks";
import { NAV_GROUPS } from "./navItems";

describe("page links", () => {
  it("gives every page in the menu a link, apart from Home (the site root)", () => {
    const linked = new Set(Object.values(PATH_LINKS));
    const pages = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)).filter((id) => id !== "home");
    expect(pages.filter((id) => !linked.has(id))).toEqual([]);
  });

  it("never links the admin panel", () => {
    expect(Object.values(PATH_LINKS)).not.toContain("admin");
    expect(sectionForPath("/admin")).toBeNull();
  });

  it("has a Vercel rewrite for every link, with and without a trailing slash", () => {
    const rewritten = new Set(vercel.rewrites.filter((r) => r.destination === "/index.html").map((r) => r.source));
    for (const path of Object.keys(PATH_LINKS)) {
      expect(rewritten.has(path), path).toBe(true);
      expect(rewritten.has(path + "/"), path + "/").toBe(true);
    }
  });

  it("reads a path regardless of case or a trailing slash", () => {
    expect(sectionForPath("/Daily-Limmud/")).toBe("limmud");
    expect(sectionForPath("/")).toBeNull();
  });
});
