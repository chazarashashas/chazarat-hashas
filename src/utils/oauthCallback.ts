import i18n from "../i18n";

/** Where Google sign-in returns to inside the Android app — a link only
    this app opens (see the intent filter in AndroidManifest.xml). It must
    also be listed in Supabase → Authentication → URL Configuration →
    Redirect URLs, or Supabase sends the browser to the website instead. */
export const NATIVE_OAUTH_CALLBACK = "org.chazarashashas.app://login-callback";

/** A one-time random value for Google's account picker (see nativeOAuth). */
export function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 as lowercase hex — the form Google expects the nonce in and
    Supabase compares against. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface OAuthCallback {
  accessToken: string | null;
  refreshToken: string | null;
  /** Present when Supabase uses the PKCE flow instead of returning tokens. */
  code: string | null;
  error: string | null;
}

/** Reads what Supabase put on the callback link — tokens in the #fragment
    (implicit flow), a ?code= (PKCE flow), or an error in either. */
export function parseOAuthCallback(url: string): OAuthCallback {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const hash = new URLSearchParams(hashIndex >= 0 ? url.slice(hashIndex + 1) : "");
  const query = new URLSearchParams(
    queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex > queryIndex ? hashIndex : undefined) : "",
  );
  const get = (key: string) => hash.get(key) ?? query.get(key);
  const description = get("error_description");
  const code = get("error");
  return {
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    code: query.get("code"),
    error: description ? description.replace(/\+/g, " ") : code ? i18n.t("shell:errors.googleFailed", { code }) : null,
  };
}
