# Changelog

One entry per PR, newest first.

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
