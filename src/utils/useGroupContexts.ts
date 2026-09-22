import { useTranslation } from "react-i18next";
import { useName } from "../i18n";
import { findMasechet } from "../data/shas";
import { useAuth } from "./useAuth";
import { useChevrusa, type GroupPace } from "./useChevrusa";

export interface GroupContext {
  masechetEn: string;
  label: string;
  pace: GroupPace;
}

/** Every distinct masechet you have an active chevrusa/chabura on —
    grouped by masechet (not by group), since your real progress through
    a masechet is one fact even if two groups happen to share it. Named
    by who you're learning it with, so it reads like "Chevrusa with
    Dovid" rather than an anonymous masechet name. Daily Limmud's context
    pills and the chag print card both read this list. */
export function useGroupContexts(): GroupContext[] {
  const { session } = useAuth();
  const { groups } = useChevrusa();
  const { t } = useTranslation("groups");
  const name = useName();
  const masechetName = (masechetEn: string) => {
    const m = findMasechet(masechetEn);
    return m ? name(m) : masechetEn;
  };
  const byMasechet = new Map<string, { descriptor: string; pace: GroupPace }[]>();
  for (const g of groups) {
    let descriptor: string;
    if (!g.isChabura) {
      const partner = g.members.find((m) => m.userId !== session?.user.id);
      const partnerName = partner ? (partner.firstName ?? partner.username ?? null) : null;
      descriptor = partnerName ? t("context.chevrusaWith", { name: partnerName }) : t("context.chevrusa");
    } else {
      descriptor = g.name?.trim() || (g.isClass ? t("context.class") : t("context.chabura"));
    }
    byMasechet.set(g.masechetEn, [...(byMasechet.get(g.masechetEn) ?? []), { descriptor, pace: g.pace }]);
  }
  return Array.from(byMasechet, ([masechetEn, entries]) => ({
    masechetEn,
    label:
      entries.length > 1
        ? t("context.multiple", { masechet: masechetName(masechetEn), n: entries.length })
        : t("context.label", { descriptor: entries[0].descriptor, masechet: masechetName(masechetEn) }),
    pace: entries[0].pace,
  }));
}
