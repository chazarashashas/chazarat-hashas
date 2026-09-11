import { useEffect, useState } from "react";
import { localDateStr } from "./localDate";

/**
 * Today's local date, kept current: it changes at the user's own local
 * midnight even if the app is left open, and is re-read when the app comes
 * back to the foreground. The erev print card relies on this — it must be
 * gone the moment erev's secular date ends, never lingering into Shabbat
 * or yom tov because the screen hadn't redrawn.
 */
export function useToday(): string {
  const [today, setToday] = useState(localDateStr);

  useEffect(() => {
    const refresh = () => setToday(localDateStr());
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = window.setTimeout(refresh, midnight.getTime() - now.getTime());
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [today]);

  return today;
}
