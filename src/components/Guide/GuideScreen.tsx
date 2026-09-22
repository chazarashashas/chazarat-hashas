import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavLabels } from "../../utils/navItems";
import { SEDARIM } from "../../data/shas";
import { getSederHue } from "../../utils/sederHue";
import { NavIcon } from "../Icon/NavIcon";
import { GUIDE_PDF } from "./guidePdf";
import "./GuideScreen.css";

interface GuideScreenProps {
  onNavigate: (id: string) => void;
  /** Which step to scroll to on arrival — from Home's popup link, from
      Resources, or from the first-run "Read the whole guide" card. Null
      just opens at the top. */
  initialAnchor?: string | null;
  /** Skips the outer .stage/.panel page chrome — GuidePopup supplies its
      own popup chrome around this same content instead. */
  bare?: boolean;
  /** This copy is the one being sent to paper: no Print button, no step
      navigation, no "find this again" note — none of which mean anything
      once printed. Also what stops the print overlay recursing. */
  forPrint?: boolean;
}

interface StepNavButton {
  id: string;
  label: string;
}

/** GUIDEBRIEF2.md: "Every step lists the screens it names as real
    <button>s that route there" — this table is that list, verbatim
    from the brief, not derived from parsing the bold text in the copy
    below (several buttons, e.g. Step 4's Resources, aren't the literal
    next word after a bold mention). */
const STEP_BUTTONS: Record<string, StepNavButton[]> = {
  sedarim: [
    { id: "map", label: "Explore Shas" },
    { id: "sedarim", label: "Sidrei Hamishna" },
  ],
  masechtot: [
    { id: "sedarim", label: "Sidrei Hamishna" },
    { id: "recall", label: "Mishna Chazara" },
    { id: "dash", label: "Shas Dash" },
    { id: "sort", label: "Seder Sort" },
  ],
  perakim: [
    { id: "perek", label: "Mishna Notes" },
    { id: "mishna", label: "Mishna Quiz" },
  ],
  concepts: [
    { id: "perek", label: "Mishna Notes" },
    { id: "resources", label: "Resources" },
  ],
  pace: [
    { id: "progress", label: "My Siyumim" },
    { id: "limmud", label: "Daily Limmud" },
  ],
  together: [
    { id: "chevrusa", label: "Chevrusa" },
    { id: "chabura", label: "Chabura" },
  ],
};

/** The inline markup the Guide's sentences use: <b> for a screen's name,
    <i> for emphasis. */
const RICH = { b: <strong />, i: <em /> };

function StepNav({ onNavigate, buttons }: { onNavigate: (id: string) => void; buttons: StepNavButton[] }) {
  const { t } = useTranslation("guide");
  const labels = useNavLabels();
  return (
    <div className="guide-step__nav">
      {buttons.map((b) => (
        <button key={b.id} className="pill pill--compact guide-step__nav-btn" onClick={() => onNavigate(b.id)}>
          {t("stepNavButton", { label: labels.item(b) })}
        </button>
      ))}
    </div>
  );
}

function SederPills() {
  const { t, i18n } = useTranslation("guide");
  const hebrewOnly = i18n.language === "he";
  // role="list"/"listitem" so the container's aria-label is actually
  // honoured (it is ignored on a bare div) and each pill is announced as
  // its own item, named by its Hebrew-plus-English text.
  return (
    <div className="guide-seder-pills" role="list" aria-label={t("sederPillsLabel")}>
      {SEDARIM.map((s) => (
        <span
          key={s.id}
          role="listitem"
          className="pill pill--compact pill--hue guide-seder-pill"
          style={{ ["--pill-hue" as string]: getSederHue(s.id) }}
        >
          <span lang="he" dir="rtl">
            {s.he}
          </span>
          {!hebrewOnly && <> {s.en}</>}
        </span>
      ))}
    </div>
  );
}

/**
 * GUIDEBRIEF2.md: the canonical, full explanation of how the app is
 * meant to be used — supersedes Home's old "Practice keeps it from
 * slipping" popup block and every other explainer in the app. Copy in
 * this file (now in locales/en/guide.json) is verbatim from the brief's appendix; do not rewrite,
 * condense, or re-tone it — see the brief for why (curly quotes, and
 * the specific paragraph/bullets/paragraph order in Step 3 both carry
 * meaning that a rewrite would lose).
 *
 * No router exists yet (see GUIDEBRIEF2.md's own routing note), so
 * "Route: /guide" resolves to the "if not" branch it specifies: `guide`
 * is a section value like every other screen, and the six step anchors
 * are in-page scroll targets, not real URLs. Revisit this the moment a
 * real router lands.
 */
