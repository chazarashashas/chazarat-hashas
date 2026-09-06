/** Joins a nudge strip's real-data clauses into one sentence, dropping
    any clause whose count was zero rather than printing "0 notes". */
export function nudgeCopy(clauses: (string | null)[], tail: string): string {
  const real = clauses.filter((c): c is string => c !== null);
  if (real.length === 0) return tail;
  return `${real.join(" and ")}, ${tail.charAt(0).toLowerCase()}${tail.slice(1)}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}
