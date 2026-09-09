/**
 * YYYY-MM-DD for a date in the *local* timezone. `Date.toISOString()`
 * always renders in UTC, so `new Date().toISOString().slice(0, 10)` — the
 * pattern this replaces — quietly shifts "today" for anyone west of UTC:
 * evening in the Americas already reads as tomorrow. Streaks, "learned
 * today" dots, and rebbe submissions all key off this string, so a wrong
 * value here doesn't just mislabel a date, it can silently break a streak
 * or file a submission under the wrong day for however many hours the
 * shift lasts.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
