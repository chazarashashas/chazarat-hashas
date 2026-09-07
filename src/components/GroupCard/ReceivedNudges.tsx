import { useMyNudgesToday } from "../../utils/useGroupNudges";
import "./ReceivedNudges.css";

/** What a nudge says when the sender didn't add their own line — "empty
    means optional means it still sends" (CHEVRUSA-CHABURA-BRIEF.md §3). */
const DEFAULT_CHIZUK = "Sending you chizuk — keep going, you've got this.";

/** Chizuk sent to me today — shown on Home and on the chevrusa/chabura
    screens. Renders nothing when there's nothing to show, so it's safe
    to drop into any screen unconditionally. */
export function ReceivedNudges() {
  const { nudges } = useMyNudgesToday();
  if (nudges.length === 0) return null;

  return (
    <div className="received-nudges">
      {nudges.map((n) => (
        <div className="received-nudge" key={n.id}>
          <p className="received-nudge__from">{n.fromName} sent you chizuk</p>
          <p className="received-nudge__note">"{n.note ?? DEFAULT_CHIZUK}"</p>
        </div>
      ))}
    </div>
  );
}
