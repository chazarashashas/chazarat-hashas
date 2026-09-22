import { useTranslation } from "react-i18next";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { ShareLink } from "../Share/SharePrompt";

interface GameEndModalProps {
  /** "All 6 matched", "All 63 sorted" — what was just finished. */
  text: string;
  onPlayAgain: () => void;
  onShare: () => void;
  /** Closes the card and leaves the finished board on screen. */
  onClose: () => void;
}

/**
 * The card a finished board shows. It can always be closed — by the ✕, by
 * tapping outside it, or with Escape — so the board stays reachable
 * instead of trapping you between "Play again" and "Share".
 */
export function GameEndModal({ text, onPlayAgain, onShare, onClose }: GameEndModalProps) {
  const { t } = useTranslation(["games", "common"]);
  useEscapeKey(onClose);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--sm game__end" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title={t("common:close")} aria-label={t("common:close")}>
          ✕
        </button>
        <div className="popup__mark">✓</div>
        <div className="popup__text">{text}</div>
        <button className="popup__restart" onClick={onPlayAgain}>
          {t("playAgain")}
        </button>
        <ShareLink onClick={onShare} />
      </div>
    </div>
  );
}
