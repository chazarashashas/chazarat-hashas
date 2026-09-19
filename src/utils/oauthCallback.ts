/** Where Google sign-in returns to inside the Android app — a link only
    this app opens (see the intent filter in AndroidManifest.xml). It must
    also be listed in Supabase → Authentication → URL Configuration →
    Redirect URLs, or Supabase sends the browser to the website instead. */
export const NATIVE_OAUTH_CALLBACK = "org.chazarashashas.app://login-callback";

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
    error: description ? description.replace(/\+/g, " ") : code ? `Google sign-in failed (${code}).` : null,
  };
}
