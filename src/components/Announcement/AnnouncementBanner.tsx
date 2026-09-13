import "./AnnouncementBanner.css";

/** The message an admin puts at the top of the app for everyone. With no
    onDismiss it is a preview (the admin panel's), so there is no close. */
export function AnnouncementBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="announcement" role="status">
      <p className="announcement__text">{message}</p>
      {onDismiss && (
        <button className="icon-btn announcement__close" onClick={onDismiss} title="Close" aria-label="Close message">
          ✕
        </button>
      )}
    </div>
  );
}
