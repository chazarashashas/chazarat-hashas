import { useEffect, useState } from "react";
import { SEDARIM } from "../../data/shas";
import { fetchMishna } from "../../utils/sefaria";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useGroupContexts } from "../../utils/useGroupContexts";
import { localDateStr } from "../../utils/localDate";
import { shortDayLabel, type ChagStretch } from "../../utils/chagCalendar";
import type { MishnaRef } from "../../utils/dailyProjection";
import { buildPrintDays, itemsMeta, sequenceIndex, stretchName, textKey, type GroupPlan } from "./chagPrintModel";
import { ChagPrintDocument, type PrintLayout } from "./ChagPrintDocument";
import { NavIcon } from "../Icon/NavIcon";
import "./ChagPrint.css";

const PERAKIM_BY_MASECHET = new Map(SEDARIM.flatMap((s) => s.masechtot.map((m) => [m.en, m.perakim] as const)));

const LAYOUTS: { id: PrintLayout; label: string; sub: string }[] = [
  { id: "each", label: "A page each", sub: "one sheet per day, titled" },
  { id: "one", label: "All on one", sub: "every day on a single sheet" },
];

/**
 * Print before Shabbat or yom tov (CHAG-BRIEF.md, Feature A). Every day of
 * the stretch is named for what it is, holds exactly what the student's
 * own pace brings due, and the button says honestly how many sheets are
 * about to come out of their printer. Their own Daily Limmud is always
 * what prints; a chevrusa or chabura is an add-on they can tick.
 */
