/**
 * Phonetic expansion for ATC TTS.
 *
 * The on-screen transcript stays untouched (pilots see "28R", "121.7", "N123AB").
 * Before sending to the speech engine we expand to spoken FAA phraseology so the
 * voice says "two eight right", "one two one point seven", "November one two
 * three Alpha Bravo". Always uses "niner" for 9.
 *
 * Designed to be idempotent and safe on already-spoken text.
 */

const PHONETIC: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo",
  F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliett",
  K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar",
  P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango",
  U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray", Y: "Yankee",
  Z: "Zulu",
};

const DIGITS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
  "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "niner",
};

const RUNWAY_SIDE: Record<string, string> = { L: "left", R: "right", C: "center" };

const speakDigits = (s: string) =>
  s.split("").map((c) => DIGITS[c] ?? c).join(" ");

/**
 * Expand a single token like "28R" or "9L" into "two eight right".
 */
function expandRunway(num: string, side: string): string {
  const spokenNum = speakDigits(num);
  const spokenSide = RUNWAY_SIDE[side.toUpperCase()] ?? "";
  return spokenSide ? `${spokenNum} ${spokenSide}` : spokenNum;
}

/**
 * Expand "121.7" or "118.300" into "one two one point seven".
 */
function expandFrequency(whole: string, frac: string): string {
  // Trim trailing zeros on the fractional part for natural cadence.
  const trimmed = frac.replace(/0+$/, "") || "0";
  return `${speakDigits(whole)} point ${speakDigits(trimmed)}`;
}

/**
 * Expand an N-number like "N123AB" into "November one two three Alpha Bravo".
 */
function expandTailNumber(raw: string): string {
  const up = raw.toUpperCase();
  return up
    .split("")
    .map((c) => {
      if (DIGITS[c]) return DIGITS[c];
      if (PHONETIC[c]) return PHONETIC[c];
      return c;
    })
    .join(" ");
}

/**
 * Main entry point. Apply to any ATC string before sending to TTS.
 */
export function expandPhoneticForSpeech(input: string): string {
  if (!input) return input;
  let t = ` ${input} `;

  // 1. Tail numbers: N followed by 1–5 digits and 0–2 letters.
  t = t.replace(/\b(N\d{1,5}[A-Z]{0,2})\b/g, (_, n) => expandTailNumber(n));

  // 2. Runway designators: "Runway 28R", "RWY 9L", or bare "28R".
  t = t.replace(/\b(?:runway|rwy)\s*(\d{1,2})([LRC])?\b/gi, (_, num, side) =>
    `Runway ${expandRunway(num, side ?? "")}`,
  );
  t = t.replace(/\b(\d{1,2})([LRC])\b/g, (_, num, side) => expandRunway(num, side));

  // 3. Frequencies: 121.7 / 118.300.
  t = t.replace(/\b(1[12]\d)\.(\d{1,3})\b/g, (_, w, f) => expandFrequency(w, f));

  // 4. Squawk codes: "squawk 4271" → "squawk four two seven one".
  t = t.replace(/\bsquawk\s+(\d{4})\b/gi, (_, code) => `squawk ${speakDigits(code)}`);

  // 5. Headings / altitudes spoken as "heading 090" or "two thousand five
  //    hundred" — the model usually formats these correctly already, so we
  //    only touch obvious 3-digit headings.
  t = t.replace(/\bheading\s+(\d{3})\b/gi, (_, h) => `heading ${speakDigits(h)}`);

  // 6. Standalone phonetic letters spoken with leading "Information " or
  //    "with " — expand single capital letter to its NATO word.
  t = t.replace(/\b(Information|with|have)\s+([A-Z])\b/g, (_, lead, l) => `${lead} ${PHONETIC[l] ?? l}`);

  // 7. Replace "9" with "niner" inside any remaining bare digit groups
  //    (e.g. "altitude five thousand niner hundred").
  //    Only operate on isolated digit runs to avoid corrupting the above
  //    structured replacements.
  t = t.replace(/\b\d+\b/g, (run) => speakDigits(run));

  return t.replace(/\s+/g, " ").trim();
}
