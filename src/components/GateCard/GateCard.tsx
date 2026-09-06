import "./GateCard.css";

interface GateCardProps {
  title: string;
  body: string;
  onCreateAccount: () => void;
  onSignIn: () => void;
}

/** For an action that genuinely cannot work without an account — as
    opposed to NudgeStrip, which is for data that could optionally be
    kept. Two buttons because a first-timer and a returning user want
    different ones; one button makes one of them guess. */
export function GateCard({ title, body, onCreateAccount, onSignIn }: GateCardProps) {
  return (
    <div className="gate-card">
      <p className="gate-card__title">{title}</p>
      <p className="gate-card__body">{body}</p>
      <div className="gate-card__actions">
        <button className="gate-card__primary" onClick={onCreateAccount}>
          Create an account
        </button>
        <button className="gate-card__secondary" onClick={onSignIn}>
          I already have one
        </button>
      </div>
    </div>
  );
}
