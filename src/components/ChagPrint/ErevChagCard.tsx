import type { ChagStretch } from "../../utils/chagCalendar";
import { NavIcon } from "../Icon/NavIcon";
import { ChagGreeting } from "./ChagGreeting";
import { chagName } from "./chagPrintModel";
import { requestPrintCardFocus } from "./printCardFocus";
import "./ChagPrint.css";

/**
 * Home on erev Shabbat or erev yom tov: the chag's greeting, and one way on
 * to Daily Limmud, where the printing happens. Home points to it rather
 * than printing itself — Daily Limmud is where the learning lives.
 */
export function ErevChagCard({ stretch, onGoToLimmud }: { stretch: ChagStretch; onGoToLimmud: () => void }) {
  return (
    <section className="erev-card" aria-label={`Before ${chagName(stretch)}`}>
      <ChagGreeting stretch={stretch} />
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
