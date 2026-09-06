import { SEDARIM } from "../data/shas";

export interface PerekSlot {
  sederId: string;
  masechetEn: string;
  perek: number;
}

/** Every one of the 524 perakim in Shas order, tagged with its seder —
    the single layout both the full mosaic (SiyumDetail) and the index
    card's mini preview iterate over, so they can never drift apart. */
export const ALL_PEREK_SLOTS: PerekSlot[] = SEDARIM.flatMap((seder) =>
  seder.masechtot.flatMap((m) =>
    Array.from({ length: m.perakim }, (_, i) => ({ sederId: seder.id, masechetEn: m.en, perek: i + 1 })),
  ),
);
