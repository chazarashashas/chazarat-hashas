const KEY = "chazarat-hashas:focusPrintCard";

/** Home's erev card asks Daily Limmud to open scrolled to the print card. */
export function requestPrintCardFocus() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore — the card is near the top of Daily Limmud anyway
  }
}

/** Read once: true only for the first print card mounted after the ask. */
export function takePrintCardFocus(): boolean {
  try {
    const asked = sessionStorage.getItem(KEY) === "1";
    sessionStorage.removeItem(KEY);
    return asked;
  } catch {
    return false;
  }
}
