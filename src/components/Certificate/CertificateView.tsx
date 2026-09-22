import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../i18n";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./CertificateView.css";

interface CertificateViewProps {
  /** The masechet completed, or null for a full-Shas siyum. */
  masechetEn: string | null;
  masechetHe?: string;
  defaultName: string;
  onClose: () => void;
}

function todayFormatted(locale: string | undefined): string {
  return new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * A printable siyum certificate — window.print() does the work, same as
 * Print Notes, so it renders correctly with no PDF library involved.
 * Triggered from My Siyumim for any masechet at 100%, or for finishing
 * all of Shas.
 */
export function CertificateView({ masechetEn, masechetHe, defaultName, onClose }: CertificateViewProps) {
  const { t, i18n } = useTranslation(["siyumim", "common"]);
  const locale = useLocale();
  const [name, setName] = useState(defaultName);
  const isFullShas = masechetEn === null;
  useEscapeKey(onClose);

  return (
    <div className="cert-overlay">
      <div className="cert-controls no-print">
        <h2>{t("certificate.title")}</h2>
        <label className="cert-name-field">
          <span>{t("certificate.nameLabel")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("certificate.namePlaceholder")} />
        </label>
        <div className="cert-actions">
          <button className="restart print-btn" onClick={() => window.print()}>
            {t("common:print")}
          </button>
          <button className="print-close" onClick={onClose}>
            {t("common:close")}
          </button>
        </div>
      </div>

      <div className="cert-page">
        <div className="cert-border">
          <img src="/logo/lockup-stacked.svg" alt={t("certificate.logoAlt")} className="cert-logo" />
          <p className={"cert-subject" + (isFullShas ? " cert-subject--shas" : "")} dir="rtl">
            {isFullShas ? "סיום כל הש״ס" : `סיום מסכת ${masechetHe}`}
          </p>
          {/* The Hebrew line above already names the masechet — the
              Hebrew interface shows it once. */}
          {!isFullShas && i18n.language !== "he" && <p className="cert-subject-en">{masechetEn}</p>}
          <p className="cert-lead">{t("certificate.completedBy")}</p>
          <p className="cert-name">{name || "—"}</p>
          <span className="cert-rule" aria-hidden="true" />
          {!isFullShas && (
            <p className="cert-quote" dir="rtl">
              הַדְרָן עֲלָךְ {masechetHe}
            </p>
          )}
          <p className="cert-date">{todayFormatted(locale)}</p>
        </div>
      </div>
    </div>
  );
}
