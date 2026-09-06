import { useState } from "react";
import { useAuth } from "../../utils/useAuth";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useChevrusa } from "../../utils/useChevrusa";
import { useSiyumim } from "../../utils/useSiyumim";
import { useGameStats } from "../../utils/useGameStats";
import { SEDARIM } from "../../data/shas";
import { getSederHue } from "../../utils/sederHue";
import { supabaseConfigured } from "../../utils/supabase";
import "./LoginScreen.css";

type Mode = "signIn" | "signUp";

/** Google's brand rules require the unmodified multicolor mark and a
    white (not surface-tinted) button — it reading as deliberately
    different from the app's own buttons is correct, not a system
    violation. `demoted` is the smaller version used underneath the
    email form once email is the chosen path. */
function GoogleButton({
  onClick,
  disabled,
  demoted,
}: {
  onClick: () => void;
  disabled?: boolean;
  demoted?: boolean;
}) {
  return (
    <button
      className={"google-signin-btn" + (demoted ? " google-signin-btn--demoted" : "")}
      onClick={onClick}
      disabled={disabled}
    >
      <svg viewBox="0 0 24 24" width={demoted ? "16" : "19"} height={demoted ? "16" : "19"} aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.3 21.3 7.3 24 12 24z"
        />
        <path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4A12 12 0 000 12c0 1.9.5 3.8 1.4 5.4z" />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z"
        />
      </svg>
      Continue with Google
    </button>
  );
}

