import { useTranslation } from "react-i18next";
import { useName } from "../i18n";
import { SEDARIM } from "./shas";

/** The "Shas" + one-per-seder tab list shared by every screen with a bottom
    seder tab bar, named in the interface's language (ש״ס, זרעים…). */
export function useSederTabs(): { id: string; label: string }[] {
  const { t } = useTranslation("common");
  const name = useName();
  return [{ id: "all", label: t("shas") }, ...SEDARIM.map((s) => ({ id: s.id, label: name(s) }))];
}
