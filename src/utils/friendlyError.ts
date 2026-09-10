import { reportHandledError } from "./monitoring";

/** The only three sentences a student ever sees when something fails.
    Raw messages — Postgres errors, Sefaria's API text, TypeErrors — never
    reach the screen; they go to monitoring instead. */
export const FRIENDLY_ERRORS = {
  load: "Couldn't load this — try again.",
  offline: "You're offline — this will load when you're back.",
  generic: "Something went wrong — try again.",
} as const;

function looksOffline(err: unknown): boolean {
  // navigator.onLine is the reliable half; the message check catches a
  // fetch that failed while the browser still believed it was online.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /network|fetch|offline|connection/i.test(message);
}

function looksLikeLoad(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /load|not found|404|timeout|abort/i.test(message);
}

/**
 * Maps any thrown value to one of three sentences, and reports the real
 * one to monitoring. `context` is the label the report is tagged with,
 * so a spike is traceable to a screen.
 */
export function friendlyError(err: unknown, context = "unknown"): string {
  reportHandledError(err, context);
  if (looksOffline(err)) return FRIENDLY_ERRORS.offline;
  if (looksLikeLoad(err)) return FRIENDLY_ERRORS.load;
  return FRIENDLY_ERRORS.generic;
}
