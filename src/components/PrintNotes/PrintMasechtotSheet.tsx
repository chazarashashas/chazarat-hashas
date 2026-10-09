import { useTranslation } from "react-i18next";
import { useName } from "../../i18n";
import { SEDARIM } from "../../data/shas";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { BrandMark } from "../BrandMark";
import "./PrintMasechtotSheet.css";

interface PrintMasechtotSheetProps {
  onClose: () => void;
}

/**
 * One page: every seder, and a numbered blank line for each of its
 * masechtot — the written version of Mishna Chazara, for a desk, a
 * Shabbos table, or anyone who thinks better with a pen. The browser's
 * own print does the work (as in PrintNotesView), so Hebrew sets
 * correctly without a PDF library.
 */
export function PrintMasechtotSheet({ onClose }: PrintMasechtotSheetProps) {
  const { t } = useTranslation(["print", "common"]);
  const name = useName();
  useEscapeKey(onClose);

  return (
    <div className="print-overlay masechtot-sheet-overlay">
      <div className="print-controls masechtot-sheet-controls">
        <h2>{t("masechtotSheet.title")}</h2>
        <p className="masechtot-sheet-controls__sub">{t("masechtotSheet.sub")}</p>
        <div className="print-controls__actions">
          <button className="btn btn--accent" onClick={() => window.print()}>
            {t("common:print")}
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            {t("common:close")}
          </button>
        </div>
      </div>

      <div className="print-sheet masechtot-sheet">
        <header className="masechtot-sheet__head">
          <BrandMark variant="oneink" className="masechtot-sheet__mark" />
          <div>
            <h1 className="masechtot-sheet__title">{t("masechtotSheet.sheetTitle")}</h1>
            <p className="masechtot-sheet__hint">{t("masechtotSheet.hint")}</p>
          </div>
          <div className="masechtot-sheet__name-line">
            <span>{t("masechtotSheet.nameLabel")}</span>
            <span className="masechtot-sheet__rule" />
          </div>
        </header>

        <div className="masechtot-sheet__sedarim">
          {SEDARIM.map((seder) => (
            <section key={seder.id} className="masechtot-sheet__seder">
              <h2 className="masechtot-sheet__seder-name">
                {name(seder)}
                <span className="masechtot-sheet__seder-count">{seder.masechtot.length}</span>
              </h2>
              <ol className="masechtot-sheet__lines">
                {seder.masechtot.map((m) => (
                  <li key={m.en} className="masechtot-sheet__line" />
                ))}
              </ol>
            </section>
          ))}
        </div>

        <footer className="masechtot-sheet__foot">chazarashashas.org</footer>
      </div>
    </div>
  );
}
