import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { useDirection } from "../../i18n";
import type { ChagStretch } from "../../utils/chagCalendar";
import { sequenceItems, upcomingDayRanges, type MishnaRef } from "../../utils/dailyProjection";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { dayTitle, itemsMeta, shortDay, stretchName } from "./chagPrintModel";
import "./ChagPrint.css";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

function word(n: number): string {
  // Hebrew counts in digits: its number words change with gender.
  if (i18n.language === "he") return String(n);
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
  return parts.length <= 1
    ? parts.join("")
    : i18n.t("print:meta.and", { list: parts.slice(0, -1).join(", "), last: parts[parts.length - 1] });
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
  const { t } = useTranslation(["print", "common"]);
  const dir = useDirection();
  useEscapeKey(onClose);
  const perekUnit = progress.pace.unit === "perakim";
  const ranges = upcomingDayRanges(progress.position, progress.pace, stretch.days.length);
  const due = stretch.days
    .map((d, i) => ({ date: d.date, title: capitalize(dayTitle(d.title)), items: ranges[i] ? sequenceItems(ranges[i]) : [] }))
    .filter((d) => d.items.length > 0);
  const all = due.flatMap((d) => d.items);
  const count = perekUnit ? new Set(all.map((m) => `${m.masechetEn}.${m.perek}`)).size : all.length;
  const dueKey = perekUnit ? (count === 1 ? "duePerek" : "duePerakim") : count === 1 ? "dueMishnah" : "dueMishnayot";
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

  const allLabel = count === 1 ? t("return.markIt") : count === 2 ? t("return.markBoth") : t("return.markAllCount", { words: word(count) });

  return (
    <div className="modal-scrim modal-scrim--top">
      <div className="modal modal--md chag-return" role="dialog" aria-label={t("return.title")}>
        <div className="chag-return__head">
          <span className="chag-tile chag-tile--good" aria-hidden="true">
            ✓
          </span>
          <div>
            <h2 className="chag-return__title">{t("return.title")}</h2>
            <p className="chag-return__sub">
              {stretchName(stretch)}
              {streak > 0 ? ` · ${t("return.daysHeld", { count: streak })}` : ""}
            </p>
          </div>
        </div>

        {due.length === 0 ? (
          <button className="btn btn--primary btn--block chag-return__done" onClick={onClose}>
            {t("return.backToLearning")}
          </button>
        ) : (
          <>
            <p className="chag-return__lead">
              {t(`return.${dueKey}`, { words: capitalize(word(count)) })}
            </p>
            <div className="chag-return__due">
              {due.map((d) => (
                <div key={d.date}>
                  <div className="chag-return__day">
                    <span className="chag-return__day-title">{d.title}</span>
                    <span className="chag-return__day-date">{shortDay(d.date)}</span>
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
                      <span className="chag-option__title">{t("return.letMeChoose")}</span>
                    </span>
                  </button>
                )}
                <button className="chag-option" onClick={catchUp}>
                  <span className="chag-tile chag-tile--navy" aria-hidden="true">
                    {dir === "rtl" ? "←" : "→"}
                  </span>
                  <span className="chag-option__text">
                    <span className="chag-option__title">{t("return.catchUp")}</span>
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
                  {picked.size === 0 ? t("return.markThem") : picked.size === due.length ? t("return.markAll") : t("return.markThese")}
                </button>
                <button className="chag-return__back" onClick={() => setChoosing(false)}>
                  {t("common:back")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
