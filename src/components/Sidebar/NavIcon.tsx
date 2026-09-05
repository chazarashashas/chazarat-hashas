const PATHS: Record<string, string> = {
  home: "M3 10L10 3l7 7M5 9v7h4v-4h2v4h4V9",
  limmud: "M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 6.5v3.5l2.5 1.5",
  map: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z",
  perek: "M5 3h10v14l-5-3-5 3V3z",
  progress: "M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z",
  chevrusa: "M7.5 10a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zM16.5 10a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z",
  login: "M7 7a3 3 0 116 0 3 3 0 01-6 0zM9.5 9.5L16 16M13 13l2-2M15 15l2-2",
  sedarim: "M10 1.5l2.35 6 6.15.5-4.7 3.9 1.6 6.1L10 14.5l-5.4 3.5 1.6-6.1-4.7-3.9 6.15-.5z",
  mishna: "M10 18s6-6.5 6-10.5A6 6 0 104 7.5C4 11.5 10 18 10 18z",
  sort: "M4 6h12M7 10h6M9 14h2",
  recall: "M4 16l1-4 9-9 3 3-9 9-4 1z",
  dash: "M11 2L4 12h5l-1 6 8-11h-5z",
  resources: "M6 7V3h8v4M4 7h12v6.5a1 1 0 01-1 1H5a1 1 0 01-1-1V7zM6 14v3h8v-3",
};

const FILLED = new Set(["perek", "progress", "sedarim", "mishna", "recall", "dash"]);

export function NavIcon({ id }: { id: string }) {
  const d = PATHS[id];
  if (!d) return null;
  const filled = FILLED.has(id);
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
      <path
        d={d}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 1 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
