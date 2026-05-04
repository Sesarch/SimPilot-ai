// Detects whether a pilot's transmission already contains an explicit ATIS
// confirmation token, so the ATC simulator does not redundantly ask
// "verify you have the current ATIS information."
//
// Recognized patterns (case-insensitive):
//   - "with <Letter/Phonetic>"     e.g. "with E" / "with Echo"
//   - "information <Letter/Phonetic>"
//   - "have information <Phonetic>"
//   - "have <Phonetic>"            e.g. "have Echo"
//   - "with the ATIS"
//   - "with current weather"
//   - "have the numbers"           (only accepted if no active letter is known)
//
// When a current ATIS letter is known, the matched phonetic must equal it for
// the confirmation to be considered "correct"; otherwise any valid phonetic
// counts as a generic confirmation token.

export const ICAO_PHONETIC_BY_LETTER: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
  G: "Golf", H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima",
  M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
  S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey",
  X: "X-ray", Y: "Yankee", Z: "Zulu",
};

export const ICAO_PHONETICS = [
  ...Object.values(ICAO_PHONETIC_BY_LETTER),
  "Juliet", "Whisky", "Xray",
] as const;

const TOKEN_GROUP = `(${[...ICAO_PHONETICS, ...Object.keys(ICAO_PHONETIC_BY_LETTER)].join("|")})`;

const PATTERNS: RegExp[] = [
  new RegExp(`\\bwith\\s+${TOKEN_GROUP}\\b`, "i"),
  new RegExp(`\\binformation\\s+${TOKEN_GROUP}\\b`, "i"),
  new RegExp(`\\bhave\\s+(?:information\\s+)?${TOKEN_GROUP}\\b`, "i"),
  new RegExp(`(?:^|[,;]\\s*|\\s+)${TOKEN_GROUP}[.!?]?\\s*$`, "i"),
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
   * that exact letter. When no current ATIS is known, any token counts.
   */
  matchesCurrent: boolean;
}

export const toAtisPhonetic = (s?: string | null): string | null => {
  if (!s) return null;
  const trimmed = s.trim();
  const singleLetter = trimmed.match(/^[a-z]$/i)?.[0]?.toUpperCase();
  if (singleLetter) return ICAO_PHONETIC_BY_LETTER[singleLetter] ?? null;

  const normalized = trimmed.toLowerCase().replace(/^juliet$/, "juliett").replace(/^whisky$/, "whiskey").replace(/^xray$/, "xray").replace(/-/g, "").replace(/\s+/g, "");
  const match = Object.values(ICAO_PHONETIC_BY_LETTER).find(
    (word) => word.toLowerCase().replace(/-/g, "") === normalized,
  );
  return match ?? null;
};

const norm = (s: string) => toAtisPhonetic(s)?.toLowerCase().replace(/-/g, "") ?? "";

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

  // "with the ATIS" / "with current weather" / "have the numbers" are generic
  // tokens with no current letter. If an active letter is known, require it.
  if (!spoken) {
    return { hasToken: true, spokenPhonetic: null, matchesCurrent: false };
  }

  const matchesCurrent = norm(spoken) === norm(currentAtisLetter);
  return { hasToken: true, spokenPhonetic: spoken, matchesCurrent };
}
