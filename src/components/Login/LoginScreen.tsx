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

  return (
    <div className="account-dash">
      <div className="account-card account-card--profile">
        {!editing ? (
          <>
            <p className="account-card__label">Signed in as</p>
            <p className="account-card__name">{displayName}</p>
            {auth.username && <p className="account-card__username">@{auth.username}</p>}
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

export function LoginScreen({ onLoggedIn, onNavigate }: LoginScreenProps) {
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
        <p className="app-title">Chazarat Hashas</p>
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
