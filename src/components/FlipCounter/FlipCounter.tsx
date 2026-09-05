import { useState } from "react";
import "./FlipCounter.css";

export interface FlipScope {
  key: string;
  title: string;
  context: string;
  percent: number;
  doneCount: number;
  totalCount: number;
  unit: string;
  hue: string;
}

interface FlipCounterProps {
  scopes: FlipScope[];
  large?: boolean;
}

/** Three scopes (masechet -> seder -> Shas), opening on the narrowest.
    ‹ › step between them; chips jump directly. See HANDOFF30 §8. */
export function FlipCounter({ scopes, large }: FlipCounterProps) {
  const [index, setIndex] = useState(0);
  const scope = scopes[Math.min(index, scopes.length - 1)];
  if (!scope) return null;

  return (
    <div className={"flip-counter" + (large ? " flip-counter--large" : "")} style={{ ["--flip-hue" as string]: scope.hue }}>
      <div className="flip-counter__head">
        <button
          className="flip-counter__step"
          aria-label="Zoom in"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ‹
        </button>
        <div className="flip-counter__titles">
          <p className="flip-counter__title">{scope.title}</p>
          <p className="flip-counter__context">{scope.context}</p>
        </div>
        <button
          className="flip-counter__step"
          aria-label="Zoom out"
          disabled={index === scopes.length - 1}
          onClick={() => setIndex((i) => Math.min(scopes.length - 1, i + 1))}
        >
          ›
        </button>
      </div>

      <p className="flip-counter__pct" key={`${scope.key}-${scope.percent}`}>
        {scope.percent}%
      </p>

      <div className="flip-counter__bar">
        <div className="flip-counter__bar-fill" style={{ width: `${scope.percent}%` }} />
      </div>

      <p className="flip-counter__count">
        {scope.doneCount} of {scope.totalCount} {scope.unit}
      </p>

      <div className="flip-counter__chips">
        {scopes.map((s, i) => (
          <button
            key={s.key}
            className={"flip-counter__chip" + (i === index ? " flip-counter__chip--active" : "")}
            onClick={() => setIndex(i)}
          >
            {s.key}
          </button>
        ))}
      </div>
    </div>
  );
}
