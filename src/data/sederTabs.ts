import { SEDARIM } from "./shas";

/** The "Shas" + one-per-seder tab list shared by every screen with a bottom seder tab bar. */
export const SEDER_TABS = [{ id: "all", label: "Shas" }, ...SEDARIM.map((s) => ({ id: s.id, label: s.en }))];
