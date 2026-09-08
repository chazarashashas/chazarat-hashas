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
];
