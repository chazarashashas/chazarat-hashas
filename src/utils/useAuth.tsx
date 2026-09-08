import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";
import { flushLocalDataToCloud } from "./useCloudSync";

interface Profile {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  country: string | null;
  isAdmin: boolean;
}

interface AuthState extends Profile {
  session: Session | null;
  loading: boolean;
}

const EMPTY_PROFILE: Profile = {
  username: null,
  firstName: null,
  lastName: null,
  city: null,
  country: null,
  isAdmin: false,
};

async function fetchProfile(userId: string): Promise<Profile> {
  if (!supabase) return EMPTY_PROFILE;
  let { data, error } = await supabase
    .from("profiles")
    .select("username, first_name, last_name, city, country, is_admin")
    .eq("id", userId)
    .single();
  // is_admin/city/country only exist once admin_setup.sql has been run —
  // fall back to the columns that are always there so profile loading
  // never breaks in the gap between deploying this and running that SQL.
  if (error) {
    ({ data } = await supabase.from("profiles").select("username, first_name, last_name").eq("id", userId).single());
  }
  if (!data) return EMPTY_PROFILE;
  const d = data as { city?: string; country?: string; is_admin?: boolean } & typeof data;
  return {
    username: data.username,
    firstName: data.first_name,
    lastName: data.last_name,
    city: d.city ?? null,
    country: d.country ?? null,
    isAdmin: Boolean(d.is_admin),
  };
}

interface AuthContextValue extends AuthState {
  isLoggedIn: boolean;
  checkUsernameAvailable(username: string): Promise<boolean>;
  signUp(email: string, password: string, username: string, firstName: string, lastName: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signInWithGoogle(): Promise<string | null>;
  signOut(): Promise<void>;
  updateProfile(fields: {
    firstName?: string;
    lastName?: string;
    username?: string;
    city?: string;
    country?: string;
  }): Promise<string | null>;
  deleteAccount(): Promise<string | null>;
  adminDeleteUser(userId: string): Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * One session fetch and one onAuthStateChange listener for the whole app,
 * not one per screen. useAuth() is called from ~18 places (every gated
 * screen, plus several hooks); before this, each of those was its own
 * independent useState/useEffect pair, so every fresh screen mount
 * started from session:null and had to re-await its own getSession()
 * call before it knew you were signed in — a flash of the signed-out
 * gate on effectively every navigation, which read as "keeps making me
 * log in again". Supabase's own session cache made this fast, but not
 * instant, and "not instant" was enough to be visible constantly. This
 * provider computes the auth state once at the top of the tree; useAuth()
 * below just reads it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    ...EMPTY_PROFILE,
    loading: supabaseConfigured,
  });

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session ? await fetchProfile(session.user.id) : EMPTY_PROFILE;
      setState({ session, ...profile, loading: false });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await fetchProfile(session.user.id) : EMPTY_PROFILE;
      setState({ session, ...profile, loading: false });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function checkUsernameAvailable(username: string): Promise<boolean> {
    if (!supabase) return false;
    const { data } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    return !data;
  }

  async function signUp(
    email: string,
    password: string,
    username: string,
    firstName: string,
    lastName: string,
  ): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";

    const available = await checkUsernameAvailable(username);
    if (!available) return "That username is already taken.";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, first_name: firstName, last_name: lastName } },
    });
    return error ? error.message : null;
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  /** Redirects to Google's own sign-in page, then back to wherever the
      app is currently hosted — Supabase handles the OAuth exchange and
      session creation on return, so there's no callback code to write
      here. A first-time Google sign-in may land without a username set
      (Google doesn't collect one), same as any profile field left
      blank — My Account's editor already covers filling that in. */
  async function signInWithGoogle(): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return error ? error.message : null;
  }

  async function signOut() {
    if (!supabase) return;
    // Push this device's latest local changes to the account before the
    // session goes away — useCloudSync otherwise only pushes on a 10s
    // poll and wipes local storage the instant it sees no session, so
    // anything changed in the last few seconds before sign-out could
    // have no cloud copy and, right after, no local copy either.
    if (state.session) await flushLocalDataToCloud(state.session);
    await supabase.auth.signOut();
  }

  /** Updates the signed-in user's own profile row. Requires the
      "you can update your own profile" RLS policy (auth.uid() = id) —
      profiles had no UPDATE policy at all until that fix landed. */
  async function updateProfile(fields: {
    firstName?: string;
    lastName?: string;
    username?: string;
    city?: string;
    country?: string;
  }): Promise<string | null> {
    if (!supabase || !state.session) return "Accounts aren't connected yet.";
    if (fields.username && fields.username !== state.username) {
      const available = await checkUsernameAvailable(fields.username);
      if (!available) return "That username is already taken.";
    }
    const patch: Record<string, string> = {};
    if (fields.firstName !== undefined) patch.first_name = fields.firstName;
    if (fields.lastName !== undefined) patch.last_name = fields.lastName;
    if (fields.username !== undefined) patch.username = fields.username;
    if (fields.city !== undefined) patch.city = fields.city;
    if (fields.country !== undefined) patch.country = fields.country;
    const { error } = await supabase.from("profiles").update(patch).eq("id", state.session.user.id);
    if (error) return error.message;
    setState((prev) => ({
      ...prev,
      firstName: fields.firstName ?? prev.firstName,
      lastName: fields.lastName ?? prev.lastName,
      username: fields.username ?? prev.username,
      city: fields.city ?? prev.city,
      country: fields.country ?? prev.country,
    }));
    return null;
  }

  /** Permanently deletes the signed-in user's own account (and, via
      cascading foreign keys, their profile and synced data). Calls a
      server-side Edge Function since deleting an auth user needs the
      service-role key, which client code never has access to. */
  async function deleteAccount(): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) return error.message;
    await supabase.auth.signOut();
    return null;
  }

  /** Admin-only: permanently deletes someone else's account. The same
      delete-account Edge Function handles this — it independently checks
      the caller's own is_admin flag server-side before honoring a
      target_user_id, so this call only succeeds when state.session
      actually belongs to an admin, regardless of what isAdmin says
      client-side. */
  async function adminDeleteUser(userId: string): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.functions.invoke("delete-account", {
      body: { target_user_id: userId },
    });
    return error ? error.message : null;
  }

  const value: AuthContextValue = {
    ...state,
    isLoggedIn: Boolean(state.session),
    checkUsernameAvailable,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    deleteAccount,
    adminDeleteUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be called within an AuthProvider");
  return ctx;
}
