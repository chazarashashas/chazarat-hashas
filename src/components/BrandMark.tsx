interface BrandMarkProps {
  /** "reversed" (brass tile, cream outlines — for navy backgrounds),
      "oneink" (single navy ink, no brass — for anything photocopied), or
      "outline" (brass tile, navy outlines — for cream backgrounds). */
  variant?: "reversed" | "oneink" | "outline";
  className?: string;
}

/** The six-tile mark: six sedarim on two rows over a base that runs flat
    and lifts slightly at each end — a ש if you look twice. Below 31px
    wide the outline stroke stops resolving; use a solid-tile treatment
    instead at that size. */
export function BrandMark({ variant = "reversed", className }: BrandMarkProps) {
  const outline = variant === "reversed" ? "#f5f0e4" : "#16233f";
  return (
    <svg viewBox="-5.5 0 355 281.2" role="img" aria-label="Chazarat Hashas mark" className={className}>
      {variant === "oneink" ? (
        <rect x="249.5" y="5.5" width="89" height="89" rx="22.5" fill="none" stroke={outline} strokeWidth="11" />
      ) : (
        <rect x="244" y="0" width="100" height="100" rx="28" fill="#b8862b" />
      )}
      <rect x="127.5" y="5.5" width="89" height="89" rx="22.5" fill="none" stroke={outline} strokeWidth="11" />
      <rect x="5.5" y="5.5" width="89" height="89" rx="22.5" fill="none" stroke={outline} strokeWidth="11" />
      <rect x="249.5" y="127.5" width="89" height="89" rx="22.5" fill="none" stroke={outline} strokeWidth="11" />
      <rect x="127.5" y="127.5" width="89" height="89" rx="22.5" fill="none" stroke={outline} strokeWidth="11" />
      <rect x="5.5" y="127.5" width="89" height="89" rx="22.5" fill="none" stroke={outline} strokeWidth="11" />
      <path
        d="M0 262.5 Q23.7 275.7 47.5 275.7 H296.5 Q320.3 275.7 344 262.5"
        fill="none"
        stroke={outline}
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  );
}
