import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
import { NavIcon } from "../Icon/NavIcon";
import { ChagPrintCard } from "../ChagPrint/ChagPrintCard";
import { nextStretch } from "../../utils/chagCalendar";
import { useToday } from "../../utils/useToday";
import { GUIDE_PDF } from "../Guide/guidePdf";
import "./ResourcesScreen.css";

interface Resource {
  id: "sedarim" | "masechtot" | "perakim";
  file: string;
}

const RESOURCES: Resource[] = [
  {
    id: "sedarim",
    file: "/resources/sedarim-order-worksheet.pdf",
  },
  {
    id: "masechtot",
    file: "/resources/masechtot-order-worksheet.pdf",
  },
  {
    id: "perakim",
    file: "/resources/masechet-perek-worksheet.pdf",
  },
];

interface ResourcesScreenProps {
  onOpenGuide?: (anchor?: string) => void;
}

export function ResourcesScreen({ onOpenGuide }: ResourcesScreenProps) {
  const { t } = useTranslation(["print", "common"]);
  const [printOpen, setPrintOpen] = useState(false);
  // Mishnayot for the next Shabbat or yom tov, any ordinary day of the week
  // (never on Shabbat or yom tov itself) — Home and Daily Limmud only offer
  // it on erev.
  const upcoming = nextStretch(useToday());

  return (
    <div className="stage">
      <div className="panel">
        <div className="screen-head">
          <h1 className="screen-head__title">{t("resources.title")}</h1>
        </div>

        {upcoming && <ChagPrintCard stretch={upcoming} />}

        <div className="resources-list">
          {onOpenGuide && (
            <div className="card card--rule resource-card">
              <div className="resource-card__body">
                <p className="resource-card__title">{t("resources.guide.title")}</p>
                <p className="resource-card__desc">
                  {t("resources.guide.desc")}
                </p>
              </div>
              <div className="resource-card__actions">
                <button className="btn btn--secondary btn--compact resource-card__download" onClick={() => onOpenGuide()}>
                  {t("resources.guide.read")}
                </button>
                <a className="btn btn--primary btn--compact resource-card__download" href={GUIDE_PDF} download="How to Use Chazarat Hashas.pdf">
                  <NavIcon id="download" size={15} weight={2.2} />
                  {t("resources.download")}
                </a>
              </div>
            </div>
          )}

          {RESOURCES.map((r) => (
            <div key={r.id} className="card card--rule resource-card">
              <div className="resource-card__body">
                <p className="resource-card__title">{t(`resources.${r.id}.title`)}</p>
                <p className="resource-card__desc">{t(`resources.${r.id}.desc`)}</p>
              </div>
              <a className="btn btn--primary btn--compact resource-card__download" href={r.file} download>
                <NavIcon id="download" size={15} weight={2.2} />
                {t("resources.download")}
              </a>
            </div>
          ))}

          <div className="card card--rule resource-card">
            <div className="resource-card__body">
              <p className="resource-card__title">{t("resources.notes.title")}</p>
              <p className="resource-card__desc">
                {t("resources.notes.desc")}
              </p>
            </div>
            <button className="btn btn--secondary btn--compact resource-card__download" onClick={() => setPrintOpen(true)}>
              <NavIcon id="print" size={15} weight={2} />
              {t("common:print")}
            </button>
          </div>

          <div className="card card--rule resource-card">
            <div className="resource-card__body">
              <p className="resource-card__title">{t("resources.support.title")}</p>
              <p className="resource-card__desc">
                {t("resources.support.desc")}
              </p>
            </div>
            <a className="btn btn--secondary btn--compact resource-card__download" href="mailto:chazarashashas@gmail.com">
              <NavIcon id="mail" size={15} weight={2} />
              {t("resources.support.email")}
            </a>
          </div>
        </div>
      </div>

      {printOpen && <PrintNotesView onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
