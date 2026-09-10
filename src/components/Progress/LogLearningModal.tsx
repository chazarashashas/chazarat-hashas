import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName } from "../../data/perekInfo";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { localDateStr } from "../../utils/localDate";
import "./LogLearningModal.css";

interface LogLearningModalProps {
  onSave: (masechetEn: string, perek: number, date: string) => void;
  onClose: () => void;
}

function todayStr(): string {
  return localDateStr();
}

/** For learning done off the app entirely — a shiur, a chevrusa, the
    student's own Mishnayot. Feeds the exact same completion records and
    streak as in-app Daily Limmud, just tagged source: "logged". */
export function LogLearningModal({ onSave, onClose }: LogLearningModalProps) {
  const [sederId, setSederId] = useState(SEDARIM[0].id);
  const seder = SEDARIM.find((s) => s.id === sederId)!;
  const [masechetEn, setMasechetEn] = useState(seder.masechtot[0].en);
  const masechet = seder.masechtot.find((m) => m.en === masechetEn) ?? seder.masechtot[0];
  const [perek, setPerek] = useState(1);
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);
  useEscapeKey(onClose);

  function handleSederChange(nextId: string) {
    setSederId(nextId);
    const nextSeder = SEDARIM.find((s) => s.id === nextId)!;
    setMasechetEn(nextSeder.masechtot[0].en);
    setPerek(1);
  }

  function handleMasechetChange(nextEn: string) {
    setMasechetEn(nextEn);
    setPerek(1);
  }

  function handleSave() {
    onSave(masechetEn, perek, date);
    setSaved(true);
    window.setTimeout(onClose, 700);
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--sm log-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>
        <h2 className="modal__title">Log learning</h2>
        <p className="log-modal__sub">
          Record a perek you learned outside the app — a shiur, a chevrusa, your own Mishnayot.
        </p>

        <label className="field log-modal__field">
          <span>Seder</span>
          <select value={sederId} onChange={(e) => handleSederChange(e.target.value)}>
            {SEDARIM.map((s) => (
              <option key={s.id} value={s.id}>
                {s.en}
              </option>
            ))}
          </select>
        </label>

        <label className="field log-modal__field">
          <span>Masechet</span>
          <select value={masechetEn} onChange={(e) => handleMasechetChange(e.target.value)}>
            {seder.masechtot.map((m) => (
              <option key={m.en} value={m.en}>
                {m.en}
              </option>
            ))}
          </select>
        </label>

        <label className="field log-modal__field">
          <span>Perek</span>
          <select value={perek} onChange={(e) => setPerek(Number(e.target.value))}>
            {Array.from({ length: masechet.perakim }, (_, i) => i + 1).map((n) => {
              const name = getPerekName(masechetEn, n);
              return (
                <option key={n} value={n}>
                  Perek {hebrewNumeral(n)}
                  {name ? ` — ${name}` : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label className="field log-modal__field">
          <span>Date</span>
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </label>

        <button className="restart" onClick={handleSave}>
          {saved ? "✓ Logged" : "Save"}
        </button>
      </div>
    </div>
  );
}
