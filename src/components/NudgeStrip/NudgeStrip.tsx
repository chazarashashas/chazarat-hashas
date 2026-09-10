import "./NudgeStrip.css";

interface NudgeStripProps {
  text: string;
  actionLabel: string;
  onAction: () => void;
  /** Overrides the default brass rule/action color — used where the
      strip sits against a hue-colored surface (e.g. Daily Limmud's
      green "learned" confirmation), so it doesn't clash with brass. */
  accentColor?: string;
}

/** A one-line "you could keep this" nudge — deliberately not a text link
    (disappears into surrounding copy) and not a card (implies a
    destination as important as its neighbors). Placement rule: nudge
    where the user's own data already is on screen. */
export function NudgeStrip({ text, actionLabel, onAction, accentColor }: NudgeStripProps) {
  return (
    <div className="callout callout--seder nudge-strip"
      style={accentColor ? { ["--callout-hue" as string]: accentColor } : undefined}>
      <span className="nudge-strip__text">{text}</span>
      <button className="btn btn--quiet nudge-strip__action" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
