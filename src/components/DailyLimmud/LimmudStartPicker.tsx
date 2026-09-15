import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { MISHNA_SEQUENCE } from "../../data/mishnaSequence";
import { getPerekName } from "../../data/perekInfo";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { masechetStartIndex as startIndexOf } from "../../utils/dailyProjection";

function perakimOf(masechetEn: string): number {
  return SEDARIM.flatMap((s) => s.masechtot).find((m) => m.en === masechetEn)?.perakim ?? 1;
}

/** Every masechet, grouped by seder — shared by the picker and the
    "finished a masechet" choice. */
export function MasechetOptions() {
  return (
    <>
      {SEDARIM.map((seder) => (
        <optgroup key={seder.id} label={seder.en}>
          {seder.masechtot.map((m) => (
            <option key={m.en} value={m.en}>
              {m.en}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/**
 * Where Daily Limmud starts — any masechet, not only Berachot, and a perek
 * within it. Opens on where Daily Limmud is now. Choosing moves only where
 * today's portion begins; everything already learned stays learned.
 */
export function LimmudStartPicker({ position, onStart }: { position: number; onStart: (index: number) => void }) {
  const current = MISHNA_SEQUENCE[position] ?? MISHNA_SEQUENCE[0];
  const [masechetEn, setMasechetEn] = useState(current.masechetEn);
  const [perek, setPerek] = useState(current.perek);
  const index = startIndexOf(masechetEn, perek);
  const here = MISHNA_SEQUENCE[position];
  const isCurrent = !!here && here.masechetEn === masechetEn && here.perek === perek;

  return (
    <div className="limmud-start">
      <div className="limmud-start__fields">
        <label className="field">
          <span className="field__label">Masechet</span>
          <select
            className="field__input"
            value={masechetEn}
            onChange={(e) => {
              setMasechetEn(e.target.value);
              setPerek(1);
            }}
          >
            <MasechetOptions />
          </select>
        </label>
        <label className="field">
          <span className="field__label">Perek</span>
          <select className="field__input" value={perek} onChange={(e) => setPerek(Number(e.target.value))}>
            {Array.from({ length: perakimOf(masechetEn) }, (_, i) => i + 1).map((n) => {
              const name = getPerekName(masechetEn, n);
              return (
                <option key={n} value={n}>
                  {hebrewNumeral(n)}
                  {name ? ` · ${name}` : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <button
        className="btn btn--secondary btn--block btn--compact"
        disabled={index < 0 || isCurrent}
        onClick={() => onStart(index)}
      >
        {isCurrent ? "You're learning here now" : "Start here"}
      </button>
      <p className="limmud-settings__fixed-note">What you've already learned stays marked.</p>
    </div>
  );
}
