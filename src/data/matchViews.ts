import { SEDARIM } from "./shas";

/**
 * One matching-game round: a title, a tab/pool label, and the correct-order
 * item names. `items[i]` is the name that belongs in slot `i`. Derived from
 * SEDARIM so the sedarim list and each seder's masechtot list are never
 * duplicated here.
 */
export interface MatchView {
  id: string;
  title: string;
  label: string;
  items: string[];
}

/** A round spanning two adjacent sedarim — masechtot in true Shas order
    across the seder boundary, not just within one seder. */
function combinedView(id: string, sederIds: [string, string]): MatchView {
  const seders = sederIds.map((sid) => SEDARIM.find((s) => s.id === sid)!);
  return {
    id,
    title: seders.map((s) => s.en).join(" + "),
    label: seders.map((s) => s.en).join(" + "),
    items: seders.flatMap((s) => s.masechtot.map((m) => m.en)),
  };
}

export const MATCH_VIEWS: MatchView[] = [
  {
    id: "sedarim",
    title: "Sidrei Hamishna",
    label: "Shas",
    items: SEDARIM.map((seder) => seder.en),
  },
  ...SEDARIM.map((seder) => ({
    id: seder.id,
    title: seder.en,
    label: seder.en,
    items: seder.masechtot.map((m) => m.en),
  })),
  combinedView("zeraim-moed", ["zeraim", "moed"]),
  combinedView("nashim-nezikin", ["nashim", "nezikin"]),
  combinedView("kodashim-taharot", ["kodashim", "taharot"]),
];
