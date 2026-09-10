import type { ReactNode } from "react";
import { NavIcon } from "../Icon/NavIcon";
import "./GroupCreateCard.css";

/** The navy card that holds the whole create-a-group form —
    CHEVRUSA-CHABURA-BRIEF.md §2b's "navy is what you act on, cream is
    what already exists." Everything inside reads as cream insets on
    this dark ground rather than bordered boxes on the page. */
export function CreateCard({ heading, subtitle, children }: { heading: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="hero-card create-card">
      <p className="create-card__heading">{heading}</p>
      <p className="create-card__subtitle">{subtitle}</p>
      {children}
    </div>
  );
}

export function ShiurNotice({ text }: { text: string }) {
  return (
    <div className="create-card__shiur-notice">
      <p>{text}</p>
    </div>
  );
}

/** One labeled field, its control rendered as a cream inset — a plain
    text input, or (via `select`) a native select dressed as one with a
    line-art chevron so no native chrome shows through. */
export function FieldInset({
  label,
  hint,
  select,
  children,
}: {
  label: string;
  hint?: string;
  select?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="create-field">
      <p className="create-field__label">{label}</p>
      <div className="create-field__inset">
        {children}
        {select && <NavIcon id="chevron" size={15} weight={2.2} />}
      </div>
      {hint && <p className="create-field__hint">{hint}</p>}
    </div>
  );
}

interface PaceOption<T extends string> {
  value: T;
  label: string;
}

/** The pace picker inverted for the navy ground — chosen is cream,
    unlike every other segmented control in the app (which is always
    dark-on-cream), since this one lives inside the create card. */
export function PaceSegment<T extends string>({
  options,
  value,
  onChange,
  hint,
}: {
  options: PaceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hint: string;
}) {
  return (
    <div className="create-field">
      <p className="create-field__label">Pace</p>
      <div className="pace-segment">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={"pace-segment__btn" + (opt.value === value ? " pace-segment__btn--active" : "")}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="create-field__hint">{hint}</p>
    </div>
  );
}

/** One repeatable invite-by-email row — a cream inset plus a remove
    button, except the very first row (which can never be removed; a
    chevrusa has exactly one and never renders this repeated at all). */
export function InviteRepeaterRow({
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  placeholder: string;
}) {
  return (
    <div className="invite-repeater-row">
      <div className="create-field__inset invite-repeater-row__inset">
        <input type="email" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
      {onRemove && (
        <button className="invite-repeater-row__remove" onClick={onRemove} aria-label="Remove this address">
          <NavIcon id="close" size={14} weight={2.3} />
        </button>
      )}
    </div>
  );
}

export function CreateCta({ label, note, disabled, onClick }: { label: string; note: string; disabled?: boolean; onClick: () => void }) {
  return (
    <>
      <button className="create-cta" disabled={disabled} onClick={onClick}>
        {label}
      </button>
      <p className="create-cta__note">{note}</p>
    </>
  );
}

/** The lighter, cream "joining one instead?" card under the create
    card — deliberately quieter, since most people create rather than
    join (§2b). */
export function JoinByCodeCard({
  heading,
  value,
  onChange,
  onJoin,
  busy,
  joined,
}: {
  heading: string;
  value: string;
  onChange: (value: string) => void;
  onJoin: () => void;
  busy: boolean;
  joined: boolean;
}) {
  return (
    <div className="join-code-card">
      <div className="join-code-card__text">
        <p className="join-code-card__heading">{heading}</p>
        <p className="join-code-card__sub">Whoever started it can send you the code.</p>
      </div>
      <div className="join-code-card__action">
        <input
          className="join-code-card__input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
        />
        <button className="join-code-card__btn" disabled={busy || !value.trim()} onClick={onJoin}>
          {busy ? "…" : joined ? "Joined ✓" : "Join"}
        </button>
      </div>
    </div>
  );
}

/** A pending/sent invitation row — a queue, not a card, per §2b: a
    colored rule bar (brass = waiting on you, muted tan = waiting on
    them) instead of the accent borders used elsewhere. */
export function InviteQueueRow({
  waitingOnMe,
  title,
  detail,
  children,
}: {
  waitingOnMe: boolean;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="invite-queue-row">
      <span className={"invite-queue-row__rule" + (waitingOnMe ? " invite-queue-row__rule--mine" : "")} />
      <div className="invite-queue-row__text">
        <p className="invite-queue-row__title">{title}</p>
        <p className="invite-queue-row__detail">{detail}</p>
      </div>
      <div className="invite-queue-row__actions">{children}</div>
    </div>
  );
}
