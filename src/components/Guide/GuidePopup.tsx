import { useEscapeKey } from "../../utils/useEscapeKey";
import { readVersionsSeen, licenseDeedUrl } from "../../utils/translation";
import { GuideScreen } from "./GuideScreen";
import "./GuidePopup.css";

interface GuidePopupProps {
  onClose: () => void;
  onNavigate: (id: string) => void;
}

/** The guide itself, in a popup — not a link to the /guide screen. Reading
    a step's own "Explore Shas →" button still navigates there for real
    (and closes the popup on the way), since the whole point of those
    buttons is to actually take you to the feature they name. */
export function GuidePopup({ onClose, onNavigate }: GuidePopupProps) {
  useEscapeKey(onClose);

  function handleNavigate(id: string) {
    onClose();
    onNavigate(id);
  }

  const versionsInUse = readVersionsSeen();

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--lg guide-popup" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>
        <GuideScreen bare onNavigate={handleNavigate} />

        {versionsInUse.length > 0 && (
          <p className="translation-notice">
            English translations, where shown, are pulled live from{" "}
            <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer">
              Sefaria
            </a>{" "}
            and belong to their own translators, each under their own license — English is always
            optional and off by default. So far on this device:{" "}
            {versionsInUse.map((v, i) => (
              <span key={v.versionTitle}>
                {i > 0 && ", "}
                {v.versionTitle} (
                {licenseDeedUrl(v.license) ? (
                  <a href={licenseDeedUrl(v.license)!} target="_blank" rel="noopener noreferrer">
                    {v.license}
                  </a>
                ) : (
                  v.license
                )}
                )
              </span>
            ))}
            .
          </p>
        )}
      </div>
    </div>
  );
}
