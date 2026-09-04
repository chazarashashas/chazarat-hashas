const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל"];

/**
 * Converts a small positive integer (perek numbers go up to 30, for
 * Keilim) into its traditional Hebrew numeral. 15 and 16 use טו/טז
 * rather than יה/יו, per the standard convention avoiding forms that
 * resemble God's name.
 */
export function hebrewNumeral(n: number): string {
  if (n === 15) return "טו";
  if (n === 16) return "טז";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + ONES[ones];
}
