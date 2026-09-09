import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// Regression test for a real data-loss bug this session: signOut() used
// to call supabase.auth.signOut() first, and useCloudSync's own effect
// wipes this device's local cache the instant it sees no session — so
// anything changed in the last few seconds before an unflushed sign-out
// had no cloud copy, and the moment the wipe ran, no local copy either.
// The fix was purely about order: flush, then end the session. This
// test exists so that order can never quietly flip back.
const callOrder: string[] = [];

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
} as unknown as import("@supabase/supabase-js").Session;

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mockSession } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => {
        callOrder.push("auth.signOut");
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  },
  supabaseConfigured: true,
}));

vi.mock("./useCloudSync", () => ({
  flushLocalDataToCloud: vi.fn(async () => {
    callOrder.push("flush");
  }),
}));

import { AuthProvider, useAuth } from "./useAuth";

describe("signOut", () => {
  beforeEach(() => {
    callOrder.length = 0;
  });

  it("flushes local data to the cloud before ending the session", async () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <AuthProvider>{children}</AuthProvider>;
    }
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.session).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(callOrder).toEqual(["flush", "auth.signOut"]);
  });
});
