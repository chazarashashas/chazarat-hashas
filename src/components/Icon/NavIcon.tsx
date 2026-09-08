/** One set, one style: 24x24 viewBox, stroke-only monoline icons — no
    fills, no emoji, no platform-dependent glyphs (see HANDOFF30 4b).
    This is the app's whole icon set, not just the sidebar's — anything
    that used to draw its own inline arrow/chevron/close SVG belongs
    here instead. */
const PATHS: Record<string, string> = {
  home: "M4 11.5L12 4l8 7.5M6 10.5V19h4.5v-5.5h3V19H18v-8.5",
  limmud: "M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM12 8v4.2l3 2",
  review:
    "M23 4L23 10L17 10M1 20L1 14L7 14M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  map: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  perek: "M6 3h12v18l-6-4-6 4V3z",
  progress:
    "M8 4h8v4a4 4 0 01-4 4 4 4 0 01-4-4V4zM8 5H5a3 3 0 003 3M16 5h3a3 3 0 01-3 3M12 12v3M9 19h6M10 16h4v3h-4z",
  chevrusa:
    "M8 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 19c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5M16 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM12.5 19c.3-2.2 1.8-3.8 3.9-3.8 2.1 0 3.6 1.6 3.9 3.8",
  login: "M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM4.5 20c.7-4 3.7-6 7.5-6s6.8 2 7.5 6",
  sedarim:
    "M12 2l2.9 7.2 7.4.6-5.7 4.7 1.9 7.3L12 17.8l-6.5 4 1.9-7.3-5.7-4.7 7.4-.6z",
  mishna:
    "M12 21s7-7.8 7-12.5A7 7 0 105 8.5C5 13.2 12 21 12 21zM12 6.3a2.2 2.2 0 100 4.4 2.2 2.2 0 000-4.4z",
  sort: "M4 7h3M13 7h7M9 5a2 2 0 100 4 2 2 0 000-4zM4 12h9M19 12h1M15 10a2 2 0 100 4 2 2 0 000-4zM4 17h5M15 17h5M11 15a2 2 0 100 4 2 2 0 000-4z",
  recall: "M4.5 19.5l1.2-4.8L16.5 3.9l3.6 3.6L9.3 18.3l-4.8 1.2z",
  dash: "M13 2L5 14h6l-1.5 8L19 10h-6z",
  resources: "M7 8V4h10v4M5 8h14v7a1 1 0 01-1 1H6a1 1 0 01-1-1V8zM7 16v4h10v-4",
  liluy: "M12 2c1.2 2 1.6 3.3 1.6 4.3a1.6 1.6 0 11-3.2 0C10.4 5.3 10.8 4 12 2zM9 21h6M12 8v8M9 16a3 3 0 006 0",
  admin: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4",
  rebbe: "M8 4h8v2a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM6 6h12v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6zM9 13l2 2 4-4",
  chabura:
    "M12 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM7 20c0-3 2.2-4.9 5-4.9s5 1.9 5 4.9M5 11a2 2 0 100-4 2 2 0 000 4zM2 17.5c.2-2.2 1.5-3.6 3.3-3.6M19 11a2 2 0 100-4 2 2 0 000 4zM22 17.5c-.2-2.2-1.5-3.6-3.3-3.6",
  arrow: "M4 12h15M13 6l6 6-6 6",
  chevron: "M6 9l6 6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  download: "M12 3v12M8 11l4 4 4-4M5 19h14",
  print: "M7 8V4h10v4M5 8h14v8h-4v3H9v-3H5zM9 14h6",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
};

export function NavIcon({ id, size = 20, weight = 1.6 }: { id: string; size?: number; weight?: number }) {
  const d = PATHS[id];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The one icon in the set that isn't a stroked line — a filled
    three-dot "more" glyph (group-card overflow menu). Kept alongside
    NavIcon rather than forced into its stroke-path model. */
export function DotsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
