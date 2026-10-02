import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useName } from "../../i18n";
import { SEDARIM, type Masechet } from "../../data/shas";
import { getMishnayotCount } from "../../data/perekInfo";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { useEscapeKey } from "../../utils/useEscapeKey";
import "./PastLearningModal.css";

/** masechet (English name) → how far: every perek, or through this one. */
type Picked = Map<string, "all" | number>;

interface PastLearningModalProps {
  /** Already learned, so a masechet's row can show it rather than offering it again. */
  isMasechetDone: (masechetEn: string) => boolean;
  onSave: (entries: { masechetEn: string; throughPerek?: number }[]) => void;
  onClose: () => void;
}

function mishnayotIn(masechetEn: string, throughPerek: number): number {
  let total = 0;
  for (let perek = 1; perek <= throughPerek; perek++) total += getMishnayotCount(masechetEn, perek);
  return total;
}

/**
 * "What have you already learned?" — for someone who comes to the app with
 * years of Shas behind them. Whole sedarim, whole masechtot, or the one
 * they are part-way through. What it marks counts toward every percentage
 * and siyum, and deliberately not toward a streak or today's learning:
 * it was learned before today, and saying otherwise would be a lie told
 * to the learner and to their rebbe.
 */
export function PastLearningModal({ isMasechetDone, onSave, onClose }: PastLearningModalProps) {
  const { t, i18n } = useTranslation(["siyumim", "common"]);
  const name = useName();
  useEscapeKey(onClose);
  const [openSeder, setOpenSeder] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked>(new Map());

  const perekNum = (n: number) => (i18n.language === "he" ? hebrewNumeral(n) : String(n));

  const total = useMemo(() => {
    let sum = 0;
    for (const [masechetEn, how] of picked) {
      const masechet = SEDARIM.flatMap((s) => s.masechtot).find((m) => m.en === masechetEn);
      if (!masechet) continue;
      sum += mishnayotIn(masechetEn, how === "all" ? masechet.perakim : how);
    }
    return sum;
  }, [picked]);

  function setMasechet(masechetEn: string, how: "all" | number | null) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (how === null) next.delete(masechetEn);
      else next.set(masechetEn, how);
      return next;
    });
  }

  /** The whole seder on or off in one go — how people describe it. */
  function toggleSeder(masechtot: Masechet[], on: boolean) {
    setPicked((prev) => {
      const next = new Map(prev);
      for (const m of masechtot) {
        if (isMasechetDone(m.en)) continue;
        if (on) next.set(m.en, "all");
        else next.delete(m.en);
      }
      return next;
    });
  }

  function save() {
    const entries = [...picked].map(([masechetEn, how]) => ({
      masechetEn,
      throughPerek: how === "all" ? undefined : how,
    }));
    onSave(entries);
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal--md past-learning" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title={t("common:close")} aria-label={t("common:close")}>
          ✕
        </button>
        <h2 className="modal__title">{t("pastLearning.title")}</h2>
        <p className="modal__body">{t("pastLearning.body")}</p>

        <div className="past-learning__list">
          {SEDARIM.map((seder) => {
            const open = openSeder === seder.id;
            const available = seder.masechtot.filter((m) => !isMasechetDone(m.en));
            const chosen = seder.masechtot.filter((m) => picked.has(m.en)).length;
            const allChosen = available.length > 0 && available.every((m) => picked.get(m.en) === "all");
            return (
              <div key={seder.id} className="past-learning__seder">
                <div className="past-learning__seder-head">
                  <label className="past-learning__check">
                    <input
                      type="checkbox"
                      checked={allChosen}
                      disabled={available.length === 0}
                      onChange={(e) => toggleSeder(seder.masechtot, e.target.checked)}
                    />
                    <span>{name(seder)}</span>
                  </label>
                  <button className="past-learning__expand" onClick={() => setOpenSeder(open ? null : seder.id)}>
                    {chosen > 0 && <span className="past-learning__count">{t("pastLearning.chosen", { count: chosen })}</span>}
                    {open ? "▾" : "▸"}
                  </button>
                </div>

                {open && (
                  <div className="past-learning__masechtot">
                    {seder.masechtot.map((m) => {
                      const done = isMasechetDone(m.en);
                      const how = picked.get(m.en);
                      return (
                        <div key={m.en} className="past-learning__row">
                          <label className="past-learning__check">
                            <input
                              type="checkbox"
                              checked={how !== undefined}
                              disabled={done}
                              onChange={(e) => setMasechet(m.en, e.target.checked ? "all" : null)}
                            />
                            <span>{name(m)}</span>
                          </label>
                          {done ? (
                            <span className="past-learning__done">{t("pastLearning.alreadyMarked")}</span>
                          ) : (
                            how !== undefined &&
                            m.perakim > 1 && (
                              <select
                                className="past-learning__through"
                                value={how === "all" ? "all" : String(how)}
                                onChange={(e) => setMasechet(m.en, e.target.value === "all" ? "all" : Number(e.target.value))}
                              >
                                <option value="all">{t("pastLearning.whole")}</option>
                                {Array.from({ length: m.perakim }, (_, i) => i + 1).map((p) => (
                                  <option key={p} value={p}>
                                    {t("pastLearning.throughPerek", { perek: perekNum(p) })}
                                  </option>
                                ))}
                              </select>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal__actions">
          <button className="btn btn--accent" disabled={picked.size === 0} onClick={save}>
            {t("pastLearning.save", { count: total })}
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            {t("common:cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
