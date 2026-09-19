import { describe, expect, it } from "vitest";
import { NATIVE_OAUTH_CALLBACK, parseOAuthCallback, randomNonce, sha256Hex } from "./oauthCallback";

describe("the nonce for Google's account picker", () => {
  it("hashes to SHA-256 hex, as Supabase compares it", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is random and long", () => {
    const a = randomNonce();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(randomNonce()).not.toBe(a);
  });
});

describe("Google sign-in returning to the Android app", () => {
  it("reads the tokens Supabase puts after the #", () => {
    const r = parseOAuthCallback(`${NATIVE_OAUTH_CALLBACK}#access_token=abc&expires_in=3600&refresh_token=xyz&token_type=bearer`);
    expect(r).toMatchObject({ accessToken: "abc", refreshToken: "xyz", code: null, error: null });
  });

  it("reads a PKCE code", () => {
    expect(parseOAuthCallback(`${NATIVE_OAUTH_CALLBACK}?code=123`).code).toBe("123");
  });

  it("reads an error, from either place", () => {
    expect(parseOAuthCallback(`${NATIVE_OAUTH_CALLBACK}#error=access_denied&error_description=User+cancelled`).error).toBe(
      "User cancelled",
    );
    expect(parseOAuthCallback(`${NATIVE_OAUTH_CALLBACK}?error=server_error`).error).toBe("Google sign-in failed (server_error).");
  });
});
