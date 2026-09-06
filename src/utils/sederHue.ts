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
