import { useState } from "react";
import "./ChevrusaScreen.css";

/**
 * Chevrusa pairing needs two different people's data to reach each other
 * — an invite sent, accepted, and a "they learned today" signal delivered
 * — which is impossible on localStorage alone (it never leaves the one
 * browser it's in). This screen is the real, designed UI for that, built
 * ahead of the backend the same way Log In was: visible and inert rather
 * than hidden, with the blocker stated plainly.
 */
export function ChevrusaScreen() {
  const [inviteValue, setInviteValue] = useState("");

  return (
    <div className="stage">
      <div className="panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Chevrusa</h1>
        <p className="panel__subtitle">
          Pair with a study partner and know when they've learned today — no streaks compared, no
          ranking, just "your chevrusa showed up."
        </p>

        <div className="note-banner login-notice">
          Chevrusa pairing needs real accounts first — an invite has to reach someone else's account,
          which localStorage can't do. Under construction, same as Log In.
        </div>

        <label className="login-field">
          <span className="login-field__label">Invite by email</span>
          <input
            type="email"
            value={inviteValue}
            onChange={(e) => setInviteValue(e.target.value)}
            placeholder="chevrusa@example.com"
          />
        </label>
        <button className="restart" disabled title="Accounts aren't connected yet">
          Send invite
        </button>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Pending invites</p>
          <p className="chevrusa-empty">No pending invites.</p>
        </div>

        <div className="chevrusa-section">
          <p className="chevrusa-section__label">Your chevrusa</p>
          <p className="chevrusa-empty">Not paired with anyone yet.</p>
        </div>
      </div>
    </div>
  );
}
