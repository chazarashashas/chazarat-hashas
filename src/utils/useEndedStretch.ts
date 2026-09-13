import { useEffect, useMemo, useState } from "react";
import { endedStretchAt, nextStretchCheckAt, type ChagStretch } from "./chagCalendar";
import { deviceTimeZone, nightfallFor } from "./nightfall";

const nightfall = (date: string) => nightfallFor(date, deviceTimeZone());

/**
 * The Shabbat or yom tov stretch the after-chag prompt is about, kept
 * current: it wakes at that evening's nightfall plus ten minutes (or at
 * local midnight), and whenever the app comes back to the foreground — so
 * someone with the app open on Motzei Shabbat gets the prompt then, not
 * the next morning.
 */
export function useEndedStretch(): ChagStretch | null {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const wait = nextStretchCheckAt(now, nightfall).getTime() - Date.now() + 1000;
    const timer = window.setTimeout(refresh, Math.min(Math.max(wait, 1000), 2 ** 31 - 1));
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [now]);

  return useMemo(() => endedStretchAt(now, nightfall), [now]);
}
