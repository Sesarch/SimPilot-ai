// Detects whether a pilot's transmission already contains an explicit ATIS
// confirmation token, so the ATC simulator does not redundantly ask
// "verify you have the current ATIS information."
//
// Recognized patterns (case-insensitive):
//   - "with <Phonetic>"            e.g. "with Echo"
//   - "information <Phonetic>"     e.g. "information Echo"
//   - "have information <Phonetic>"
//   - "have <Phonetic>"            e.g. "have Echo"
//   - "with the ATIS"
//   - "with current weather"
//   - "have the numbers"           (non-ATIS field substitute)
//
// When a current ATIS letter is known, the matched phonetic must equal it for
// the confirmation to be considered "correct"; otherwise any valid phonetic
// counts as a generic confirmation token.

export const ICAO_PHONETICS = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel",
  "India", "Juliett", "Juliet", "Kilo", "Lima", "Mike", "November", "Oscar",
  "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor",
  "Whiskey", "Whisky", "X-ray", "Xray", "Yankee", "Zulu",
] as const;

const PHONETIC_GROUP = `(${ICAO_PHONETICS.join("|")})`;

const PATTERNS: RegExp[] = [
  new RegExp(`\\bwith\\s+${PHONETIC_GROUP}\\b`, "i"),
  new RegExp(`\\binformation\\s+${PHONETIC_GROUP}\\b`, "i"),
  new RegExp(`\\bhave\\s+(?:information\\s+)?${PHONETIC_GROUP}\\b`, "i"),
  /\bwith\s+the\s+atis\b/i,
  /\bwith\s+current\s+weather\b/i,
  /\bhave\s+the\s+numbers\b/i,
];

export interface AtisIntentResult {
  /** Pilot's transmission contains an explicit ATIS-confirmation token. */
  hasToken: boolean;
  /** The phonetic letter word the pilot stated, if any (e.g. "Echo"). */
  spokenPhonetic: string | null;
  /**
   * True only when a `currentAtisLetter` was provided AND the pilot stated
   * that exact letter (or said "with the ATIS" / "with current weather" /
   * "have the numbers"). When no current ATIS is known, any token counts.
   */
  matchesCurrent: boolean;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/^juliet$/, "juliett").replace(/-/g, "").replace(/\s+/g, "");

/**
 * Inspect a pilot transmission for an ATIS-confirmation token.
 *
 * @param text                Raw pilot transmission.
 * @param currentAtisLetter   Active ATIS phonetic word ("Echo") or null.
 */
export function detectAtisIntent(
  text: string,
  currentAtisLetter?: string | null,
): AtisIntentResult {
  if (!text) return { hasToken: false, spokenPhonetic: null, matchesCurrent: false };

  let spoken: string | null = null;
  let matched = false;

  for (const re of PATTERNS) {
    const m = text.match(re);
    if (m) {
      matched = true;
      if (m[1]) spoken = m[1];
      break;
    }
  }

  if (!matched) {
    return { hasToken: false, spokenPhonetic: null, matchesCurrent: false };
  }

  // No active ATIS reference → any valid token counts.
  if (!currentAtisLetter) {
    return { hasToken: true, spokenPhonetic: spoken, matchesCurrent: true };
  }

  // "with the ATIS" / "with current weather" / "have the numbers" — generic
  // tokens with no phonetic. Treat as matching current.
  if (!spoken) {
    return { hasToken: true, spokenPhonetic: null, matchesCurrent: true };
  }

  const matchesCurrent = norm(spoken) === norm(currentAtisLetter);
  return { hasToken: true, spokenPhonetic: spoken, matchesCurrent };
}
