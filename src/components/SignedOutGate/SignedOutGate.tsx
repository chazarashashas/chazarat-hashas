import type { ReactNode } from "react";
import "./SignedOutGate.css";

/** The right-arrow line-art glyph used by every primary CTA in this
    file — inline, matching the sidebar icons, never an emoji. */
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

interface KindOption<T extends string> {
  value: T;
  label: string;
  note: string;
}

/** Chabura's internal two-way choice — shown both signed out (to preview
    each kind before choosing) and signed in (to actually pick one when
    starting a chabura). Same tabs, same styling, in both places. */
export function KindTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: KindOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="gate2-kind-tabs">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={"gate2-kind-tab" + (active ? " gate2-kind-tab--active" : "")}
            onClick={() => onChange(opt.value)}
          >
            <span className="gate2-kind-tab__label">{opt.label}</span>
            <span className={"gate2-kind-tab__note" + (active ? " gate2-kind-tab__note--active" : "")}>{opt.note}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FactCard({ head, body, children }: { head: string; body: string; children?: ReactNode }) {
  return (
    <div className="gate2-fact">
      <p className="gate2-fact__head">{head}</p>
      <p className="gate2-fact__body">{body}</p>
      {children && <div className="gate2-fact__preview">{children}</div>}
    </div>
  );
}

export function InviteRowPreview({ email, pillLabel }: { email: string; pillLabel: string }) {
  return (
    <div className="gate2-invite-row">
      <span className="gate2-invite-row__email" dir="ltr">
        {email}
      </span>
      <span className="gate2-invite-row__pill">{pillLabel}</span>
    </div>
  );
}

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekDotsPreview({ pattern, note }: { pattern: boolean[]; note: string }) {
  const label = `Learned ${pattern.filter(Boolean).length} of the last ${pattern.length} days`;
  return (
    <div className="gate2-week" role="img" aria-label={label}>
      {pattern.map((on, i) => (
        <div className="gate2-week__col" key={i} aria-hidden="true">
          <span className={"gate2-week__dot" + (on ? " gate2-week__dot--on" : "")} />
          <span className="gate2-week__day">{WEEK_DAYS[i]}</span>
        </div>
      ))}
      <span className="gate2-week__note">{note}</span>
    </div>
  );
}

export function NudgeCardPreview({ from, text }: { from: string; text: string }) {
  return (
    <div className="gate2-nudge-card">
      <p className="gate2-nudge-card__from">{from}</p>
      <p className="gate2-nudge-card__text">"{text}"</p>
    </div>
  );
}

export function NoteCardPreview({
  author,
  source,
  body,
  replyAuthor,
  reply,
}: {
  author: string;
  source: string;
  body: string;
  replyAuthor: string;
  reply: string;
}) {
  return (
    <div className="gate2-note-card">
      <div className="gate2-note-card__head">
        <span className="gate2-note-card__author">{author}</span>
        <span className="gate2-note-card__source">{source}</span>
        <span className="gate2-note-card__edit">Edit</span>
      </div>
      <p className="gate2-note-card__body">{body}</p>
      <div className="gate2-note-card__reply">
        <span className="gate2-note-card__reply-author">{replyAuthor}</span> {reply}
      </div>
      <span className="gate2-note-card__comment">Add a comment</span>
    </div>
  );
}

export interface RosterRow {
  name: string;
  learned: boolean;
  value: string;
  valueMuted?: boolean;
}

export function RosterPreview({ rows }: { rows: RosterRow[] }) {
  return (
    <div className="gate2-roster">
      {rows.map((r) => (
        <div className="gate2-roster__row" key={r.name}>
          <span className={"gate2-roster__dot" + (r.learned ? " gate2-roster__dot--on" : "")} aria-hidden="true" />
          <span className="gate2-roster__name">
            {r.name}
            <span className="gate2-roster__sr"> — {r.learned ? "learned today" : "not yet today"}</span>
          </span>
          <span className={"gate2-roster__val" + (r.valueMuted ? " gate2-roster__val--muted" : "")}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function BundlePreview({ chips, onSend }: { chips: { text: string; hue: string }[]; onSend?: () => void }) {
  return (
    <div className="gate2-bundle">
      <div className="gate2-bundle__chips">
        {chips.map((c) => (
          <span key={c.text} className="gate2-bundle__chip" style={{ background: c.hue }}>
            {c.text}
          </span>
        ))}
      </div>
      <div className="gate2-bundle__row">
        <button type="button" className="gate2-bundle__send" onClick={onSend}>
          Send today's learning
        </button>
        <span className="gate2-bundle__hint">one send a day</span>
      </div>
    </div>
  );
}

export function GateCTA({
  heading,
  body,
  onAction,
}: {
  heading: string;
  body: string;
  onAction: () => void;
}) {
  return (
    <div className="gate2-cta">
      <div className="gate2-cta__text">
        <p className="gate2-cta__heading">{heading}</p>
        <p className="gate2-cta__body">{body}</p>
      </div>
      <button className="gate2-cta__btn" onClick={onAction}>
        <span>Log in or sign up</span>
        <ArrowIcon />
      </button>
    </div>
  );
}
