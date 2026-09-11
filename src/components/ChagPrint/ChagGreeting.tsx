import { greetingFor, type ChagStretch } from "../../utils/chagCalendar";
import { ChagMotif } from "./ChagMotif";
import { chagName } from "./chagPrintModel";
import "./ChagPrint.css";

/** The erev greeting — the chag's motif, "Wishing all of Am Yisrael a",
    its greeting in Hebrew, and the reminder to print. The same block opens
    Home's erev card and the print card on Daily Limmud and Resources. */
export function ChagGreeting({ stretch }: { stretch: ChagStretch }) {
  return (
    <div className="chag-greeting">
      <div className="chag-greeting__art" aria-hidden="true">
        <ChagMotif chag={stretch.chag} />
      </div>
      <p className="chag-greeting__wish">Wishing all of Am Yisrael a</p>
      <p className="chag-greeting__he" lang="he" dir="rtl">
        {greetingFor(stretch.chag)}
      </p>
      <h2 className="chag-greeting__title">Make sure to print your Mishnayos before {chagName(stretch)}</h2>
    </div>
  );
}
