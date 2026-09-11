/** A short link for every page, so a page can be sent to someone and
    opens straight on it (chazarashashas.org/daily-limmud, /shasdash, …).
    Home is the site root. Admin deliberately has no link: it is reached
    only from inside the app, by an admin.

    Each path also needs a rewrite in vercel.json, or Vercel 404s it
    before the app ever loads — pathLinks.test.ts checks every path here
    has one. Read once at startup, like ?siyum=. */
export const PATH_LINKS: Record<string, string> = {
  "/daily-limmud": "limmud",
  "/explore-shas": "map",
  "/mishna-notes": "perek",
  "/my-siyumim": "progress",
  "/chevrusa": "chevrusa",
  "/chabura": "chabura",
  "/sidrei-hamishna": "sedarim",
  "/mishna-quiz": "mishna",
  "/seder-sort": "sort",
  "/mishna-chazara": "recall",
  "/shasdash": "dash",
  "/liluy-nishmat": "liluy",
  "/resources": "resources",
  "/guide": "guide",
  "/my-account": "login",
  "/rebbe": "rebbe",
};

export function sectionForPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "").toLowerCase();
  return PATH_LINKS[path] ?? null;
}