export function GuideScreen({ onNavigate, initialAnchor, bare, forPrint }: GuideScreenProps) {
  const { t } = useTranslation(["guide", "common"]);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (!initialAnchor) return;
    const el = document.getElementById(initialAnchor);
    el?.scrollIntoView({ block: "start" });
    // Only ever on arrival — re-scrolling every time the prop identity
    // happens to change isn't the intent, just the one-time deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={bare ? "guide-bare" : "stage"}>
      <div
        className={
          "panel guide-panel" +
          (bare ? " guide-panel--bare" : "") +
          (forPrint ? " guide-panel--print" : "")
        }
      >
        <header className="guide-header">
          <h1 className="screen-head__title guide-header__title">{t("header.title")}</h1>
          <p className="guide-header__subtitle">{t("header.subtitle")}</p>
          <p className="guide-header__intro">{t("header.intro")}</p>
          {!forPrint && (
            <div className="guide-header__actions">
              <a className="btn btn--secondary btn--compact" href={GUIDE_PDF} download="How to Use Chazarat Hashas.pdf">
                <NavIcon id="download" size={15} weight={2.2} />
                {t("header.download")}
              </a>
              <button className="btn btn--secondary btn--compact guide-print-btn" onClick={() => setPrintOpen(true)}>
                <NavIcon id="print" size={15} weight={2} />
                {t("common:print")}
              </button>
            </div>
          )}
        </header>
        <div className="guide-rule" aria-hidden="true" />

        <ol className="guide-steps">
          <li>
            <section id="sedarim" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                1
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">{t("steps.sedarim.title")}</h2>
                <p>
                  <Trans t={t} i18nKey="steps.sedarim.p1" components={RICH} />
                </p>
                <SederPills />
                <p>
                  <Trans t={t} i18nKey="steps.sedarim.p2" components={RICH} />
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.sedarim} />
              </div>
            </section>
          </li>

          <li>
            <section id="masechtot" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                2
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">{t("steps.masechtot.title")}</h2>
                <p>
                  <Trans t={t} i18nKey="steps.masechtot.p1" components={RICH} />
                </p>
                <p>
                  <Trans t={t} i18nKey="steps.masechtot.p2" components={RICH} />
                </p>
                <p>{t("steps.masechtot.gamesIntro")}</p>
                <ul>
                  <li>
                    <Trans t={t} i18nKey="steps.masechtot.sidrei" components={RICH} />
                  </li>
                  <li>
                    <Trans t={t} i18nKey="steps.masechtot.chazara" components={RICH} />
                  </li>
                  <li>
                    <Trans t={t} i18nKey="steps.masechtot.dash" components={RICH} />
                  </li>
                  <li>
                    <Trans t={t} i18nKey="steps.masechtot.sort" components={RICH} />
                  </li>
                </ul>
                <div className="callout guide-callout">
                  <p className="guide-callout__title">{t("steps.masechtot.calloutTitle")}</p>
                  <p>
                    <Trans t={t} i18nKey="steps.masechtot.calloutBody" components={RICH} />
                  </p>
                </div>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.masechtot} />
              </div>
            </section>
          </li>

          <li>
            <section id="perakim" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                3
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">{t("steps.perakim.title")}</h2>
                <p>
                  <Trans t={t} i18nKey="steps.perakim.p1" components={RICH} />
                </p>
                <p>
                  <Trans t={t} i18nKey="steps.perakim.p2" components={RICH} />
                </p>
                <ul>
                  <li>{t("steps.perakim.value")}</li>
                  <li>{t("steps.perakim.order")}</li>
                  <li>{t("steps.perakim.connects")}</li>
                </ul>
                <p>
                  <Trans t={t} i18nKey="steps.perakim.p3" components={RICH} />
                </p>
                <p>
                  <Trans t={t} i18nKey="steps.perakim.p4" components={RICH} />
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.perakim} />
              </div>
            </section>
          </li>

          <li>
            <section id="concepts" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                4
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">{t("steps.concepts.title")}</h2>
                <p>{t("steps.concepts.p1")}</p>
                <p>
                  <Trans t={t} i18nKey="steps.concepts.p2" components={RICH} />
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.concepts} />
              </div>
            </section>
          </li>

          <li>
            <section id="pace" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                5
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">{t("steps.pace.title")}</h2>
                <p>
                  <Trans t={t} i18nKey="steps.pace.p1" components={RICH} />
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.pace} />
              </div>
            </section>
          </li>

          <li>
            <section id="together" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                6
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">{t("steps.together.title")}</h2>
                <p>
                  <Trans t={t} i18nKey="steps.together.p1" components={RICH} />
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.together} />
              </div>
            </section>
          </li>
        </ol>

        <p className="guide-closing">{t("closing")}</p>
        <div className="guide-rule" aria-hidden="true" />
        {!forPrint && (
          <p className="guide-revisit">{t("revisit")}</p>
        )}
      </div>

      {/* The Guide on paper goes through Mishna Notes' print path — the same
          .print-overlay shell, .no-print controls and window.print() — rather
          than a second print mechanism of its own. The copy inside is this
          same component with forPrint set, which is what stops it recursing. */}
      {printOpen && !forPrint && (
        <div className="print-overlay">
          <div className="print-controls no-print">
            <h2>{t("printTitle")}</h2>
            <div className="print-actions">
              <button className="restart print-btn" onClick={() => window.print()}>
                {t("common:print")}
              </button>
              <button className="print-close" onClick={() => setPrintOpen(false)}>
                {t("common:close")}
              </button>
            </div>
          </div>
          <div className="print-content">
            <GuideScreen bare forPrint onNavigate={onNavigate} />
          </div>
        </div>
      )}
    </div>
  );
}
