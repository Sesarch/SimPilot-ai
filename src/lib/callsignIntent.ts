// Detects whether a pilot's transmission contains their aircraft callsign.
// Used by the ATC simulator to enforce FAA readback discipline: a pilot's
// reply to a controller instruction MUST include the aircraft's callsign.
//
// Recognizes a wide range of spoken/written variations of an N-number:
//   N123AB           → "N123AB", "N-123AB", "N 1 2 3 A B"
//   spelled digits   → "one two three alpha bravo"
//   short form       → "3AB", "Three Alpha Bravo", "three alpha bravo"
//   type prefix      → "Cessna 3AB", "Skyhawk Three Alpha Bravo"
//
// Designed to be permissive (accept any reasonable variant) but never to
// produce false positives on unrelated tokens.

const DIGIT_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", fower: "4",
  five: "5", fife: "5", six: "6", seven: "7", eight: "8", nine: "9", niner: "9",
};

const LETTER_WORDS: Record<string, string> = {
  alpha: "A", bravo: "B", charlie: "C", delta: "D", echo: "E", foxtrot: "F",
  golf: "G", hotel: "H", india: "I", juliett: "J", juliet: "J", kilo: "K",
  lima: "L", mike: "M", november: "N", oscar: "O", papa: "P", quebec: "Q",
  romeo: "R", sierra: "S", tango: "T", uniform: "U", victor: "V",
  whiskey: "W", whisky: "W", xray: "X", "x-ray": "X", yankee: "Y", zulu: "Z",
};

/**
 * Collapse a transmission into an alphanumeric "callsign signature":
 * spelled-out phonetics and digit words become their letters/numbers,
 * everything else is dropped. e.g. "Cessna three alpha bravo" → "3AB".
 */
function callsignSignature(text: string): string {
  if (!text) return "";
  // Normalize hyphens (e.g. "x-ray", "N-123AB") so word splitting works.
  const tokens = text
    .toLowerCase()
    .replace(/-/g, " ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  let out = "";
  for (const tok of tokens) {
    if (DIGIT_WORDS[tok] !== undefined) {
      out += DIGIT_WORDS[tok];
      continue;
    }
    if (LETTER_WORDS[tok] !== undefined) {
      out += LETTER_WORDS[tok];
      continue;
    }
    if (/^[a-z0-9]+$/.test(tok)) {
      // Raw alphanumeric chunk (e.g. "n123ab", "3ab") — keep uppercase.
      out += tok.toUpperCase();
    }
  }
  return out;
}

/**
 * Build the canonical short forms of a callsign that count as a valid readback.
 * For "N123AB" we accept the full sign and the last-3 short form ("3AB").
 */
function callsignVariants(callsign: string): string[] {
  const sig = callsignSignature(callsign);
  if (!sig) return [];
  const variants = new Set<string>();
  variants.add(sig);                                // N123AB
  if (sig.startsWith("N")) variants.add(sig.slice(1)); // 123AB
  // Standard FAA short form: last digit + last two letters (e.g. 3AB).
  const m = sig.match(/^N?(\d+)([A-Z]+)$/);
  if (m) {
    const digits = m[1];
    const letters = m[2];
    if (digits.length >= 1 && letters.length >= 1) {
      variants.add(digits.slice(-1) + letters);          // 3AB
      variants.add(digits.slice(-2) + letters);          // 23AB
    }
  }
  return [...variants].filter((v) => v.length >= 2);
}

export interface CallsignIntentResult {
  /** True when the transmission contains the aircraft's callsign in any form. */
  hasCallsign: boolean;
  /** The variant matched (e.g. "N123AB", "3AB"), if any. */
  matchedVariant: string | null;
}

/**
 * Inspect a pilot transmission for the aircraft's callsign.
 *
 * @param text       Raw pilot transmission.
 * @param callsign   Registered callsign (e.g. "N123AB"). When omitted/empty
 *                   the function returns hasCallsign=true (no enforcement).
 */
export function detectCallsignIntent(
  text: string,
  callsign?: string | null,
): CallsignIntentResult {
  if (!callsign) return { hasCallsign: true, matchedVariant: null };
  if (!text) return { hasCallsign: false, matchedVariant: null };

  const variants = callsignVariants(callsign);
  if (variants.length === 0) return { hasCallsign: true, matchedVariant: null };

  const sig = callsignSignature(text);
  if (!sig) return { hasCallsign: false, matchedVariant: null };

  // Match the longest variant first to prefer the most specific form.
  const sorted = [...variants].sort((a, b) => b.length - a.length);
  for (const v of sorted) {
    if (sig.includes(v)) return { hasCallsign: true, matchedVariant: v };
  }
  return { hasCallsign: false, matchedVariant: null };
}
