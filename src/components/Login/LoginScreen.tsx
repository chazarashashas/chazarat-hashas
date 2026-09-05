import { useState } from "react";
import { useAuth } from "../../utils/useAuth";
import { supabaseConfigured } from "../../utils/supabase";
import "./LoginScreen.css";

type Mode = "signIn" | "signUp";

export function LoginScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setBusy(true);

    const result =
      mode === "signUp" ? await auth.signUp(email, password, username) : await auth.signIn(email, password);

    setBusy(false);
    if (result) {
      setError(result);
    } else if (mode === "signUp") {
      setMessage("Account created — check your email to confirm it, then log in.");
      setMode("signIn");
    }
  }

  if (auth.isLoggedIn) {
    return (
      <div className="stage">
        <div className="panel login-panel">
          <p className="app-title">Chazarat Hashas</p>
          <h1 className="panel__title">Log In</h1>
          <p className="panel__subtitle">
            Signed in as <strong>{auth.username ?? auth.session?.user.email}</strong>.
          </p>
          <button className="restart" onClick={() => auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="panel login-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Log In</h1>
        <p className="panel__subtitle">
          Sign in to keep your notes, progress, and streak with your account instead of just this
          device.
        </p>

        {!supabaseConfigured && (
          <div className="note-banner login-notice">
            Accounts aren't connected yet — under construction. Your notes and progress are already
            being saved on this device; signing in will carry them over once this is live.
          </div>
        )}

        <div className="pill-row">
          <button
            className={"pill" + (mode === "signIn" ? " pill--active" : "")}
            onClick={() => setMode("signIn")}
          >
            Log in
          </button>
          <button
            className={"pill" + (mode === "signUp" ? " pill--active" : "")}
            onClick={() => setMode("signUp")}
          >
            Create account
          </button>
        </div>

        {mode === "signUp" && (
          <label className="login-field">
            <span className="login-field__label">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
            />
          </label>
        )}

        <label className="login-field">
          <span className="login-field__label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="login-field">
          <span className="login-field__label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="login-error" dir="ltr">
            {error}
          </p>
        )}
        {message && (
          <p className="login-message" dir="ltr">
            {message}
          </p>
        )}

        <button
          className="restart"
          disabled={!supabaseConfigured || busy || !email || !password || (mode === "signUp" && !username)}
          title={supabaseConfigured ? undefined : "Accounts aren't connected yet"}
          onClick={handleSubmit}
        >
          {busy ? "Please wait…" : mode === "signUp" ? "Create account" : "Log in"}
        </button>
      </div>
    </div>
  );
}
