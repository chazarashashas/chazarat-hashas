import "./FirstOpenPrompt.css";

interface FirstOpenPromptProps {
  variant: "A" | "B";
  streakCurrent: number;
  mishnayotCount: number;
  noteCount: number;
  onGoogle: () => void;
  onEmail: () => void;
  onDismiss: () => void;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function variantBCopy({ streakCurrent, mishnayotCount, noteCount }: Omit<FirstOpenPromptProps, "variant" | "onGoogle" | "onEmail" | "onDismiss">) {
  const clauses: string[] = [];
  if (streakCurrent > 0) clauses.push(`your ${streakCurrent}-day streak`);
  if (mishnayotCount > 0) clauses.push(`${mishnayotCount} mishnah${mishnayotCount === 1 ? "" : "yot"}`);
  if (noteCount > 0) clauses.push(`${noteCount} note${noteCount === 1 ? "" : "s"}`);

  const heading = streakCurrent > 0 ? `Keep your ${streakCurrent} day${streakCurrent === 1 ? "" : "s"}` : "Keep what you've started";

  return {
    heading,
    body: `${joinList(clauses.length > 0 ? clauses : ["your progress"])} live on this device. Clear your browser and they're gone. An account keeps them, and works on your phone too.`,
  };
}

/**
 * The app's own first-open sign-in card — see SIGNIN-BRIEF.md §5. Two
 * copy variants sharing one component: A offers (nothing to lose yet on
 * a true first open), B names the user's real numbers once there's
 * something to point at. Frequency/retirement rules live in
 * useFirstOpenPrompt, not here — this component only renders whichever
 * variant it's told to and reports the one dismiss action back up.
 */
export function FirstOpenPrompt({ variant, streakCurrent, mishnayotCount, noteCount, onGoogle, onEmail, onDismiss }: FirstOpenPromptProps) {
  const b = variant === "B" ? variantBCopy({ streakCurrent, mishnayotCount, noteCount }) : null;

  return (
    <div className="scrim first-open-scrim">
      <div className="popup first-open-popup">
        <h2 className="first-open-popup__he" dir="rtl">
          חזרת הש״ס
        </h2>

        {variant === "A" ? (
          <>
            <p className="first-open-popup__heading">Start with an account, or just start</p>
            <p className="first-open-popup__body">
              An account keeps your place across your phone and laptop, and is what lets you learn
              with a chevrusa or split a siyum. Everything else works without one.
            </p>
          </>
        ) : (
          <>
            <p className="first-open-popup__heading">{b!.heading}</p>
            <p className="first-open-popup__body">{b!.body}</p>
          </>
        )}

        <button className="first-open-popup__google" onClick={onGoogle}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.3 21.3 7.3 24 12 24z"
            />
            <path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4A12 12 0 000 12c0 1.9.5 3.8 1.4 5.4z" />
            <path
              fill="#EA4335"
              d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z"
            />
          </svg>
          Continue with Google
        </button>

        <button className="first-open-popup__email" onClick={onEmail}>
          Use an email address
        </button>

        <button className="first-open-popup__dismiss" onClick={onDismiss}>
          Not right now
        </button>
      </div>
    </div>
  );
}
