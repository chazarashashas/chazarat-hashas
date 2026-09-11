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
  const byMasechet = new Map<string, { descriptor: string; pace: GroupPace }[]>();
  for (const g of groups) {
    let descriptor: string;
    if (!g.isChabura) {
      const partner = g.members.find((m) => m.userId !== session?.user.id);
      const partnerName = partner ? (partner.firstName ?? partner.username ?? null) : null;
      descriptor = partnerName ? `Chevrusa with ${partnerName}` : "Chevrusa";
    } else {
      descriptor = g.name?.trim() || (g.isClass ? "Class" : "Chabura");
    }
    byMasechet.set(g.masechetEn, [...(byMasechet.get(g.masechetEn) ?? []), { descriptor, pace: g.pace }]);
  }
  return Array.from(byMasechet, ([masechetEn, entries]) => ({
    masechetEn,
    label: entries.length > 1 ? `${masechetEn} (${entries.length} groups)` : `${entries[0].descriptor} — ${masechetEn}`,
    pace: entries[0].pace,
  }));
}