export function ChagPrintCard({ stretch }: { stretch: ChagStretch }) {
  const progress = useLearningProgress();
  const { getPerekNote } = usePerekNotes();
  const groupContexts = useGroupContexts();
  const today = localDateStr();

  const [selected, setSelected] = useState<Set<string>>(() => new Set(stretch.days.map((d) => d.date)));
  const [layout, setLayout] = useState<PrintLayout>("each");
  const [notes, setNotes] = useState(false);
  const [addedGroups, setAddedGroups] = useState<Set<string>>(new Set());
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [retryTick, setRetryTick] = useState(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);

  const learnedToday: MishnaRef[] = progress.completions
    .filter((c) => c.date === today && c.source === "app")
    .map(({ masechetEn, perek, mishnah }) => ({ masechetEn, perek, mishnah }))
    .sort((a, b) => sequenceIndex(a) - sequenceIndex(b));

  const groups: GroupPlan[] = groupContexts
    .filter((g) => addedGroups.has(g.masechetEn))
    .map((g) => ({
      label: g.label,
      masechetEn: g.masechetEn,
      start: progress.getMasechetPosition(g.masechetEn),
      pace: g.pace,
      totalPerakim: PERAKIM_BY_MASECHET.get(g.masechetEn) ?? 1,
    }));

  const days = buildPrintDays({
    stretch,
    today,
    position: progress.position,
    pace: progress.pace,
    learnedToday,
    groups,
    firstRange: progress.finishedShas ? null : [progress.rangeStart, progress.rangeEnd],
  });
  const chosen = days.filter((d) => selected.has(d.date));
  const needed = Array.from(new Set(chosen.flatMap((d) => d.tracks.flatMap((t) => t.items.map(textKey)))));
  const missing = needed.filter((k) => !(k in texts) && !failed.has(k));
  const mishnayotCount = chosen.reduce((n, d) => n + d.tracks.reduce((m, t) => m + t.items.length, 0), 0);
  const neededKey = needed.join("|");

  useEffect(() => {
    const todo = neededKey.split("|").filter((k) => k && !(k in texts));
    if (todo.length === 0) return;
    let cancelled = false;
    Promise.all(
      todo.map(async (k) => {
        const [masechetEn, perek, mishnah] = [k.slice(0, k.indexOf(".")), ...k.slice(k.indexOf(".") + 1).split(".").map(Number)] as [string, number, number];
        try {
          return [k, await fetchMishna(masechetEn, perek, mishnah)] as const;
        } catch {
          return [k, null] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const loaded: Record<string, string> = {};
      const missed = new Set<string>();
      for (const [k, t] of results) {
        if (t === null) missed.add(k);
        else loaded[k] = t;
      }
      setTexts((prev) => ({ ...prev, ...loaded }));
      setFailed(missed);
    });
    return () => {
      cancelled = true;
    };
    // texts is read for what's already here, not as a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neededKey, retryTick]);

  const ready = needed.length > 0 && missing.length === 0 && failed.size === 0;

  // The pages are laid out off-screen as soon as the text is here, so the
  // button can name the real sheet count before anyone presses it.
  useEffect(() => {
    if (!printing || pageCount === null) return;
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, [printing, pageCount]);

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  const cta =
    chosen.length === 0
      ? "Pick a day to print"
      : !ready
        ? failed.size > 0
          ? "Couldn't load the mishnayot"
          : "Getting the mishnayot ready…"
        : pageCount === null
          ? "Laying out the pages…"
          : `Print ${pageCount} ${pageCount === 1 ? "page" : "pages"}`;

  const meta =
    chosen.length === 0
      ? "Nothing selected."
      : `${mishnayotCount} ${mishnayotCount === 1 ? "mishnah" : "mishnayot"} · ${
          layout === "one" ? "days under their own headings" : "each day on its own sheet, with the greeting"
        } · Hebrew only${notes ? " · with your notes" : ""}`;

  const docProps = {
    days: chosen,
    layout,
    chag: stretch.chag,
    stretchTitle: stretch.chag ? stretchName(stretch).replace(/^\w+ days of /, "") : "Shabbat",
    texts,
    noteFor: notes ? getPerekNote : null,
  };

  return (
    <section className="card chag-card" aria-label="Print before yom tov">
      <div className="chag-card__head">
        <span className="chag-card__icon" aria-hidden="true">
          <NavIcon id="print" size={26} weight={1.7} />
        </span>
        <div>
          <h2 className="chag-card__title">{stretch.chag ? "Print before yom tov" : "Print before Shabbat"}</h2>
          <p className="chag-card__sub">{stretchName(stretch)}. Take the mishnayot with you on paper.</p>
        </div>
      </div>

      <div className="chag-card__days">
        {days.map((d) => {
          const on = selected.has(d.date);
          return (
            <button
              key={d.date}
              role="checkbox"
              aria-checked={on}
              className={"chag-day" + (on ? " chag-day--on" : "")}
              onClick={() => setSelected((s) => toggle(s, d.date))}
            >
              <span className="chag-box" aria-hidden="true">
                {on ? "✓" : ""}
              </span>
              <span className="chag-day__text">
                <span className="chag-day__title">My Mishnayot for {d.title}</span>
                <span className="chag-day__meta">
                  <span className="chag-day__date">{shortDayLabel(d.date)}</span>
                  {d.kind !== "erev" && <span className="chag-pill">{d.kind === "yomtov" ? "YOM TOV" : "SHABBAT"}</span>}
                  {d.tracks.map((t, i) =>
                    t.label && t.items.length === 0 ? null : (
                      <span key={i} className="chag-day__items">
                        {t.label ? `${t.label}: ` : ""}
                        {itemsMeta(t.items, t.perekUnit)}
                      </span>
                    ),
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="chag-seg" role="radiogroup" aria-label="Layout">
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={layout === l.id}
            className={"chag-seg__opt" + (layout === l.id ? " chag-seg__opt--on" : "")}
            onClick={() => setLayout(l.id)}
          >
            <span className="chag-seg__label">{l.label}</span>
            <span className="chag-seg__sub">{l.sub}</span>
          </button>
        ))}
      </div>

      <button role="checkbox" aria-checked={notes} className="chag-toggle" onClick={() => setNotes((v) => !v)}>
        <span className="chag-box" aria-hidden="true">
          {notes ? "✓" : ""}
        </span>
        Include my perek notes
      </button>
      {groupContexts.map((g) => (
        <button
          key={g.masechetEn}
          role="checkbox"
          aria-checked={addedGroups.has(g.masechetEn)}
          className="chag-toggle"
          onClick={() => setAddedGroups((s) => toggle(s, g.masechetEn))}
        >
          <span className="chag-box" aria-hidden="true">
            {addedGroups.has(g.masechetEn) ? "✓" : ""}
          </span>
          Also print {g.label}
        </button>
      ))}

      <button className="btn btn--primary btn--block chag-card__print" disabled={!ready || pageCount === null} onClick={() => setPrinting(true)}>
        {cta}
      </button>
      {failed.size > 0 ? (
        <p className="chag-card__meta">
          Check your connection, then{" "}
          <button className="chag-card__retry" onClick={() => (setFailed(new Set()), setRetryTick((t) => t + 1))}>
            try again
          </button>
          .
        </p>
      ) : (
        <p className="chag-card__meta">{meta}</p>
      )}

      {ready && chosen.length > 0 && <ChagPrintDocument {...docProps} measureOnly onPageCount={setPageCount} />}

      {printing && (
        <div className="print-overlay chag-print-preview">
          <div className="print-controls no-print">
            <h2>{cta}</h2>
            <div className="print-actions">
              <button className="restart print-btn" onClick={() => window.print()}>
                Print
              </button>
              <button className="print-close" onClick={() => setPrinting(false)}>
                Close
              </button>
            </div>
          </div>
          <ChagPrintDocument {...docProps} />
        </div>
      )}
    </section>
  );
}
