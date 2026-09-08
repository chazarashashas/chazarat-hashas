import { useState } from "react";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./CertificateView.css";

interface CertificateViewProps {
  /** The masechet completed, or null for a full-Shas siyum. */
  masechetEn: string | null;
  masechetHe?: string;
  defaultName: string;
  onClose: () => void;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * A printable siyum certificate — window.print() does the work, same as
 * Print Notes, so it renders correctly with no PDF library involved.
 * Triggered from My Siyumim for any masechet at 100%, or for finishing
 * all of Shas.
 */
export function CertificateView({ masechetEn, masechetHe, defaultName, onClose }: CertificateViewProps) {
  const [name, setName] = useState(defaultName);
  const isFullShas = masechetEn === null;
  useEscapeKey(onClose);

  return (
    <div className="cert-overlay">
      <div className="cert-controls no-print">
        <h2>Certificate of Siyum</h2>
        <label className="cert-name-field">
          <span>Name on certificate</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <div className="cert-actions">
          <button className="restart print-btn" onClick={() => window.print()}>
            Print
          </button>
          <button className="print-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="cert-page">
        <div className="cert-border">
          <img src="/logo/lockup-stacked.svg" alt="Chazarat Hashas" className="cert-logo" />
          <p className={"cert-subject" + (isFullShas ? " cert-subject--shas" : "")} dir="rtl">
            {isFullShas ? "סיום כל הש״ס" : `סיום מסכת ${masechetHe}`}
          </p>
          {!isFullShas && <p className="cert-subject-en">{masechetEn}</p>}
          <p className="cert-lead">completed by</p>
          <p className="cert-name">{name || "—"}</p>
          <span className="cert-rule" aria-hidden="true" />
          {!isFullShas && (
            <p className="cert-quote" dir="rtl">
              הַדְרָן עֲלָךְ {masechetHe}
            </p>
          )}
          <p className="cert-date">{todayFormatted()}</p>
        </div>
      </div>
    </div>
  );
}
