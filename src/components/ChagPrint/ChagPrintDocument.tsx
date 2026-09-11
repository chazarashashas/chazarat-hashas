import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "../BrandMark";
import { getPerekName } from "../../data/perekInfo";
import { greetingFor, longDayLabel, shortDayLabel, type ChagId } from "../../utils/chagCalendar";
import { textKey, type PrintDay } from "./chagPrintModel";
import { ChagMotif } from "./ChagMotif";

export type PrintLayout = "each" | "one";

interface Props {
  days: PrintDay[];
  layout: PrintLayout;
  chag: ChagId | null;
  /** "Rosh Hashana", "Shabbat" — the all-on-one page's own title. */
  stretchTitle: string;
  texts: Record<string, string>;
  /** The student's own name for a perek, when they chose to include notes. */
  noteFor: ((masechetEn: string, perek: number) => string | null) | null;
  /** Measure only: lay the pages out off-screen and report how many. */
  measureOnly?: boolean;
  onPageCount?: (pages: number) => void;
}

/** One unbreakable piece of a page: a mishnah, together with anything
    that must not be stranded at the foot of a sheet above it (a perek
    heading, a track label, the day's own heading on an all-on-one page). */
interface Unit {
  key: string;
  dayIndex: number;
  node: ReactNode;
}

type PageHead = { kind: "full"; dayIndex: number | null } | { kind: "cont"; dayIndex: number | null };

interface Page {
  head: PageHead;
  units: Unit[];
  pageOf: [number, number];
}

function buildUnits(days: PrintDay[], layout: PrintLayout, texts: Record<string, string>, noteFor: Props["noteFor"]): Unit[] {
  const units: Unit[] = [];
  days.forEach((day, dayIndex) => {
    let lead: ReactNode[] = [];
    if (layout === "one") {
      lead.push(
        <div key="dayhead" className="chag-page__dayhead">
          <p className="chag-page__daytitle">My Mishnayot for {day.title}</p>
          <p className="chag-page__date">{longDayLabel(day.date)}</p>
        </div>,
      );
    }
    const empty = day.tracks.every((t) => t.items.length === 0);
    if (empty) {
      units.push({ key: `${day.date}-empty`, dayIndex, node: [...lead, <p key="e" className="chag-page__empty">Nothing left to learn this day.</p>] });
      return;
    }
    day.tracks.forEach((track, ti) => {
      if (track.items.length === 0) return;
      if (track.label) lead.push(<p key={`t${ti}`} className="chag-page__track">{track.label}</p>);
      let lastPerek = "";
      track.items.forEach((m, i) => {
        const perekKey = `${m.masechetEn}.${m.perek}`;
        const newPerek = perekKey !== lastPerek;
        lastPerek = perekKey;
        const note = newPerek && noteFor ? noteFor(m.masechetEn, m.perek)?.trim() : null;
        const pieces: ReactNode[] = [...lead];
        lead = [];
        if (track.perekUnit && newPerek) {
          const name = getPerekName(m.masechetEn, m.perek);
          pieces.push(
            <div key="ph" className="chag-page__perek">
              <span className="chag-page__perek-title">
                {m.masechetEn} perek {m.perek}
              </span>
              {name && (
                <span className="chag-page__perek-name" lang="he" dir="rtl">
                  {name}
                </span>
              )}
            </div>,
          );
        }
        if (note) {
          pieces.push(
            <p key="note" className="chag-page__note">
              {track.perekUnit ? "Your note: " : `Your note on ${m.masechetEn} perek ${m.perek}: `}
              {note}
            </p>,
          );
        }
        pieces.push(
          <div key="m" className="chag-page__mishnah">
            <div className="chag-page__ref-row">
              <span className="chag-page__ref">{track.perekUnit ? `${m.perek}:${m.mishnah}` : `${m.masechetEn} ${m.perek}:${m.mishnah}`}</span>
              <span className="chag-page__count">
                {i + 1} of {track.items.length}
              </span>
            </div>
            <p className="chag-page__text" lang="he" dir="rtl">
              {texts[textKey(m)] ?? ""}
            </p>
          </div>,
        );
        units.push({ key: `${day.date}-${ti}-${textKey(m)}`, dayIndex, node: pieces });
      });
    });
  });
  return units;
}

function FullHeader({ chag, title, date }: { chag: ChagId | null; title: string; date: string }) {
  return (
    <header className="chag-page__head">
      <BrandMark variant="outline" className="chag-page__mark" />
      <ChagMotif chag={chag} />
      <p className="chag-page__greeting" lang="he" dir="rtl">
        {greetingFor(chag)}
      </p>
      <p className="chag-page__title">{title}</p>
      <p className="chag-page__date">{date}</p>
    </header>
  );
}

function ContHeader({ title, pageOf }: { title: string; pageOf: [number, number] }) {
  return (
    <header className="chag-page__cont">
      <span>{title}</span>
      <span>
        page {pageOf[0]} of {pageOf[1]}
      </span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="chag-page__foot">
      <span>chazarashashas.org</span>
      <span className="chag-page__foot-he" lang="he" dir="rtl">
        חזרת הש״ס
      </span>
    </footer>
  );
}

