import { useId, useState } from "react";

export interface BarDatum {
  key: string;
  /** Short axis label, e.g. "Sep 7". */
  label: string;
  value: number;
  /** The full hover line, e.g. "Week of Sep 7 · 5 sign-ups (3 Google, 2 email)". */
  tooltip: string;
}

const W = 600;
const H = 150;
const PAD_L = 28;
const PAD_B = 22;
const PAD_T = 10;

/** Round tick maximum: 1, 2, 5 × 10ⁿ at or above the data's peak. */
function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 5, 10].find((s) => s * pow >= v) ?? 10;
  return step * pow;
}

/** A bar's path: square at the baseline, 4px rounded at the data end. */
function barPath(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  const r = Math.min(4, h, w / 2);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/**
 * One series of bars over time — the admin panel's only chart form.
 * Single series, so no legend: the title names it. Hover (or focus) a bar
 * for its exact figure; "Show as table" gives the same numbers as text.
 * Colours are theme tokens; marks stay thin with a 2px gap between bars.
 */
export function AdminBarChart({ title, data, unit }: { title: string; data: BarDatum[]; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - PAD_L;
  const base = H - PAD_B;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.max(2, slot - 2);
  const yFor = (v: number) => base - (v / max) * (base - PAD_T);
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <figure className="admin-chart" aria-labelledby={titleId}>
      <div className="admin-chart__head">
        <figcaption id={titleId} className="admin-chart__title">
          {title}
        </figcaption>
        <button className="btn btn--quiet btn--compact" onClick={() => setAsTable((t) => !t)}>
          {asTable ? "Show as chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <div className="admin-chart__table-wrap">
          <table className="admin-table">
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="admin-table__num">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-chart__plot" onMouseLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${total} ${unit} in total`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="admin-chart__grid" x1={PAD_L} x2={W} y1={yFor(t)} y2={yFor(t)} />
                <text className="admin-chart__axis" x={PAD_L - 6} y={yFor(t) + 4} textAnchor="end">
                  {Number.isInteger(t) ? t : t.toFixed(1)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = PAD_L + i * slot + 1;
              return (
                <g key={d.key}>
                  {d.value > 0 && (
                    <path
                      className={"admin-chart__bar" + (active === i ? " admin-chart__bar--active" : "")}
                      d={barPath(x, yFor(d.value), barW, base)}
                    />
                  )}
                  {i % labelEvery === 0 && (
                    <text className="admin-chart__axis" x={x + barW / 2} y={H - 6} textAnchor="middle">
                      {d.label}
                    </text>
                  )}
                  <rect
                    className="admin-chart__hit"
                    x={PAD_L + i * slot}
                    y={PAD_T}
                    width={slot}
                    height={base - PAD_T}
                    tabIndex={0}
                    aria-label={d.tooltip}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                </g>
              );
            })}
          </svg>
          {active !== null && data[active] && (
            <div
              className="admin-chart__tip"
              style={{ left: `${((PAD_L + active * slot + slot / 2) / W) * 100}%` }}
              role="status"
            >
              {data[active].tooltip}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
