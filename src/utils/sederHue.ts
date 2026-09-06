/** Color always means "which part of Shas" (HANDOFF30 §3) — one hue per
    seder, shared by every screen that shows sedarim: Explore Shas,
    Siyumim, Sidrei Hamishna, Mishna Quiz, Seder Sort. */
export const SEDER_HUE: Record<string, string> = {
  zeraim: "var(--seder-zeraim)",
  moed: "var(--seder-moed)",
  nashim: "var(--seder-nashim)",
  nezikin: "var(--seder-nezikin)",
  kodashim: "var(--seder-kodashim)",
  taharot: "var(--seder-taharot)",
};

export function getSederHue(sederId: string | null | undefined): string {
  return (sederId && SEDER_HUE[sederId]) || "var(--gold)";
}

/** Same six hues, darkened enough to hold 4.5:1 as small text on cream —
    the fill hues above are for fills only, never small type. */
export const SEDER_HUE_TEXT: Record<string, string> = {
  zeraim: "var(--seder-zeraim-text)",
  moed: "var(--seder-moed-text)",
  nashim: "var(--seder-nashim-text)",
  nezikin: "var(--seder-nezikin-text)",
  kodashim: "var(--seder-kodashim-text)",
  taharot: "var(--seder-taharot-text)",
};

export function getSederHueText(sederId: string | null | undefined): string {
  return (sederId && SEDER_HUE_TEXT[sederId]) || "var(--brass-text)";
}
