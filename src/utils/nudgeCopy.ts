/** Joins a nudge strip's real-data clauses into one sentence, dropping
    any clause whose count was zero rather than printing "0 notes".
    `fallback` is shown only when every clause was zero (nothing real to
    name yet) — the normal case is just the clauses themselves, a plain
    statement of what's there rather than a reminder of where it lives. */
export function nudgeCopy(clauses: (string | null)[], fallback: string): string {
  const real = clauses.filter((c): c is string => c !== null);
  return real.length === 0 ? fallback : `${real.join(" and ")}.`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}
