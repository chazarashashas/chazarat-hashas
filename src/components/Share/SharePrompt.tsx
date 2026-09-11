import { localDateStr } from "../../utils/localDate";
import { NavIcon } from "../Icon/NavIcon";
import { dismissPrompt } from "./sharePrompts";
import type { ShareMoment } from "./shareMoments";
import "./Share.css";

interface Props {
  moment: ShareMoment;
  /** "game" on a game's dark stage, "cream" on the app's cream screens. */
  variant: "game" | "cream";
  onShare: () => void;
  onDismiss: () => void;
}

/**
 * The prompt (SHARE-BRIEF.md "The prompt, where it appears") — a distinct
 * object, not a restyled toast. The banner rises 10px over 300ms and its
 * ✓ stamps in at 400ms; nothing else moves. "Not now" quiets this kind of
 * moment for 30 days, and sharing stays available on demand regardless.
 */
export function SharePrompt({ moment, variant, onShare, onDismiss }: Props) {
  return (
    <div className={`share-prompt share-prompt--${variant}`} role="status">
      <div className="share-prompt__row">
        <span className="share-prompt__mark" aria-hidden="true">
          ✓
        </span>
        <div className="share-prompt__text">
          <p className="share-prompt__head">{moment.bannerHead}</p>
          <p className="share-prompt__body">{moment.bannerBody}</p>
        </div>
      </div>
      <div className="share-prompt__actions">
        <button className="share-prompt__share" onClick={onShare}>
          <NavIcon id="share" size={15} weight={2.2} />
          Share this
        </button>
        <button
          className="share-prompt__not-now"
          onClick={() => {
            dismissPrompt(moment.type, localDateStr());
            onDismiss();
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}

/** The quiet version (SHARE-BRIEF.md): a text link in a run summary —
    costs nothing to ignore, so no dismissal rule and no cap. */
export function ShareLink({ onClick, onDark }: { onClick: () => void; onDark?: boolean }) {
  return (
    <button className={"share-link" + (onDark ? " share-link--dark" : "")} onClick={onClick}>
      <NavIcon id="share" size={14} weight={2.2} />
      Share
    </button>
  );
}
