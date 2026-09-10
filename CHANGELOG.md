# Changelog

One entry per PR, newest first.

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