/**
 * The printed mishnayot (CHAG-BRIEF.md "The printed page"). Type never
 * shrinks: the pages are laid out here, by measuring every piece at the
 * page's real width, so a day that needs three sheets gets three — each
 * continuation with only the day's title and "page 2 of 3" — and the
 * card's button can say exactly how many sheets are about to print.
 */
export function ChagPrintDocument({ days, layout, chag, stretchTitle, texts, noteFor, measureOnly, onPageCount }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Page[] | null>(null);
  const units = buildUnits(days, layout, texts, noteFor);
  const signature = JSON.stringify([days.map((d) => d.date + d.tracks.map((t) => t.items.map(textKey).join()).join()), layout, Object.keys(texts).length, !!noteFor]);

  const fullTitle = (dayIndex: number | null) => (dayIndex === null ? `My Mishnayot for ${stretchTitle}` : `My Mishnayot for ${days[dayIndex].title}`);
  const fullDate = (dayIndex: number | null) =>
    dayIndex === null
      ? days.length > 1
        ? `${shortDayLabel(days[0].date)} – ${longDayLabel(days[days.length - 1].date)}`
        : longDayLabel(days[0].date)
      : longDayLabel(days[dayIndex].date);

  useLayoutEffect(() => {
    let cancelled = false;
    const layOut = () => {
      const root = measureRef.current;
      if (!root || cancelled) return;
      const px = (sel: string) => (root.querySelector(sel) as HTMLElement | null)?.offsetHeight ?? 0;
      const pageH = px(".chag-measure__page");
      const footH = px(".chag-measure__foot");
      const contH = px(".chag-measure__cont");
      const unitH = Array.from(root.querySelectorAll<HTMLElement>(".chag-measure__unit")).map((el) => el.offsetHeight + 1);
      const fullH = (i: number | null) => px(`.chag-measure__full-${i === null ? "all" : i}`);
      const room = pageH - footH;

      const out: Page[] = [];
      const pack = (dayIndex: number | null, unitIdx: number[], startFull: boolean) => {
        let cur: Page = { head: { kind: startFull ? "full" : "cont", dayIndex }, units: [], pageOf: [1, 1] };
        let used = startFull ? fullH(dayIndex) : contH;
        for (const ui of unitIdx) {
          if (cur.units.length > 0 && used + unitH[ui] > room) {
            out.push(cur);
            cur = { head: { kind: "cont", dayIndex }, units: [], pageOf: [1, 1] };
            used = contH;
          }
          cur.units.push(units[ui]);
          used += unitH[ui];
        }
        out.push(cur);
      };
      if (layout === "each") {
        days.forEach((_, d) => {
          const first = out.length;
          pack(d, units.flatMap((u, i) => (u.dayIndex === d ? [i] : [])), true);
          const n = out.length - first;
          for (let k = first; k < out.length; k++) out[k].pageOf = [k - first + 1, n];
        });
      } else {
        pack(null, units.map((_, i) => i), true);
        out.forEach((p, k) => (p.pageOf = [k + 1, out.length]));
      }
      setPages(out);
      onPageCount?.(out.length);
    };
    layOut();
    // Hebrew set in Frank Ruhl Libre is noticeably taller than its
    // fallback; lay out again once the real fonts are in.
    document.fonts?.ready.then(layOut);
    return () => {
      cancelled = true;
    };
    // `signature` stands in for days/layout/texts/noteFor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <>
      <div ref={measureRef} className="chag-measure" aria-hidden="true">
        <div className="chag-page chag-measure__page" />
        <div className="chag-page__foot-wrap chag-measure__foot">
          <Footer />
        </div>
        <div className="chag-measure__cont">
          <ContHeader title="x" pageOf={[2, 3]} />
        </div>
        {layout === "each" ? (
          days.map((d, i) => (
            <div key={d.date} className={`chag-measure__full-${i}`}>
              <FullHeader chag={chag} title={fullTitle(i)} date={fullDate(i)} />
            </div>
          ))
        ) : (
          <div className="chag-measure__full-all">
            <FullHeader chag={chag} title={fullTitle(null)} date={fullDate(null)} />
          </div>
        )}
        <div className="chag-page__body">
          {units.map((u) => (
            <div key={u.key} className="chag-page__unit chag-measure__unit">
              {u.node}
            </div>
          ))}
        </div>
      </div>

      {!measureOnly &&
        pages?.map((p, i) => (
          <section key={i} className="chag-page">
            {p.head.kind === "full" ? (
              <FullHeader chag={chag} title={fullTitle(p.head.dayIndex)} date={fullDate(p.head.dayIndex)} />
            ) : (
              <ContHeader title={p.head.dayIndex === null ? stretchTitle : days[p.head.dayIndex].title} pageOf={p.pageOf} />
            )}
            <div className="chag-page__body">
              {p.units.map((u) => (
                <Fragment key={u.key}>
                  <div className="chag-page__unit">{u.node}</div>
                </Fragment>
              ))}
            </div>
            <div className="chag-page__foot-wrap">
              <Footer />
            </div>
          </section>
        ))}
    </>
  );
}
