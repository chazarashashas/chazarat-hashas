import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { findMasechet } from "../../data/shas";
import { useName } from "../../i18n";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./PerekNoteModal.css";

interface PerekNoteModalProps {
  masechetEn: string;
  perek: number;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
  /** Jumps to the Mishna Notes screen, where every note (from wherever
      it was made) lives together. Optional so this modal still works on
      its own if a screen doesn't have navigation to offer. */
  onOpenNotes?: () => void;
}

/**
 * A quick way to add or edit one perek's personal note from wherever that
 * perek comes up (Mishna Quiz, eventually the Map) — without leaving the
 * screen for the full Mishna Notes notebook. Reads/writes the same
 * storage as Mishna Notes, so it's the same note either way.
 *
 * The note value and its persistence live in the parent screen (via
 * initialValue/onSave), not in a hook instance owned by this modal —
 * calling onSave and then immediately unmounting this component in the
 * same tick would otherwise race the localStorage-persisting effect right
 * out from under it.
 */
export function PerekNoteModal({
  masechetEn,
  perek,
  initialValue,
  onSave,
  onClose,
  onOpenNotes,
}: PerekNoteModalProps) {
  const { t } = useTranslation(["dailyLimmud", "common"]);
  const name = useName();
  const masechet = findMasechet(masechetEn);
  const [draft, setDraft] = useState(initialValue);
  useEscapeKey(onClose);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  function handleOpenNotes() {
    onSave(draft);
    onClose();
    onOpenNotes?.();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--sm note-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title={t("common:close")} aria-label={t("common:close")}>
          ✕
        </button>
        <p className="note-modal__label">
          <Trans
            t={t}
            i18nKey="modal.label"
            values={{ masechet: masechet ? name(masechet) : masechetEn, num: hebrewNumeral(perek) }}
            components={{ 1: <span dir="rtl" /> }}
          />
        </p>
        <textarea
          className="note-modal__textarea"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("modal.perekNotePlaceholder")}
        />
        <button className="restart" onClick={handleSave}>
          {t("modal.saveNote")}
        </button>
        {onOpenNotes && (
          <button className="note-modal__open-notes" onClick={handleOpenNotes}>
            {t("modal.openInNotes")}
          </button>
        )}
      </div>
    </div>
  );
}
