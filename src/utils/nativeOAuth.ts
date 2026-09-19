import type { SupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { NATIVE_OAUTH_CALLBACK, parseOAuthCallback, randomNonce, sha256Hex } from "./oauthCallback";

/** The Google Cloud "Web application" OAuth client — the same Client ID set
    in Supabase → Authentication → Providers → Google. Public, not a secret.
    Google's Android account picker asks for tokens addressed to it; the
    Android OAuth client (package + signing SHA-1) only has to exist in the
    same Google Cloud project. Empty = skip the picker, use the browser. */
const GOOGLE_WEB_CLIENT_ID = "144219374923-u6sh0f0cfd17hni572uuc91nglbb0a5q.apps.googleusercontent.com";

let initialized: Promise<void> | null = null;

function initSocialLogin(): Promise<void> {
  initialized ??= SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID, mode: "online" } });
  return initialized;
}

function isCancel(err: unknown): boolean {
  return /cancel/i.test(err instanceof Error ? err.message : String(err ?? ""));
}

/**
 * Google sign-in for the Android app. First choice: Google's own account
 * picker over the app (Credential Manager), whose ID token Supabase turns
 * into a session. If that isn't set up or fails, the browser tab below —
 * so sign-in never simply stops working. Cancelling the picker just closes it.
 */
export async function startNativeGoogleSignIn(supabase: SupabaseClient): Promise<string | null> {
  if (GOOGLE_WEB_CLIENT_ID) {
    try {
      await initSocialLogin();
      // Google stamps the token with what it's given; Supabase re-hashes the
      // raw value and compares — so Google gets the hash, Supabase the raw.
      const rawNonce = randomNonce();
      const res = await SocialLogin.login({ provider: "google", options: { nonce: await sha256Hex(rawNonce) } });
      const idToken = (res.result as { idToken?: string | null }).idToken;
      if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken, nonce: rawNonce });
        if (!error) return null;
      }
    } catch (err) {
      if (isCancel(err)) return null;
      // Anything else — a setup mismatch, no Google account on the phone —
      // falls through to the browser, which works without any of it.
    }
  }
  return startBrowserGoogleSignIn(supabase);
}

/** Google won't sign in inside an app's own web view, so this opens the
    sign-in page in the phone's browser (a Chrome tab), which returns to the
    app through NATIVE_OAUTH_CALLBACK. */
async function startBrowserGoogleSignIn(supabase: SupabaseClient): Promise<string | null> {
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
