import type { ChagId } from "../../utils/chagCalendar";

/** The chag's own motif — the motif belongs to the chag, not the app.
    Rosh Hashana has a red apple and a pot of honey, filled and bright
    rather than drawn in thin brass, which read as a memorial; Shabbat has
    its candles. Other chagim have none yet: a motif needs designing, not
    guessing. */
export function ChagMotif({ chag }: { chag: ChagId | null }) {
  if (chag === "rosh-hashana") {
    return (
      <div className="chag-motif chag-motif--festive" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          {/* apple */}
          <path className="m-apple" d="M32 21c-3-2.6-10.5-4-15 1.2-5.6 6.5-3.3 20.3 3.6 27.3 3.2 3.2 7 4.2 11.4 2.2 4.4 2 8.2 1 11.4-2.2 6.9-7 9.2-20.8 3.6-27.3C42.5 17 35 18.4 32 21z" />
          <path className="m-shine" d="M20.5 29.5c-1.2 3.4-.9 7.4.9 10.6" />
          <path className="m-stem" d="M32 21.5c-.2-4.2.8-7.4 2.8-9.8" />
          <path className="m-leaf" d="M34.6 13.4c3-4.4 8.6-5.6 12.2-3.6-1.9 4.9-7.6 7.2-12.2 3.6z" />
        </svg>
        <svg viewBox="0 0 64 64">
          {/* honey pot, with a drip and the dipper resting in it */}
          <path className="m-dipper" d="M40 24 49.5 8.5" />
          <ellipse className="m-dipper-head" cx="50.6" cy="7" rx="3.4" ry="2.4" transform="rotate(-58 50.6 7)" />
          <path className="m-pot" d="M17.5 27h29c2.8 0 4.4 2.6 3.6 5.4C47.8 42.6 42 52 32 52s-15.8-9.4-18.1-19.6c-.8-2.8.8-5.4 3.6-5.4z" />
          <rect className="m-rim" x="15" y="21" width="34" height="7.5" rx="3.75" />
          <path className="m-drip" d="M22 28.5h13v5.5a2.6 2.6 0 0 1-5.2 0v-1.6a2.2 2.2 0 0 0-4.4 0v4.8a2.6 2.6 0 0 1-5.2 0V30a1.5 1.5 0 0 1 1.8-1.5z" />
          <path className="m-shine" d="M19.6 34.5c.8 3.7 2.4 7 4.6 9.4" />
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
