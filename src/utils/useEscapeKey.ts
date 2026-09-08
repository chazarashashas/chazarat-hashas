import { useEffect } from "react";

// Every open modal/composer/popup registers its close function here while
// mounted, most-recent last — the Android hardware back button (see
// useNativeApp) closes whichever is on top, the same thing Escape does.
const openOverlays: (() => void)[] = [];

/** Closes whatever's open when Escape is pressed — every modal in the app
    already closes on a scrim click, so keyboard users deserve the same
    escape hatch without having to tab to a close button. */
export function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    openOverlays.push(onClose);
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const i = openOverlays.lastIndexOf(onClose);
      if (i !== -1) openOverlays.splice(i, 1);
    };
  }, [onClose]);
}

/** Closes the most-recently-opened overlay registered via useEscapeKey, if
    any. Returns whether one was found and closed. */
export function closeTopOverlay(): boolean {
  const top = openOverlays[openOverlays.length - 1];
  if (!top) return false;
  top();
  return true;
}
