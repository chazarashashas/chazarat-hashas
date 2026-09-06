import { useState } from "react";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./PerekNotebookModal.css";

interface PerekNotebookModalProps {
  masechetEn: string;
  perek: number;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

/**
 * The open-ended notebook page for one perek — separate from the short
 * memorable name Mishna Notes asks for inline. Deliberately not shown by
 * default anywhere: it only opens when the talmid chooses to, via a small
 * "Notebook" trigger next to that perek's name field.
 */
export function PerekNotebookModal({ masechetEn, perek, initialValue, onSave, onClose }: PerekNotebookModalProps) {
  const [draft, setDraft] = useState(initialValue);
  useEscapeKey(onClose);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <div className="scrim notebook-modal-scrim" onClick={onClose}>
      <div className="popup notebook-modal" onClick={(e) => e.stopPropagation()}>
        <button className="notebook-modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>
        <p className="notebook-modal__label">
          Notebook — {masechetEn}, Perek <span dir="rtl">{hebrewNumeral(perek)}</span>
        </p>
        <p className="notebook-modal__hint">
          Anything you want to keep about this perek — a question, a source, a summary. Separate from
          the short name you gave it on Mishna Notes.
        </p>
        <textarea
          className="notebook-modal__textarea"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write as much as you want…"
        />
        <button className="restart" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
