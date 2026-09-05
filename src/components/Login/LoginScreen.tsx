import { useState } from "react";
import "./LoginScreen.css";

/**
 * The real login screen, built ahead of the backend that will power it.
 * Nothing here is wired to an actual account service yet — that needs a
 * Supabase (or similar) project's URL and public key, which only the
 * project owner can create. Once that's connected, this form starts
 * working; until then it stays visible but inert, with that explained
 * plainly rather than hidden behind a "coming soon" nav item.
 */
export function LoginScreen() {
  const [email, setEmail] = useState("");

  return (
    <div className="stage">
      <div className="panel login-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Log In</h1>
        <p className="panel__subtitle">
          Sign in to keep your notes, progress, and streak with your account instead of just this
          device.
        </p>

        <div className="note-banner login-notice">
          Accounts aren't connected yet — under construction. Your notes and progress are already
          being saved on this device; signing in will carry them over once this is live.
        </div>

        <label className="login-field">
          <span className="login-field__label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <button className="restart" disabled title="Accounts aren't connected yet">
          Send sign-in link
        </button>
      </div>
    </div>
  );
}
