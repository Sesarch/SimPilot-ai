// Convert raw ATIS text into speech-friendly text so TTS pronounces aviation
// abbreviations and identifiers correctly. The DISPLAYED text is unchanged —
// this transform is applied ONLY before sending to the TTS engine.

const PHONETIC: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo",
  F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliett",
  K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar",
  P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango",
  U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray", Y: "Yankee",
  Z: "Zulu",
};

const DIGIT_WORDS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
  "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "niner",
};

const speakDigits = (s: string) =>
  s.split("").map((c) => DIGIT_WORDS[c] ?? c).join(" ");

export function formatAtisForSpeech(raw: string): string {
  if (!raw) return "";
  let t = ` ${raw} `;

  // Common abbreviations (case-insensitive, word-boundary aware)
  t = t.replace(/\bintl\b\.?/gi, "International");
  t = t.replace(/\binfo(?:rmation)?\b\.?/gi, "Information");
  t = t.replace(/\balt(?:imeter)?\b\.?/gi, "Altimeter");
  t = t.replace(/\bvis(?:ibility)?\b\.?/gi, "visibility");
  t = t.replace(/\btemp\b\.?/gi, "temperature");
  t = t.replace(/\bdewpt\b\.?|\bdp\b/gi, "dewpoint");
  t = t.replace(/\brwy\b\.?/gi, "runway");
  t = t.replace(/\bhdg\b\.?/gi, "heading");
  t = t.replace(/\bwx\b\.?/gi, "weather");
  t = t.replace(/\bsm\b\.?/gi, "statute miles");
  t = t.replace(/\bnm\b\.?/gi, "nautical miles");
  t = t.replace(/\bft\b\.?/gi, "feet");

  // Knots: "10kt", "10 kts", "10 kt"
  t = t.replace(/(\d)\s*kts?\b/gi, "$1 knots");
  t = t.replace(/\bkts?\b/gi, "knots");

  // Zulu time: "1350z" or "1350 z" → "one three five zero Zulu"
  t = t.replace(/\b(\d{3,4})\s*z\b/gi, (_m, d) => `${speakDigits(d)} Zulu`);

  // Information letter: "Information E" → "Information Echo"
  t = t.replace(/\b(Information)\s+([A-Z])\b/g, (_m, w, l) => `${w} ${PHONETIC[l] ?? l}`);

  // Collapse extra whitespace
  return t.replace(/\s+/g, " ").trim();
}
