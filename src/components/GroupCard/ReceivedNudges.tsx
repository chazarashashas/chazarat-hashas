import { useTranslation } from "react-i18next";
import { useMyNudgesToday } from "../../utils/useGroupNudges";
import "./ReceivedNudges.css";

/** Chizuk sent to me today — shown on Home and on the chevrusa/chabura
    screens. Renders nothing when there's nothing to show, so it's safe
    to drop into any screen unconditionally. When the sender didn't add
    their own line, groups:nudges.defaultChizuk stands in — "empty means
    optional means it still sends" (CHEVRUSA-CHABURA-BRIEF.md §3). */
export function ReceivedNudges() {
  const { t } = useTranslation("groups");
  const { nudges } = useMyNudgesToday();
  if (nudges.length === 0) return null;

  return (
    <div className="received-nudges">
      {nudges.map((n) => (
        <div className="received-nudge" key={n.id}>
          <p className="received-nudge__from">{t("nudges.from", { name: n.fromName })}</p>
          <p className="received-nudge__note">"{n.note ?? t("nudges.defaultChizuk")}"</p>
        </div>
      ))}
    </div>
  );
}
