import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import "./ChevrusaScreen.css";

type Mode = "chevrusa" | "chabura";

function MasechetSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a masechet…</option>
      {SEDARIM.map((seder) => (
        <optgroup key={seder.id} label={seder.en}>
          {seder.masechtot.map((m) => (
            <option key={m.en} value={m.en}>
              {m.en}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Chevrusa/chabura both need one person's data to reach several others'
 * — an invite sent, accepted, and a "they learned today" signal delivered
 * — which is impossible on localStorage alone (it never leaves the one
 * browser it's in). This screen is the real, designed UI for both, built
 * ahead of the backend the same way Log In was: visible and inert rather
 * than hidden, with the blocker stated plainly.
 *
 * Each pairing/group carries its own masechet — scoped to one masechet at
 * a time, so the same person can be in several chevrusot or chaburot at
 * once, each on something different.
 */
export function ChevrusaScreen() {
  const [mode, setMode] = useState<Mode>("chevrusa");

  const [inviteValue, setInviteValue] = useState("");
  const [masechetValue, setMasechetValue] = useState("");

  const [chaburaName, setChaburaName] = useState("");
  const [chaburaMasechet, setChaburaMasechet] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);

  function updateMember(index: number, value: string) {
    setMemberEmails((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addMemberField() {
    setMemberEmails((prev) => [...prev, ""]);
  }

  function removeMemberField(index: number) {
    setMemberEmails((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  return (
    <div className="stage">
      <div className="panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="panel__title">Chevrusa</h1>
        <p className="panel__subtitle">
          Pair one-on-one, or start a chabura with a whole group — one masechet at a time, so you can
          be in several, each on something different. Know when the group has learned today — no
          streaks compared, no ranking, just "they showed up."
        </p>

        <div className="note-banner login-notice">
          Both need real accounts first — an invite has to reach someone else's account, which
          localStorage can't do. Under construction, same as Log In.
        </div>

        <div className="pill-row">
          <button
            className={"pill" + (mode === "chevrusa" ? " pill--active" : "")}
            onClick={() => setMode("chevrusa")}
          >
            Chevrusa (one partner)
          </button>
          <button
            className={"pill" + (mode === "chabura" ? " pill--active" : "")}
            onClick={() => setMode("chabura")}
          >
            Chabura (group)
          </button>
        </div>

        {mode === "chevrusa" ? (
          <>
            <label className="login-field">
              <span className="login-field__label">Invite by email</span>
              <input
                type="email"
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder="chevrusa@example.com"
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">Masechet to learn together</span>
              <MasechetSelect value={masechetValue} onChange={setMasechetValue} />
            </label>

            <button className="restart" disabled title="Accounts aren't connected yet">
              Send invite
            </button>

            <div className="chevrusa-section">
              <p className="chevrusa-section__label">Pending invites</p>
              <p className="chevrusa-empty">No pending invites.</p>
            </div>

            <div className="chevrusa-section">
              <p className="chevrusa-section__label">Your chevrusot</p>
              <p className="chevrusa-empty">
                Not paired with anyone yet. Each pairing you make will show its own masechet here —
                you can be in several at once, each on something different.
              </p>
            </div>
          </>
        ) : (
          <>
            <label className="login-field">
              <span className="login-field__label">Chabura name</span>
              <input
                type="text"
                value={chaburaName}
                onChange={(e) => setChaburaName(e.target.value)}
                placeholder="e.g. Tuesday Night Seder Nezikin"
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">Masechet to learn together</span>
              <MasechetSelect value={chaburaMasechet} onChange={setChaburaMasechet} />
            </label>

            <div className="login-field">
              <span className="login-field__label">Invite members by email</span>
              {memberEmails.map((email, i) => (
                <div className="chabura-member-row" key={i}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateMember(i, e.target.value)}
                    placeholder="member@example.com"
                  />
                  <button
                    type="button"
                    className="chabura-member-remove"
                    onClick={() => removeMemberField(i)}
                    disabled={memberEmails.length === 1}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="chabura-add-member" onClick={addMemberField}>
                + Add another member
              </button>
            </div>

            <button className="restart" disabled title="Accounts aren't connected yet">
              Start chabura
            </button>

            <div className="chevrusa-section">
              <p className="chevrusa-section__label">Pending chabura invites</p>
              <p className="chevrusa-empty">No pending invites.</p>
            </div>

            <div className="chevrusa-section">
              <p className="chevrusa-section__label">Your chaburot</p>
              <p className="chevrusa-empty">
                Not in any chabura yet. Each group you start or join will show here, with its own
                masechet and member list.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