function letterGrade(percent: number): string {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

interface LoginScreenProps {
  /** Fired after a successful sign-in only (not sign-up, which requires
      email confirmation first and doesn't log the user in immediately)
      — lets whoever gated an action behind login send the user back to
      what they were doing instead of stranding them on this screen. */
  onLoggedIn?: () => void;
  onNavigate?: (id: string) => void;
  /** Which pill this screen opens on — set by a gate card's "Create an
      account" vs. "I already have one" so a returning user doesn't land
      on the sign-up form by default. */
  initialMode?: Mode;
  /** Skips straight past the Google-first default to the email form —
      set when the first-open prompt's "Use an email address" sent the
      user here, so that choice isn't thrown away on arrival. */
  initialEmailOpen?: boolean;
}

function AccountDashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const auth = useAuth();
  const progress = useLearningProgress();
  const { perekNotes, masechetSentences } = usePerekNotes();
  const { groups } = useChevrusa();
  const { mine } = useSiyumim();
  const { stats } = useGameStats();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(auth.firstName ?? "");
  const [lastName, setLastName] = useState(auth.lastName ?? "");
  const [username, setUsername] = useState(auth.username ?? "");
  const [city, setCity] = useState(auth.city ?? "");
  const [country, setCountry] = useState(auth.country ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const noteCount = Object.values(perekNotes).reduce(
    (total, notes) => total + notes.filter((n) => n && n.trim()).length,
    0,
  );
  const sentenceCount = Object.values(masechetSentences).filter((s) => s && s.trim()).length;

  async function handleSaveProfile() {
    setSaveError(null);
    setSaving(true);
    const result = await auth.updateProfile({ firstName, lastName, username, city, country });
    setSaving(false);
    if (result) setSaveError(result);
    else setEditing(false);
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const result = await auth.deleteAccount();
    setDeleting(false);
    if (result) setDeleteError(result);
  }

  const displayName = auth.firstName
    ? `${auth.firstName}${auth.lastName ? ` ${auth.lastName}` : ""}`
    : (auth.username ?? auth.session?.user.email);

  const initials = (auth.firstName ? `${auth.firstName[0]}${auth.lastName?.[0] ?? ""}` : (displayName ?? "?")[0]).toUpperCase();

  const viaGoogle = auth.session?.user.app_metadata?.provider === "google";

  return (
    <div className="account-dash">
      <div className={"account-card account-card--profile" + (!editing ? " account-card--profile-view" : "")}>
        {!editing ? (
          <>
            <div className="account-card__initials" aria-hidden="true">
              {initials}
            </div>
            <p className="account-card__name">{displayName}</p>
            {(auth.username || viaGoogle) && (
              <p className="account-card__username">
                {auth.username ? `@${auth.username}` : auth.session?.user.email}
                {viaGoogle ? " · via Google" : ""}
              </p>
            )}
            {(auth.city || auth.country) && (
              <p className="account-card__location">{[auth.city, auth.country].filter(Boolean).join(", ")}</p>
            )}
            <div className="account-card__actions">
              <button className="account-edit-btn" onClick={() => setEditing(true)}>
                Edit profile
              </button>
              <button className="account-signout-btn" onClick={() => auth.signOut()}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="account-card__label">Edit profile</p>
            <label className="login-field">
              <span className="login-field__label">First name</span>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="login-field">
              <span className="login-field__label">Last name</span>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
            <label className="login-field">
              <span className="login-field__label">Username</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="login-field">
              <span className="login-field__label">City</span>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lakewood" />
            </label>
            <label className="login-field">
              <span className="login-field__label">Country</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
              />
            </label>
            {saveError && (
              <p className="login-error" dir="ltr">
                {saveError}
              </p>
            )}
            <div className="account-card__actions">
              <button className="account-edit-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="account-signout-btn"
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                  setFirstName(auth.firstName ?? "");
                  setLastName(auth.lastName ?? "");
                  setUsername(auth.username ?? "");
                  setCity(auth.city ?? "");
                  setCountry(auth.country ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      <h2 className="account-section-title">Your Shas</h2>
      <div className="account-card account-card--stats">
        <div className="account-stats-grid">
          <div className="account-stat">
            <p className="account-stat__num">{progress.shasPercent()}%</p>
            <p className="account-stat__label">of Shas learned</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{progress.streak.current}</p>
            <p className="account-stat__label">day streak</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{progress.streak.longest}</p>
            <p className="account-stat__label">longest streak</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{progress.streak.freezesAvailable}</p>
            <p className="account-stat__label">freezes banked</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{progress.completions.length}</p>
            <p className="account-stat__label">mishnayot learned</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{noteCount}</p>
            <p className="account-stat__label">perek notes</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{sentenceCount + progress.concepts.length}</p>
            <p className="account-stat__label">concepts &amp; sentences</p>
          </div>
        </div>

        <div className="account-seder-bars">
          {SEDARIM.map((seder) => (
            <div key={seder.id} className="account-seder-bar" style={{ ["--tile-hue" as string]: getSederHue(seder.id) }}>
              <span className="account-seder-bar__he" dir="rtl">
                {seder.he}
              </span>
              <div className="account-seder-bar__track">
                <div className="account-seder-bar__fill" style={{ width: `${progress.sederPercent(seder.id)}%` }} />
              </div>
              <span className="account-seder-bar__pct">{progress.sederPercent(seder.id)}%</span>
            </div>
          ))}
        </div>

        <button className="account-view-link" onClick={() => onNavigate?.("progress")}>
          View full breakdown in My Siyumim →
        </button>
      </div>

      <h2 className="account-section-title">Chevrusas</h2>
      <div className="account-card">
        {groups.length === 0 ? (
          <p className="account-empty">You're not in a chevrusa or chabura yet.</p>
        ) : (
          <div className="account-group-list">
            {groups.map((g) => (
              <div key={g.id} className="account-group-row">
                <div>
                  <p className="account-group-row__title">
                    {g.name ?? g.masechetEn} <span className="account-group-row__type">{g.isChabura ? "Chabura" : "Chevrusa"}</span>
                  </p>
                  <p className="account-group-row__sub">
                    {g.masechetEn} · {g.members.length} member{g.members.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="account-view-link" onClick={() => onNavigate?.("chevrusa")}>
          Go to Chevrusa →
        </button>
      </div>

      <h2 className="account-section-title">Practice</h2>
      <div className="account-card">
        <div className="account-stats-grid account-stats-grid--practice">
          <div className="account-stat">
            <p className="account-stat__num">
              {stats.quiz.timesPlayed > 0 ? `${stats.quiz.bestScore}/${stats.quiz.bestOutOf}` : "—"}
            </p>
            <p className="account-stat__label">
              Mishna Quiz best{stats.quiz.timesPlayed > 0 ? ` (${letterGrade((stats.quiz.bestScore / stats.quiz.bestOutOf) * 100)})` : ""}
            </p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{stats.dash.timesPlayed > 0 ? stats.dash.bestScore : "—"}</p>
            <p className="account-stat__label">Shas Dash best</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{stats.chazara.timesPlayed > 0 ? stats.chazara.bestCount : "—"}</p>
            <p className="account-stat__label">Mishna Chazara best</p>
          </div>
          <div className="account-stat">
            <p className="account-stat__num">{stats.sort.timesCompleted}</p>
            <p className="account-stat__label">Seder Sort completions</p>
          </div>
        </div>
      </div>

      {mine.length > 0 && (
        <>
          <h2 className="account-section-title">L'Iluy Nishmat</h2>
          <div className="account-card">
            <p className="account-empty">
              You're managing {mine.length} siyum{mine.length === 1 ? "" : "im"}.
            </p>
            <button className="account-view-link" onClick={() => onNavigate?.("liluy")}>
              Go to L'Iluy Nishmat →
            </button>
          </div>
        </>
      )}

      <div className="delete-account">
        {!deleteOpen ? (
          <button className="delete-account__link" onClick={() => setDeleteOpen(true)}>
            Delete account
          </button>
        ) : (
          <div className="delete-account__confirm">
            <span className="delete-account__hint">Type DELETE to permanently remove your account</span>
            <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
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
  );
}

export function LoginScreen({ onLoggedIn, onNavigate, initialMode, initialEmailOpen }: LoginScreenProps) {
  const auth = useAuth();
  const progress = useLearningProgress();
  const { perekNotes } = usePerekNotes();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signIn");
  const [emailOpen, setEmailOpen] = useState(initialEmailOpen ?? false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onThisDeviceNoteCount = Object.values(perekNotes).reduce(
    (total, notes) => total + notes.filter((n) => n && n.trim()).length,
    0,
  );

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
    } else {
      onLoggedIn?.();
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    // No setBusy(false) on success — the page is about to navigate away
    // to Google, so there's nothing left to un-busy for.
    setBusy(true);
    const result = await auth.signInWithGoogle();
    if (result) {
      setBusy(false);
      setError(result);
    }
  }

  if (auth.isLoggedIn) {
    return (
      <div className="stage">
        <div className="panel login-panel">
          <p className="app-title">Chazarat Hashas</p>
          <h1 className="panel__title">My Account</h1>
          <AccountDashboard onNavigate={onNavigate} />
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="panel login-panel">
        <h1 className="panel__title">My Account</h1>
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

        {!emailOpen ? (
          <>
            <div className="onthis-panel">
              <p className="onthis-panel__label">On this device right now</p>
              <div className="onthis-panel__figures">
                <div className="onthis-panel__figure">
                  <p className="onthis-panel__num">{progress.streak.current}</p>
                  <p className="onthis-panel__unit">day streak</p>
                </div>
                <div className="onthis-panel__figure">
                  <p className="onthis-panel__num">{progress.completions.length}</p>
                  <p className="onthis-panel__unit">mishnayot</p>
                </div>
                <div className="onthis-panel__figure">
                  <p className="onthis-panel__num">{onThisDeviceNoteCount}</p>
                  <p className="onthis-panel__unit">notes</p>
                </div>
              </div>
            </div>

            <GoogleButton onClick={handleGoogleSignIn} disabled={!supabaseConfigured || busy} />

            <div className="login-divider">
              <span>or</span>
            </div>

            <button className="email-toggle-btn" onClick={() => setEmailOpen(true)}>
              Use an email address instead
            </button>

            <p className="login-reassurance">
              Signing in never changes what you have already learned — your progress on this
              device merges into your account.
            </p>
          </>
        ) : (
          <>
            <button className="login-back-btn" onClick={() => setEmailOpen(false)}>
              ← Back
            </button>

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

            <div className="login-divider">
              <span>or</span>
            </div>

            <GoogleButton demoted onClick={handleGoogleSignIn} disabled={!supabaseConfigured || busy} />
          </>
        )}
      </div>
    </div>
  );
}
