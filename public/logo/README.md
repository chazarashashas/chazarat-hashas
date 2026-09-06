# חזרת הש״ס — logo

Six tiles for the six sedarim on two even rows, over a base that runs flat and lifts about half
a gap at each end: six sedarim at a glance, a ש if you look twice. The flat run is deliberate —
it is what keeps the base from reading as a swoosh. The first tile — top **right**, Zeraim, because the mark reads
right to left — is the only fill.

## One measure

The mark, the curve and the name all share one width. That is what holds the lockup together:

| | |
|---|---|
| Tile | 1 unit square, corner radius 0.28 |
| Stroke | 0.11 of the tile — scale it, never fix it |
| Gap | 0.22 of the tile, both axes |
| Tiles | 3.44 × 2.22 units, two even rows, no stagger |
| Base | spans the full 3.44, flat at 0.537 tile below the tiles, lifting 0.13 tile at each end over the last seventh |
| Name | 0.82 × the tile — the size at which חזרת הש״ס measures 3.44 units |
| Latin name | 0.47 × the tile — Gabarito is wider per em, so it is sized to the same 3.44 |
| Air | 0.52em of the name from the base to the letter tops |
| Filled tile | first, top right (Zeraim) |
| Clear space | 1 tile all round |
| Smallest outline | 9px tile (mark 31px wide) — below that, `mark-solid.svg` |

Because the name and the mark are the same width, the stacked lockup is one column and nothing
needs optical centring.

## Files

| File | Use |
|---|---|
| `lockup-stacked.svg` | **primary** — name under the mark |
| `lockup-stacked-reversed.svg` | the same on navy |
| `lockup-stacked-tagline.svg` | splash, print cover, siyum certificate |
| `lockup-horizontal.svg` | site header, app rail, email signature |
| `lockup-horizontal-reversed.svg` | the same on navy |
| `lockup-latin.svg` | tabs, app-store listing, footers |
| `mark.svg` / `mark-reversed.svg` | the mark alone |
| `mark-solid.svg` | under 31px wide — favicon, badges |
| `mark-oneink.svg` | worksheets and anything photocopied (no brass) |
| `icon-navy.svg` | **primary app icon** — mark at 62% |
| `icon-cream.svg` | light contexts only |
| `favicon.svg` | solid, on navy |

Navy is the primary icon: brass on cream is about 2.6:1, the lowest-contrast pairing in the set,
and on the cream icon the whole identity would hang on it.

## Colors

```
navy   #16233f
brass  #b8862b
cream  #f5f0e4
paper  #fbf8f1
muted  #6b6350
```

## Two notes

1. **Type in the lockups is live text**, Frank Ruhl Libre 700 for Hebrew and Gabarito for Latin,
   with a webfont import in each file — they render correctly in a browser. Before artwork goes
   to a printer or a manufacturer, open a lockup with both fonts installed and convert the type
   to outlines.
2. **One script at a time.** חזרת הש״ס is the name. The Latin lockup is for tabs, listings and
   footers — never set beneath the Hebrew as a subtitle.

## Don't

- Recolour the six tiles as the logo. Outlines in the seder hues, and tiles filling in as you
  finish sedarim, are in-app states — not the logo.
- Fix the stroke width while scaling the tile.
- Fill more than one tile.
- Deepen the lift or curve the flat run. A straight base with a slight lift is the point.
- Set Hebrew type on the base, or stretch, tilt or crop any letter.
