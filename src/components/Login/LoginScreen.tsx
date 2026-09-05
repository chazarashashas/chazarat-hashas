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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const result = await auth.deleteAccount();
    setDeleting(false);
    if (result) setDeleteError(result);
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setBusy(true);

    const result =
      mode === "signUp"
        ? await auth.signUp(email, password, username, firstName, lastName)
        : await auth.signIn(email, password);

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
            Signed in as{" "}
            <strong>
              {auth.firstName
                ? `${auth.firstName}${auth.lastName ? ` ${auth.lastName}` : ""}`
                : (auth.username ?? auth.session?.user.email)}
            </strong>
            .
          </p>
          <button className="restart" onClick={() => auth.signOut()}>
            Sign out
          </button>

          <div className="delete-account">
            {!deleteOpen ? (
              <button className="delete-account__link" onClick={() => setDeleteOpen(true)}>
                Delete account
              </button>
            ) : (
              <div className="delete-account__confirm">
                <span className="delete-account__hint">Type DELETE to permanently remove your account</span>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                />
                <button
                  className="delete-account__button"
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  onClick={handleDeleteAccount}
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </button>
                {deleteError && (
                  <p className="login-error" dir="ltr">
                    {deleteError}
                  </p>
                )}
              </div>
            )}
          </div>
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
          <>
            <label className="login-field">
              <span className="login-field__label">First name</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Shown when you're signed in — e.g. Yonah"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Last name</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Cohen"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
              />
            </label>
          </>
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
          disabled={
            !supabaseConfigured ||
            busy ||
            !email ||
            !password ||
            (mode === "signUp" && (!username || !firstName || !lastName))
          }
          title={supabaseConfigured ? undefined : "Accounts aren't connected yet"}
          onClick={handleSubmit}
        >
          {busy ? "Please wait…" : mode === "signUp" ? "Create account" : "Log in"}
        </button>
      </div>
    </div>
  );
}
