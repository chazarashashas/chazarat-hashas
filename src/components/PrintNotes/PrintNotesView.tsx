import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useName } from "../../i18n";
import { SEDARIM, findMasechet } from "../../data/shas";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { BrandMark } from "../BrandMark";
import "./PrintNotesView.css";

interface PrintNotesViewProps {
  initialMasechetEn?: string;
  onClose: () => void;
}

type ScopeType = "all" | "seder" | "masechet";

/**
 * A dedicated print view — the browser's own print (window.print()) does
 * the work, not a PDF library, so Hebrew renders correctly with plain
 * dir="rtl" and no character-reversal workaround. Only ever shows what
 * the student actually wrote: a masechet with no notes and no concepts
 * doesn't appear at all.
 */
export function PrintNotesView({ initialMasechetEn, onClose }: PrintNotesViewProps) {
  const { t } = useTranslation(["explore", "common"]);
  const name = useName();
  const initialSeder = initialMasechetEn
    ? SEDARIM.find((s) => s.masechtot.some((m) => m.en === initialMasechetEn))
    : undefined;
  const [scopeType, setScopeType] = useState<ScopeType>(initialMasechetEn ? "masechet" : "all");
  const [sederId, setSederId] = useState(initialSeder?.id ?? SEDARIM[0].id);
  const [masechetEn, setMasechetEn] = useState(initialMasechetEn ?? SEDARIM[0].masechtot[0].en);

  const { perekNotes, masechetSentences } = usePerekNotes();
  const { concepts } = useLearningProgress();

  const seder = SEDARIM.find((s) => s.id === sederId)!;

  const sedarimInScope =
    scopeType === "all" ? SEDARIM : scopeType === "seder" ? [seder] : [SEDARIM.find((s) => s.masechtot.some((m) => m.en === masechetEn))!];

  const scopeMasechet = findMasechet(masechetEn);
  const scopeLabel =
    scopeType === "all"
      ? t("print.scopeAll")
      : scopeType === "seder"
        ? name(seder)
        : scopeMasechet
          ? name(scopeMasechet)
          : masechetEn;

  const groups = sedarimInScope
    .map((s) => {
      const masechtot = (scopeType === "masechet" ? s.masechtot.filter((m) => m.en === masechetEn) : s.masechtot)
        .map((m) => {
          const sentence = masechetSentences[m.en]?.trim();
          const notes = perekNotes[m.en] ?? [];
          const perakim = Array.from({ length: m.perakim }, (_, i) => i + 1)
            .map((p) => ({
              perek: p,
              note: notes[p - 1]?.trim() || "",
              concepts: concepts.filter((c) => c.masechetEn === m.en && c.perek === p),
            }))
            .filter((p) => p.note || p.concepts.length > 0);
          return { masechet: m, sentence, perakim };
        })
        .filter((m) => m.sentence || m.perakim.length > 0);
      return { seder: s, masechtot };
    })
    .filter((g) => g.masechtot.length > 0);

  return (
    <div className="print-overlay">
      <div className="print-controls no-print">
        <h2>{t("print.title")}</h2>
        <div className="print-scope-row">
          <select value={scopeType} onChange={(e) => setScopeType(e.target.value as ScopeType)}>
            <option value="all">{t("print.allOfShas")}</option>
            <option value="seder">{t("print.oneSeder")}</option>
            <option value="masechet">{t("print.oneMasechet")}</option>
          </select>
          {scopeType !== "all" && (
            <select value={sederId} onChange={(e) => setSederId(e.target.value)}>
              {SEDARIM.map((s) => (
                <option key={s.id} value={s.id}>
                  {name(s)}
                </option>
              ))}
            </select>
          )}
          {scopeType === "masechet" && (
            <select value={masechetEn} onChange={(e) => setMasechetEn(e.target.value)}>
              {seder.masechtot.map((m) => (
                <option key={m.en} value={m.en}>
                  {name(m)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="print-actions">
          <button className="restart print-btn" onClick={() => window.print()}>
            {t("common:print")}
          </button>
          <button className="print-close" onClick={onClose}>
            {t("common:close")}
          </button>
        </div>
      </div>

      <div className="print-content">
        <div className="print-header">
          <BrandMark variant="oneink" className="print-header__mark" />
          <h1 className="print-title">{t("print.heading", { scope: scopeLabel })}</h1>
        </div>
        {groups.length === 0 ? (
          <p className="print-empty">{t("print.empty", { scope: scopeLabel })}</p>
        ) : (
          groups.map(({ seder: s, masechtot }) => (
            <div key={s.id} className="print-seder">
              <h2 className="print-seder__title">{name(s)}</h2>
              {masechtot.map(({ masechet, sentence, perakim }) => (
                <div key={masechet.en} className="print-masechet">
                  <h3 className="print-masechet__title">{name(masechet)}</h3>
                  {sentence && <p className="print-sentence">{sentence}</p>}
                  {perakim.map(({ perek, note, concepts: perekConcepts }) => (
                    <div key={perek} className="print-perek">
                      <p className="print-perek__title">
                        <Trans
                          t={t}
                          i18nKey="print.perek"
                          values={{ num: hebrewNumeral(perek) }}
                          components={{ 1: <span dir="rtl" /> }}
                        />
                      </p>
                      <div className="print-perek__content">
                        {note && <p className="print-note">{note}</p>}
                        {perekConcepts.map((c) => (
                          <div key={c.id} className="print-concept">
                            <span className="print-concept__title">{c.title}</span>
                            {c.note && <span className="print-concept__note"> — {c.note}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
