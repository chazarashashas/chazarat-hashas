import { Location, Zmanim } from "@hebcal/core";
import { parseDate } from "./chagCalendar";

/** Nightfall as most luach calendars print it: the sun 8.5° below the
    horizon (tzeit hakochavim). */
const TZEIT_DEGREES = 8.5;

/** hebcal's built-in cities, looked up by name through its public API. */
const CITY_NAMES = [
  "Ashdod", "Atlanta", "Austin", "Baghdad", "Beer Sheva", "Berlin", "Baltimore", "Bogota", "Boston", "Budapest",
  "Buenos Aires", "Buffalo", "Chicago", "Cincinnati", "Cleveland", "Dallas", "Denver", "Detroit", "Eilat", "Gibraltar",
  "Haifa", "Hawaii", "Helsinki", "Houston", "Jerusalem", "Johannesburg", "Kiev", "La Paz", "Livingston", "Las Vegas",
  "London", "Los Angeles", "Marseilles", "Miami", "Minneapolis", "Melbourne", "Mexico City", "Montreal", "Moscow",
  "New York", "Omaha", "Ottawa", "Panama City", "Paris", "Pawtucket", "Petach Tikvah", "Philadelphia", "Phoenix",
  "Pittsburgh", "Providence", "Portland", "Saint Louis", "Saint Petersburg", "San Diego", "San Francisco", "Sao Paulo",
  "Seattle", "Sydney", "Tel Aviv", "Tiberias", "Toronto", "Vancouver", "White Plains", "Washington DC", "Worcester",
];

/** Other names a device may report for the same zone. */
const ALIASES: Record<string, string> = {
  "Asia/Tel_Aviv": "Asia/Jerusalem",
  Israel: "Asia/Jerusalem",
  // Same clock and nightfall within minutes; some devices in Israel and
  // Yehuda v'Shomron report these.
  "Asia/Hebron": "Asia/Jerusalem",
  "Asia/Gaza": "Asia/Jerusalem",
  "Europe/Kyiv": "Europe/Kiev",
  "America/Montreal": "America/Toronto",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "US/Eastern": "America/New_York",
  "US/Central": "America/Chicago",
  "US/Mountain": "America/Denver",
  "US/Pacific": "America/Los_Angeles",
  "US/Hawaii": "Pacific/Honolulu",
  "US/Arizona": "America/Phoenix",
  "Canada/Eastern": "America/Toronto",
  "Canada/Pacific": "America/Vancouver",
  GB: "Europe/London",
  "W-SU": "Europe/Moscow",
};

let byZone: Map<string, Location[]> | null = null;

function citiesIn(tzid: string): Location[] {
  if (!byZone) {
    byZone = new Map();
    for (const name of CITY_NAMES) {
      const loc = Location.lookup(name);
      if (!loc) continue;
      const zone = loc.getTzid();
      byZone.set(zone, [...(byZone.get(zone) ?? []), loc]);
    }
  }
  return byZone.get(ALIASES[tzid] ?? tzid) ?? [];
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

const cache = new Map<string, Date | null>();

/**
 * Nightfall on a date for someone in a time zone, without asking where they
 * are: the latest nightfall among the Jewish communities in that zone, so it
 * is never early for any of them (at most some minutes late for the eastern
 * or southern ones). Null for a zone with no known community — callers then
 * wait for the next date.
 */
export function nightfallFor(date: string, tzid: string | null): Date | null {
  if (!tzid) return null;
  const key = `${tzid}|${date}`;
  if (cache.has(key)) return cache.get(key)!;
  let latest: number | null = null;
  for (const loc of citiesIn(tzid)) {
    const t = new Zmanim(loc, parseDate(date), false).tzeit(TZEIT_DEGREES);
    const ms = t instanceof Date ? t.getTime() : NaN;
    if (!Number.isNaN(ms) && (latest === null || ms > latest)) latest = ms;
  }
  const result = latest === null ? null : new Date(latest);
  cache.set(key, result);
  return result;
}
