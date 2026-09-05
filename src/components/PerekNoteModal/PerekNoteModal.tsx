import { useState } from "react";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
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
  const [draft, setDraft] = useState(initialValue);

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
    <div className="scrim note-modal-scrim" onClick={onClose}>
      <div className="popup note-modal" onClick={(e) => e.stopPropagation()}>
        <button className="note-modal__close" onClick={onClose} title="Close">
          ✕
        </button>
        <p className="note-modal__label">
          {masechetEn} — Perek <span dir="rtl">{hebrewNumeral(perek)}</span>
        </p>
        <textarea
          className="note-modal__textarea"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`My name or memory cue for this perek, e.g. "the laws of Zimmun"`}
        />
        <button className="restart" onClick={handleSave}>
          Save note
        </button>
        {onOpenNotes && (
          <button className="note-modal__open-notes" onClick={handleOpenNotes}>
            → Open in Mishna Notes
          </button>
        )}
      </div>
    </div>
  );
}
