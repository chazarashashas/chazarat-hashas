import type { SupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { NATIVE_OAUTH_CALLBACK, parseOAuthCallback } from "./oauthCallback";

/**
 * Google sign-in for the Android app. Google refuses to sign in inside an
 * app's own web view, so the sign-in page opens in the phone's browser (a
 * Chrome tab) instead, and returns to the app through NATIVE_OAUTH_CALLBACK.
 * The website keeps its ordinary redirect (see useAuth's signInWithGoogle).
 */
export async function startNativeGoogleSignIn(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: NATIVE_OAUTH_CALLBACK, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return error?.message ?? "Couldn't start Google sign-in.";
  await Browser.open({ url: data.url, toolbarColor: "#16233f" });
  return null;
}

/** A failed sign-in is shown the way the website shows one: reload with the
    error on the address, which App.tsx's initialOAuthError reads and turns
    into the sign-in screen's message. */
function showError(message: string) {
  window.location.replace(`/#error=oauth&error_description=${encodeURIComponent(message)}`);
}

async function finish(supabase: SupabaseClient, url: string) {
  if (!url.startsWith(NATIVE_OAUTH_CALLBACK)) return;
  Browser.close().catch(() => {
    // Not every platform can close the tab; the app is in front anyway.
  });
  const result = parseOAuthCallback(url);
  if (result.error) return showError(result.error);
  if (result.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(result.code);
    if (error) showError(error.message);
    return;
  }
  if (result.accessToken && result.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
    if (error) showError(error.message);
    return;
  }
  showError("Sign-in didn't complete. Try again or use email.");
}

/** Listens for the browser handing sign-in back to the app — while it's
    running, or as the link that launched it. A no-op outside the app. */
export function listenForNativeOAuth(supabase: SupabaseClient): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = CapacitorApp.addListener("appUrlOpen", (event) => {
    void finish(supabase, event.url);
  });
  CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) void finish(supabase, launch.url);
  });
  return () => {
    handle.then((h) => h.remove());
  };
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
