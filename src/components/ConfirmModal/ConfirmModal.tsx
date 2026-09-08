import { useEffect, useRef, useState } from "react";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./ConfirmModal.css";

interface ConfirmModalProps {
  title: string;
  body?: string;
  /** The icon glyph shown above the title — ↺ reads as "reset", but a
      caller doing something else (account deletion, leaving a group)
      should pass its own. */
  icon?: string;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  /** Red styling for the confirm button — used for anything that can't
      be undone once it runs. */
  destructive?: boolean;
  /** When set, the confirm button stays disabled until the typed value
      matches this exactly (case-sensitive) — the account-deletion case,
      where a click alone is too easy to land by accident. */
  typeToConfirm?: string;
  /** An error from the last confirm attempt — rendered inside the modal
      so it's visible while retrying, not left behind the scrim. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** One shared confirm dialog for every destructive or hard-to-undo
    action in the app — replaces two near-identical, separately
    maintained copies (LoginScreen's ResetConfirmModal and AdminScreen's
    AdminResetConfirmModal) that declared the same CSS class in two
    files, silently colliding depending on import order, and neither of
    which was keyboard-dismissable. Calls useEscapeKey, returns focus to
    whatever triggered it on close, and traps Tab within itself. */
export function ConfirmModal({
  title,
  body,
  icon = "↺",
  confirmLabel,
  busyLabel,
  busy = false,
  destructive = false,
  typeToConfirm,
  error,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [typedValue, setTypedValue] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEscapeKey(() => {
    if (!busy) onCancel();
  });

  // Returns focus to whatever had it before this opened (the button that
  // triggered the modal) once it closes, rather than dropping focus to
  // the document body.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    return () => {
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, []);

  useEffect(() => {
    const first = popupRef.current?.querySelector<HTMLElement>("input, button");
    first?.focus();
  }, []);

  function handleTabTrap(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !popupRef.current) return;
    const focusable = Array.from(popupRef.current.querySelectorAll<HTMLElement>("input, button")).filter(
      (el) => !el.hasAttribute("disabled"),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const confirmDisabled = busy || (typeToConfirm !== undefined && typedValue !== typeToConfirm);

  return (
    <div className="scrim" onClick={busy ? undefined : onCancel}>
      <div
        className="popup confirm-modal"
        ref={popupRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleTabTrap}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        {icon && (
          <p className="popup__mark" aria-hidden="true">
            {icon}
          </p>
        )}
        <p className="popup__text">{title}</p>
        {body && <p className="confirm-modal__body">{body}</p>}
        {typeToConfirm !== undefined && (
          <input
            className="confirm-modal__input"
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={typeToConfirm}
            disabled={busy}
          />
        )}
        <button
          className={"restart confirm-modal__confirm" + (destructive ? " confirm-modal__confirm--danger" : "")}
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          {busy ? (busyLabel ?? "Working…") : confirmLabel}
        </button>
        <button className="confirm-modal__cancel" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        {error && (
          <p className="confirm-modal__error" dir="ltr">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
