import { useState } from "react";
import { shortDayLabel, type ChagStretch } from "../../utils/chagCalendar";
import { sequenceItems, upcomingDayRanges, type MishnaRef } from "../../utils/dailyProjection";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { itemsMeta, stretchName } from "./chagPrintModel";
import "./ChagPrint.css";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

function word(n: number): string {
  return WORDS[n] ?? String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Berachot 4:5, 4:6, 4:7 and 5:1" / "Shabbat perek 2 and perek 3" */
function listItems(items: MishnaRef[], perekUnit: boolean): string {
  const parts = perekUnit
    ? itemsMeta(items, true).split(" · ").slice(0, -1)
    : itemsMeta(items, false).split(" · ");
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

interface Props {
  stretch: ChagStretch;
  onClose: () => void;
  onCatchUp: () => void;
}

/**
 * The first open after Shabbat or yom tov (CHAG-BRIEF.md, Feature B). The
 * streak is already safe — that is a statement, not a prompt. What follows
 * is only about the learning: what came due, reconciled against what
 * useLearningProgress says was due, not against anything printed.
 */
export function ChagReturnModal({ stretch, onClose, onCatchUp }: Props) {
  const progress = useLearningProgress();
  useEscapeKey(onClose);
  const perekUnit = progress.pace.unit === "perakim";
  const ranges = upcomingDayRanges(progress.position, progress.pace, stretch.days.length);
  const due = stretch.days
    .map((d, i) => ({ date: d.date, title: capitalize(d.title), items: ranges[i] ? sequenceItems(ranges[i]) : [] }))
    .filter((d) => d.items.length > 0);
  const all = due.flatMap((d) => d.items);
  const count = perekUnit ? new Set(all.map((m) => `${m.masechetEn}.${m.perek}`)).size : all.length;
  const unit = perekUnit ? (count === 1 ? "perek" : "perakim") : count === 1 ? "mishnah" : "mishnayot";
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const streak = progress.streak.current;

  function markAll(days: typeof due) {
    progress.markDaysLearned(days);
    onClose();
  }

  function catchUp() {
    const last = ranges[due.length - 1];
    if (last) progress.queueCatchUp(last[1]);
    onClose();
    onCatchUp();
  }

  const allLabel = count === 1 ? "Yes — mark it learned" : count === 2 ? "Yes — mark both learned" : `Yes — mark all ${word(count)} learned`;

  return (
    <div className="modal-scrim modal-scrim--top">
      <div className="modal modal--md chag-return" role="dialog" aria-label="Your streak is safe">
        <div className="chag-return__head">
          <span className="chag-tile chag-tile--good" aria-hidden="true">
            ✓
          </span>
          <div>
            <h2 className="chag-return__title">Your streak is safe</h2>
            <p className="chag-return__sub">
              {stretchName(stretch)}
              {streak > 0 ? ` · ${streak} ${streak === 1 ? "day" : "days"} held` : ""}
            </p>
          </div>
        </div>

        {due.length === 0 ? (
          <button className="btn btn--primary btn--block chag-return__done" onClick={onClose}>
            Back to learning
          </button>
        ) : (
          <>
            <p className="chag-return__lead">
              {capitalize(word(count))} {unit} came due while you were away.
            </p>
            <div className="chag-return__due">
              {due.map((d) => (
                <div key={d.date}>
                  <div className="chag-return__day">
                    <span className="chag-return__day-title">{d.title}</span>
                    <span className="chag-return__day-date">{shortDayLabel(d.date)}</span>
                  </div>
                  <div className="chag-return__chips">
                    {(perekUnit ? itemsMeta(d.items, true).split(" · ").slice(0, -1) : itemsMeta(d.items, false).split(" · ")).map((c) => (
                      <span key={c} className="chag-return__chip">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!choosing ? (
              <div className="chag-return__options">
                <button className="chag-option" onClick={() => markAll(due)}>
                  <span className="chag-tile chag-tile--good" aria-hidden="true">
                    ✓
                  </span>
                  <span className="chag-option__text">
                    <span className="chag-option__title">{allLabel}</span>
                    <span className="chag-option__sub">{listItems(all, perekUnit)}</span>
                  </span>
                </button>
                {due.length > 1 && (
                  <button className="chag-option" onClick={() => setChoosing(true)}>
                    <span className="chag-tile chag-tile--brass" aria-hidden="true">
                      ~
                    </span>
                    <span className="chag-option__text">
                      <span className="chag-option__title">Some of them — let me choose</span>
                    </span>
                  </button>
                )}
                <button className="chag-option" onClick={catchUp}>
                  <span className="chag-tile chag-tile--navy" aria-hidden="true">
                    →
                  </span>
                  <span className="chag-option__text">
                    <span className="chag-option__title">Not yet — let's catch up now</span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="chag-return__options">
                {due.map((d) => {
                  const on = picked.has(d.date);
                  return (
                    <button
                      key={d.date}
                      role="checkbox"
                      aria-checked={on}
                      className={"chag-day" + (on ? " chag-day--on" : "")}
                      onClick={() =>
                        setPicked((s) => {
                          const next = new Set(s);
                          if (next.has(d.date)) next.delete(d.date);
                          else next.add(d.date);
                          return next;
                        })
                      }
                    >
                      <span className="chag-box" aria-hidden="true">
                        {on ? "✓" : ""}
                      </span>
                      <span className="chag-day__text">
                        <span className="chag-day__title">{d.title}</span>
                        <span className="chag-day__meta">
                          <span className="chag-day__items">{itemsMeta(d.items, perekUnit)}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
                <button
                  className="btn btn--primary btn--block"
                  disabled={picked.size === 0}
                  onClick={() => markAll(due.filter((d) => picked.has(d.date)))}
                >
                  Mark {picked.size === 0 ? "them" : picked.size === due.length ? "all" : "these"} learned
                </button>
                <button className="chag-return__back" onClick={() => setChoosing(false)}>
                  Back
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
