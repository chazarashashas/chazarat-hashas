import type { ChagId } from "../../utils/chagCalendar";

/** The chag's own motif, in brass line-art matching the nav icons — the
    motif belongs to the chag, not the app. Rosh Hashana has the apple and
    the honey jar; Shabbat has its candles. Other chagim have none yet: a
    motif needs designing, not guessing. */
export function ChagMotif({ chag }: { chag: ChagId | null }) {
  if (chag === "rosh-hashana") {
    return (
      <div className="chag-motif" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M32 20c-7 0-13 5.6-13 14s6 22 13 22 13-13.6 13-22-6-14-13-14z" />
          <path d="M32 20V11" />
          <path d="M32 12c4-1 7-4 7-8-4.5 0-7.5 3-7 8z" />
        </svg>
        <svg viewBox="0 0 64 64">
          <path d="M22 14h20l-2 8H24z" />
          <path d="M24 22c-1 6-2 10-2 16 0 8 4 12 10 12s10-4 10-12c0-6-1-10-2-16" />
          <path d="M26 34c4-2 8-2 12 0" />
        </svg>
      </div>
    );
  }
  if (chag === null) {
    return (
      <div className="chag-motif" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M22 30h8v24h-8zM34 30h8v24h-8z" />
          <path d="M26 24c-3-3-1-7 0-10 3 3 4 7 0 10zM38 24c-3-3-1-7 0-10 3 3 4 7 0 10z" />
          <path d="M16 56h32" />
        </svg>
      </div>
    );
  }
  return null;
}
