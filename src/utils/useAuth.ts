import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

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

  return {
    session: state.session,
    username: state.username,
    firstName: state.firstName,
    lastName: state.lastName,
    city: state.city,
    country: state.country,
    isAdmin: state.isAdmin,
    loading: state.loading,
    isLoggedIn: Boolean(state.session),
    checkUsernameAvailable,
    signUp,
    signIn,
    signOut,
    updateProfile,
    deleteAccount,
  };
}
