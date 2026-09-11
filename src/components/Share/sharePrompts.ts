import type { MomentType, ShareMoment } from "./shareMoments";

/**
 * When a share prompt may appear (SHARE-BRIEF.md "Frequency rules"):
 * - one prompt a day at most, and when two land together the heavier wins;
 * - never the same type twice in a week;
 * - "Not now" quiets that type for 30 days — not an hour;
 * - nothing on a first visit.
 * Declining never removes sharing: every moment stays shareable on demand
 * from its own screen.
 */

const KEY = "chazarat-hashas:sharePrompts";
const FIRST_SEEN_KEY = "chazarat-hashas:firstSeen";

interface PromptState {
  lastShownDate: string | null;
  shown: Partial<Record<MomentType, string>>;
  quietUntil: Partial<Record<MomentType, string>>;
}

const EMPTY: PromptState = { lastShownDate: null, shown: {}, quietUntil: {} };

function read(): PromptState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(s: PromptState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable — prompts just can't be rationed on this device.
  }
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The first day this device opened the app — recorded once. */
export function markFirstSeen(today: string) {
  try {
    if (!localStorage.getItem(FIRST_SEEN_KEY)) localStorage.setItem(FIRST_SEEN_KEY, today);
  } catch {
    // ignore
  }
}

function firstSeen(): string | null {
  try {
    return localStorage.getItem(FIRST_SEEN_KEY);
  } catch {
    return null;
  }
}

/** Of the moments that just happened, the one (if any) that may prompt
    today — the heaviest that the rules allow. */
export function pickPrompt(candidates: (ShareMoment | null | undefined)[], today: string): ShareMoment | null {
  const s = read();
  if (s.lastShownDate === today) return null;
  const seen = firstSeen();
  if (!seen || seen === today) return null;
  const allowed = candidates
    .filter((m): m is ShareMoment => !!m)
    .filter((m) => !(s.quietUntil[m.type] && s.quietUntil[m.type]! > today))
    .filter((m) => !(s.shown[m.type] && addDays(s.shown[m.type]!, 7) > today))
    .sort((a, b) => b.weight - a.weight);
  return allowed[0] ?? null;
}

export function recordPromptShown(type: MomentType, today: string) {
  const s = read();
  write({ ...s, lastShownDate: today, shown: { ...s.shown, [type]: today } });
}

export function dismissPrompt(type: MomentType, today: string) {
  const s = read();
  write({ ...s, quietUntil: { ...s.quietUntil, [type]: addDays(today, 30) } });
}
