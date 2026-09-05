import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

interface AuthState {
  session: Session | null;
  username: string | null;
  loading: boolean;
}

async function fetchUsername(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).single();
  return data?.username ?? null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    username: null,
    loading: supabaseConfigured,
  });

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const username = session ? await fetchUsername(session.user.id) : null;
      setState({ session, username, loading: false });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const username = session ? await fetchUsername(session.user.id) : null;
      setState({ session, username, loading: false });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function checkUsernameAvailable(username: string): Promise<boolean> {
    if (!supabase) return false;
    const { data } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    return !data;
  }

  async function signUp(email: string, password: string, username: string): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";

    const available = await checkUsernameAvailable(username);
    if (!available) return "That username is already taken.";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
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

  return {
    session: state.session,
    username: state.username,
    loading: state.loading,
    isLoggedIn: Boolean(state.session),
    checkUsernameAvailable,
    signUp,
    signIn,
    signOut,
  };
}
