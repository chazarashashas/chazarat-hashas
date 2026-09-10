# Changelog

One entry per PR, newest first.

## Consistency pass PR 7 — My Siyumim

- All 24 literals to tokens; `LogLearningModal` stops killing its focus
  outline.
- Title in a `.screen-head`; the countdown is a `.hero-card`; stat tiles
  and the L'Iluy Nishmat link are `.card`; pace tabs and pills are
  `.pill--compact`; the three actions use the button vocabulary.
- "Siyumim ahead" and "Where each level stands" are both `.section-title`;
  `.siyumim-next-label` is gone.
- Perek rows and the log modal's options use Hebrew numerals.
- `LogLearningModal` is a `.modal.modal--sm` with `.field` rows and the
  shared close button. Copy: "a chavrusa, your own Mishnayos" → "a
  chevrusa, your own Mishnayot".

## Consistency pass PR 6 — Mishna Notes

- Literals and sizes to tokens; the three `outline: none` rules are gone,
  so the global keyboard ring works in every field on this screen.
- Title is "Mishna Notes" in a `.screen-head`, not "Notes."; the subtitle
  becomes `__sub` and the print link plus view toggle move into `__aside`.
- View toggle, seder pills and masechet chips are all `.pill`; the notes
  page and concept cards are `.card`; the concepts band is a `.callout`;
  text links are `.btn--quiet`.
- The two 599px blocks are one, and the traditional name now shrinks on a
  phone rather than disappearing — it is content, not decoration.
- Copy: "Read the mishnayos →" → "Read the Mishnayot →"; "Concepts to
  Review" → "Concepts to review".

## Consistency pass PR 5 — Explore Shas

- Literals and sizes to tokens; the per-screen focus ring becomes the
  shared gold keyboard ring.
- Grids move from `auto-fill` to fixed counts — 6 columns for masechtot
  and perakim, 10 for mishnayot, 2/2/6 on a phone — so a tile is exactly
  the same width in every seder. Masechet tiles still span by perek
  count, which is the deliberate signal, not an inconsistency.
- Hebrew reading text goes 15px → 17px, matching every other reading
  surface.
- Crumbs are `.pill--compact`, the note link is `.btn--quiet`, the text
  block is a `.card`.
- Loading/error use the shared states via `friendlyError`, and a search
  that matches nothing now says so instead of showing an empty box.

## Consistency pass PR 4 — Daily Limmud

- Every literal is a token; every font-size is on the scale.
- New `--fs-hebrew-read: 17px` token so rule 7 (Hebrew reading text at
  17px/2.0) and rule 4 (closed Latin scale) can both hold.
- Header is a `.screen-head` with the streak in `__aside`; the settings
  summary is a `.btn--secondary.btn--block`; the reader is a `.card`.
- `.limmud-stage`'s 640px cap is gone — the wide slot is the width.
- The mishna's Hebrew label goes from 12px `--gold` to 14px
  `--brass-text`, which actually holds contrast at that size.
- Loading and error use the shared states, and the error runs through
  `friendlyError` so Sefaria's raw text never renders.
- Copy: pace options are "1 Mishna a day / 2 Mishnayot a day / 1 Perek a
  day"; "L'iluy nishmat:" → "L'Iluy Nishmat:".

## Consistency pass PR 3 — Home

- Every literal in Home, `ProgressHeaderBar`, `ProgressTracks`,
  `NudgeStrip` and `TodayLearningCard` is now a token, and every
  font-size is on the scale.
- All twelve Home cards are cream. Daily Limmud's navy treatment made it
  read as a different kind of thing from its neighbours; its hue rule is
  enough.
- `NudgeStrip` is a `.callout`; `ProgressTracks`' standalone block is a
  `.hero-card`; `.home-section-title` becomes the shared `.section-title`;
  the unused `.home-hero__btn` and the ruleless `.home-panel` are gone.
- "Sent" on `TodayLearningCard` uses `--good` rather than Seder Zeraim's
  green, and the card sits on `--surface-hi` like every other card.
- Copy: "let's learn shas, together" → "Let's learn Shas, together";
  "Go to My Limmud" → "Go to Daily Limmud".

## Consistency pass PR 2 — the shell

- Sidebar and bottom bar drop their white/cream literals for the on-navy
  tokens; both label sizes go from 9.5px to 12px, and the sidebar tightens
  to the brief's item padding and group-label margins.
- `TabBar` renders `.pill.pill--compact` — `.tab-bar__tab` is gone and
  TabBar.css is layout only.
- The More sheet uses the shared `.modal-scrim`, keeping only its
  bottom-anchored layout, and its grid is fixed at four columns. Its own
  rise keyframe is deleted in favour of `panel-pop`.
- The More tile is now active whenever the open screen is not on the bar.
- `navItems.ts` gains the third group, More: L'Iluy Nishmat, Resources,
  Guide, My Account. Guide and My Account stop being rendered separately
  at the foot of the rail.
- Known gap: the brief's sidebar metrics do not fit 17 items in 800px
  (~1119px with the icon-above-label item), so the rail still scrolls.

## Consistency pass PR 1 — tokens and the shared layer

- `theme.css` gains the tokens the pass is built from: the five on-navy
  values, `--gold-bright`, `--tint`, `--good-bg`, `--bad-hover`,
  `--bad-soft`, three navy shadows, `--scrim`, the closed type scale
  (`--fs-12` … `--fs-36`) and `--stage-width-wide`.
- Two token values change, both deliberate: `--good` is its own green
  (`#3d7c5c`) instead of Seder Zeraim's, and `--stage-width` goes 480px →
  520px. These are the only visible changes in this PR.
- `panel.css` becomes `components.css` and now owns the whole shared
  layer: buttons, pills, the screen header, cards, callouts, fields,
  modals, the three states, the game frame and every keyframe. The old
  vocabulary stays at the bottom as clearly-marked migration aliases,
  deleted screen by screen as the later PRs land.
- The 14 duplicate `.stage` blocks are gone; `.stage` is defined once.
- Printing moves to one rule in `global.css` — app chrome and the screen
  behind the overlay never reach paper.
- New `friendlyError(err, context)` maps any thrown value to one of three
  sentences and sends the real message to monitoring, so raw errors never
  render. Five unit tests cover it.
- `scripts/check-colors.sh` and `scripts/check-type.sh` run in CI. They
  report today (310 colour literals, 343 off-scale sizes) and flip to
  blocking in the last PR of the pass.

## Guide: finish GUIDE-BRIEF.md

- The Guide's Print button now goes through Mishna Notes' print path — the
  same `.print-overlay` shell, `.no-print` controls and `window.print()` —
  instead of the separate `@media print` block it had, which the brief
  called out as "a new one". The printed copy drops the per-step navigation,
  the Print button and the "find this again" note.
- The closing line "Stay consistent, and keep on learning!" now sits above
  the 2px rule that ends the document, as the brief specifies. It was below
  it.
- The six seder pills are a real `role="list"` with `role="listitem"` on
  each pill and `lang="he"` on the Hebrew, so they have accessible names —
  the `aria-label` on the bare container was being ignored.
