import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

interface Profile {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface AuthState extends Profile {
  session: Session | null;
  loading: boolean;
}

const EMPTY_PROFILE: Profile = { username: null, firstName: null, lastName: null };

async function fetchProfile(userId: string): Promise<Profile> {
  if (!supabase) return EMPTY_PROFILE;
  const { data } = await supabase
    .from("profiles")
    .select("username, first_name, last_name")
    .eq("id", userId)
    .single();
  if (!data) return EMPTY_PROFILE;
  return { username: data.username, firstName: data.first_name, lastName: data.last_name };
}

export function useAuth() {
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

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
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

  return {
    session: state.session,
    username: state.username,
    firstName: state.firstName,
    lastName: state.lastName,
    loading: state.loading,
    isLoggedIn: Boolean(state.session),
    checkUsernameAvailable,
    signUp,
    signIn,
    signOut,
    deleteAccount,
  };
}
