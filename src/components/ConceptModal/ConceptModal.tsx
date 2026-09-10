import { useState } from "react";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./ConceptModal.css";

interface ConceptModalProps {
  masechetEn: string;
  perek: number;
  onSave: (title: string, note: string) => void;
  onClose: () => void;
  /** Jumps to the Mishna Notes screen's Concepts to Review list. Optional
      so this modal still works on its own without navigation to offer. */
  onOpenNotes?: () => void;
}

/** Flag a concept from this mishnah to revisit later — pulled out of Daily
    Limmud's always-open two-field form into a modal, the same treatment
    PerekNoteModal already gets, so the reading screen isn't carrying a
    form under every mishnah whether or not it's being used. */
export function ConceptModal({ masechetEn, perek, onSave, onClose, onOpenNotes }: ConceptModalProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  useEscapeKey(onClose);

  function handleSave() {
    if (!title.trim()) return;
    onSave(title.trim(), note.trim());
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--sm concept-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>
        <p className="concept-modal__label">
          {masechetEn} — Perek <span dir="rtl">{hebrewNumeral(perek)}</span>
        </p>
        <input
          className="concept-modal__input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Concept name"
        />
        <textarea
          className="concept-modal__textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What to remember about it"
        />
        <button className="restart" disabled={!title.trim()} onClick={handleSave}>
          Save concept
        </button>
        {onOpenNotes && (
          <button className="concept-modal__open-notes" onClick={onOpenNotes}>
            → View all concepts in Mishna Notes
          </button>
        )}
      </div>
    </div>
  );
}
