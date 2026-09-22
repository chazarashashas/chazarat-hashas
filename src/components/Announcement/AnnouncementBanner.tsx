import { useTranslation } from "react-i18next";
import "./AnnouncementBanner.css";

/** The message an admin puts at the top of the app for everyone. With no
    onDismiss it is a preview (the admin panel's), so there is no close. */
export function AnnouncementBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const { t } = useTranslation(["shell", "common"]);
  return (
    <div className="announcement" role="status">
      <p className="announcement__text">{message}</p>
      {onDismiss && (
        <button
          className="icon-btn announcement__close"
          onClick={onDismiss}
          title={t("common:close")}
          aria-label={t("announcement.closeLabel")}
        >
          ✕
        </button>
      )}
    </div>
  );
}
