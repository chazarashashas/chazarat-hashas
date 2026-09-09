import * as Sentry from "@sentry/react";

/** True only once a real Sentry DSN is configured — same graceful-
    absence pattern as supabaseConfigured (see supabase.ts). Nothing
    here breaks or logs noisily when it's unset; it just doesn't report
    anywhere yet. Set VITE_SENTRY_DSN in Vercel's env vars (and
    .env.local for testing) once a Sentry project exists — see
    monitoringConfigured for what "exists" means here. */
export const monitoringConfigured = Boolean(import.meta.env.VITE_SENTRY_DSN);

/** Call once, at startup (see main.tsx). Captures unhandled errors and
    unhandled promise rejections automatically once initialized; nothing
    else in the app needs to know whether monitoring is actually on. */
export function initMonitoring() {
  if (!monitoringConfigured) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // Session data only — no replay, no performance tracing. This is a
    // study app for adults; the audit's ask was "know when something is
    // wrong," not "record what every user does."
    integrations: [],
  });
}

/** Fable audit #6: sync failures were being silently discarded, with no
    way to know a student's progress had stopped saving until they
    noticed it missing on a second device. Called from useCloudSync once
    failures repeat (not on the first, normal-network-noise failure) —
    see ERROR_AFTER_FAILURES there. */
export function reportSyncFailure(consecutiveFailures: number) {
  if (!monitoringConfigured) return;
  Sentry.captureMessage(`Cloud sync failing repeatedly (${consecutiveFailures} attempts in a row)`, "warning");
}

/** For the "Report a problem" link in My Account — attaches whatever
    the student typed to the current error/session context, if
    monitoring is configured, in addition to the mailto fallback that
    always works regardless. */
export function reportUserFeedback(message: string, email?: string) {
  if (!monitoringConfigured) return;
  Sentry.captureFeedback({ message, email });
}
