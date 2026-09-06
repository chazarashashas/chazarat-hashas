import { useEffect } from "react";

/** Closes whatever's open when Escape is pressed — every modal in the app
    already closes on a scrim click, so keyboard users deserve the same
    escape hatch without having to tab to a close button. */
export function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}
