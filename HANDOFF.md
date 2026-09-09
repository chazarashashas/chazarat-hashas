# Chazarat Hashas — Status Handoff

Written 2026-09-04 as a session-handoff note, back when this was a 3-screen game with
no backend. **Badly out of date** — there's now a full Supabase backend (auth, cloud
sync, Row Level Security), a test suite, and roughly triple the screens described
below. For an accurate snapshot, read `LEARNING-AUDIT.md` (2026-09-09) instead; this
file is kept for the "conventions that came out of real back-and-forth" section below,
which is still true, not for the "what's built" section, which isn't.

If you're a fresh Claude session picking this up: read `LEARNING-AUDIT.md` first, then
look at the actual code — it's the source of truth either way.

## Run it

```bash
cd "C:\Users\yonah\OneDrive\Documents\chazarat-hashas"
npm run dev
```

Opens at `http://localhost:5173`. Node.js is already installed on this machine (via
winget). `npm install` only needed if `node_modules` is missing.

Verify with `npx tsc -b --noEmit`, `npx eslint .`, `npm run build` — all three should be
clean; keep them that way after every change.

## What's built (3 of 6 sidebar sections)

1. **Sidrei Hamishna** — drag-and-drop ordering game. Bottom tab bar: Shas (order all 6
   sedarim) or one seder (order its masechtot). Fixed 656px card height, no scrolling —
   proven to fit the longest list (Moed/Taharot, 12 items).
2. **Mishna Quiz** — real Hebrew mishnah text fetched live from Sefaria's API (Torat
   Emet edition, vocalized). Scope via bottom tab bar (Shas → seder-picker dropdown, or
   a seder tab → masechet-picker dropdown). Streak mode (endless, bonus/penalty time on
   right/wrong guesses) or Quiz mode (fixed 15 questions, score + letter grade at the
   end). Pause blurs the text and freezes the timer. Wrong guess: streak mode deducts
   time and lets you retry; quiz mode ends the card immediately, no retries.
3. **My Mishna** — a notebook. Shas tab → side-tabs are the 6 sedarim, notebook rows are
   one free-text sentence per masechet ("describe it in your own words"). A seder tab →
   side-tabs are that seder's masechtot, notebook rows are one nickname per perek,
   labeled with Hebrew numerals (א, ב, ג…). Fixed-size notebook box, sized for the
   second-longest case (Shabbat, 24 perakim) — Keilim (30 perakim) is the one
   explicitly-approved exception that scrolls internally.

**Not built yet:** Seder Sort, Recall, Shas Dash Shas Dash. Sidebar shows them faded/
disabled. Build order was left to the user to pick, one at a time.

## Conventions that came out of real back-and-forth — don't relitigate these

- **No box ever resizes based on its content.** Pick a fixed size for the
  longest/second-longest realistic case; a named, approved exception (e.g. Keilim) can
  scroll internally, but nothing silently scrolls or resizes without that being an
  explicit, discussed exception. This came up repeatedly — take it as a hard rule for
  any new screen.
- **Plain CSS only**, no Tailwind/component library. Shared chrome (`.panel`,
  `.restart-icon`, `.app-title`, `.panel__title`, `.pill`, `.note-banner`, `.scrim`/
  `.popup`) lives in `src/styles/panel.css`, imported globally — reuse it rather than
  redefining per screen.
- Palette/fonts are fixed tokens in `src/styles/theme.css` (`--bg`, `--surface`,
  `--ink`, `--brand`, `--gold`, `--bad`, `--good`; Space Grotesk headings, Manrope body,
  Frank Ruhl Libre for Hebrew).
- `src/data/shas.ts` is the single source of truth for all seder/masechet/perek data —
  never duplicate it. `src/data/sederTabs.ts` and `src/data/matchViews.ts` derive from
  it.
- The bottom seder tab bar (`TabBar` component) is shared across screens — generic
  `{id, label}[]` props, not coupled to any one screen's data shape.
- No backend, no persistence yet — everything is local component state. Deliberate;
  don't add storage prematurely, but don't make choices that would block adding it
  later either.

## Sefaria integration (Mishna Quiz) — what's verified vs. not

- `src/data/sefariaRefs.ts` maps our masechet names to Sefaria's ref strings. **Every
  one of the 63 entries was individually tested against a live API call** — this
  matters because several differ from our spelling (Bechorot→Bekhorot, Arachin→Arakhin,
  Machshirin→Makhshirin, Uktzin→Oktzin, Avot→"Pirkei Avot" with no "Mishnah" prefix,
  Keilim→Kelim, Taharot→Tahorot, Taanit→"Ta'anit" with an apostrophe).
- Verification was done at chapter 1 of each tractate only. Very likely holds for every
  chapter (Sefaria's ref system is uniform per tractate), but not individually
  re-checked beyond that — first place to look if a specific perek 404s.
- `src/utils/sefaria.ts` fetches a whole perek and picks one random mishnah from the
  returned array client-side, rather than needing separate mishnah-per-perek count
  data. CORS is confirmed open (`access-control-allow-origin: *`).
- Displays Hebrew only (the Torat Emet vocalized text, Sefaria's own default `he`
  field) — no English translation, by explicit request.

## Known follow-up work (not urgent, flagged for whenever Recall gets built)

- Recall (not built) will need a complete, reviewed spelling-variants list for all 63
  masechtot + 6 sedarim (transliteration variants for the typing-recall mechanic). The
  original mockup's list only covered a handful as an illustration — treat that as a
  placeholder, not a starting point to trust.

## Naming, for consistency

Sidebar/panel titles, exact casing: **Sidrei Hamishna**, **Mishna Quiz**, **My Mishna**
(no "The", no "Notes" suffix — both were tried and reverted).
