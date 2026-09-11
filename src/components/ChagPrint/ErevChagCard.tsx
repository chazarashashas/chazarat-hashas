import { greetingFor, type ChagStretch } from "../../utils/chagCalendar";
import { NavIcon } from "../Icon/NavIcon";
import { ChagMotif } from "./ChagMotif";
import { requestPrintCardFocus } from "./printCardFocus";
import "./ChagPrint.css";

const CHAG_NAMES: Record<string, string> = {
  "rosh-hashana": "Rosh Hashana",
  "yom-kippur": "Yom Kippur",
  sukkot: "Sukkot",
  "shmini-atzeret": "Shemini Atzeret",
  pesach: "Pesach",
  shavuot: "Shavuot",
};

/**
 * Home on erev Shabbat or erev yom tov: the chag's greeting and motif, and
 * one way on to Daily Limmud, where the printing happens. Home points to
 * it rather than printing itself — Daily Limmud is where the learning lives.
 */
export function ErevChagCard({
  stretch,
  onGoToLimmud,
}: {
  stretch: ChagStretch;
  onGoToLimmud: () => void;
}) {
  const name = stretch.chag ? CHAG_NAMES[stretch.chag] : "Shabbat";
  return (
    <section className="erev-card" aria-label={`Before ${name}`}>
      <div className="erev-card__art" aria-hidden="true">
        <ChagMotif chag={stretch.chag} />
      </div>
      <p className="erev-card__greeting" lang="he" dir="rtl">
        {greetingFor(stretch.chag)}
      </p>
      <h2 className="erev-card__title">Make sure to print your Mishnayos before {name}</h2>
      <button
        className="btn btn--primary btn--block erev-card__go"
        onClick={() => {
          requestPrintCardFocus();
          onGoToLimmud();
        }}
      >
        <NavIcon id="print" size={16} weight={2} />
        Print from Daily Limmud
      </button>
    </section>
  );
}
