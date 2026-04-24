/**
 * ATC frequency database for the ATC Radio Trainer.
 *
 * Each airport entry lists the radio facilities a pilot would actually tune
 * (CTAF, Tower, Ground, Clearance Delivery, ATIS, Approach, Departure, etc.)
 * with their published frequency. The trainer uses this to determine which
 * controller is on the other end of the radio when the user tunes a frequency,
 * so the AI can respond in-character (and correct callers who address the
 * wrong facility).
 *
 * Frequencies are MHz (VHF). Where an airport has no tower, mark `kind: "CTAF"`
 * — the AI then plays nearby traffic instead of a controller.
 *
 * NOTE: Frequencies are best-effort and meant for training realism, not
 * primary navigation. Always verify against current chart supplements / AFD.
 */
export type FacilityKind =
  | "CTAF"          // Common Traffic Advisory at non-towered fields
  | "TOWER"
  | "GROUND"
  | "CLEARANCE"     // Clearance Delivery
  | "ATIS"          // Information broadcast (no two-way comms)
  | "AWOS"          // Automated weather (no two-way)
  | "APPROACH"
  | "DEPARTURE"
  | "CENTER"        // ARTCC sector
  | "UNICOM"
  | "GUARD";        // 121.5 emergency

export interface AtcFacility {
  kind: FacilityKind;
  /** Frequency in MHz, e.g. 119.2 or 121.65. */
  freq: number;
  /** Display name, e.g. "Montgomery Tower", "SoCal Approach". */
  name: string;
  /** Optional sub-sector or note ("West", "North arrivals"). */
  note?: string;
}

export interface AirportFrequencies {
  icao: string;
  /** Friendly short name used in callsigns ("Montgomery", "Kennedy"). */
  callName: string;
  facilities: AtcFacility[];
}

/**
 * Universal facilities every pilot can tune regardless of airport.
 * Always available alongside airport-specific frequencies.
 */
export const universalFacilities: AtcFacility[] = [
  { kind: "GUARD", freq: 121.5, name: "Guard (Emergency)" },
];

export const atcFrequencies: AirportFrequencies[] = [
  // ---- Southern California GA + majors --------------------------------------
  {
    icao: "KMYF",
    callName: "Montgomery",
    facilities: [
      { kind: "ATIS",      freq: 132.45, name: "Montgomery ATIS" },
      { kind: "CLEARANCE", freq: 124.10, name: "Montgomery Clearance" },
      { kind: "GROUND",    freq: 121.80, name: "Montgomery Ground" },
      { kind: "TOWER",     freq: 119.20, name: "Montgomery Tower" },
      { kind: "APPROACH",  freq: 125.15, name: "SoCal Approach", note: "MYF arrivals" },
      { kind: "DEPARTURE", freq: 125.15, name: "SoCal Departure" },
    ],
  },
  {
    icao: "KSAN",
    callName: "San Diego",
    facilities: [
      { kind: "ATIS",      freq: 134.80, name: "San Diego ATIS" },
      { kind: "CLEARANCE", freq: 118.85, name: "San Diego Clearance" },
      { kind: "GROUND",    freq: 123.90, name: "San Diego Ground" },
      { kind: "TOWER",     freq: 133.30, name: "San Diego Tower" },
      { kind: "APPROACH",  freq: 124.35, name: "SoCal Approach" },
      { kind: "DEPARTURE", freq: 124.35, name: "SoCal Departure" },
    ],
  },
  {
    icao: "KSEE",
    callName: "Gillespie",
    facilities: [
      { kind: "ATIS",   freq: 120.55, name: "Gillespie ATIS" },
      { kind: "GROUND", freq: 121.60, name: "Gillespie Ground" },
      { kind: "TOWER",  freq: 120.70, name: "Gillespie Tower" },
      { kind: "APPROACH", freq: 125.15, name: "SoCal Approach" },
    ],
  },
  {
    icao: "KCRQ",
    callName: "Palomar",
    facilities: [
      { kind: "ATIS",   freq: 127.45, name: "Palomar ATIS" },
      { kind: "GROUND", freq: 121.70, name: "Palomar Ground" },
      { kind: "TOWER",  freq: 118.60, name: "Palomar Tower" },
      { kind: "APPROACH", freq: 124.35, name: "SoCal Approach" },
    ],
  },
  {
    icao: "KSNA",
    callName: "John Wayne",
    facilities: [
      { kind: "ATIS",      freq: 126.00, name: "John Wayne ATIS" },
      { kind: "CLEARANCE", freq: 118.00, name: "John Wayne Clearance" },
      { kind: "GROUND",    freq: 120.80, name: "John Wayne Ground" },
      { kind: "TOWER",     freq: 126.80, name: "John Wayne Tower" },
      { kind: "APPROACH",  freq: 121.30, name: "SoCal Approach" },
    ],
  },
  {
    icao: "KLAX",
    callName: "Los Angeles",
    facilities: [
      { kind: "ATIS",      freq: 133.80, name: "LAX ATIS" },
      { kind: "CLEARANCE", freq: 121.40, name: "LAX Clearance" },
      { kind: "GROUND",    freq: 121.65, name: "LAX Ground", note: "South" },
      { kind: "GROUND",    freq: 121.75, name: "LAX Ground", note: "North" },
      { kind: "TOWER",     freq: 133.90, name: "LAX Tower", note: "South complex" },
      { kind: "TOWER",     freq: 120.95, name: "LAX Tower", note: "North complex" },
      { kind: "APPROACH",  freq: 124.30, name: "SoCal Approach" },
      { kind: "DEPARTURE", freq: 125.20, name: "SoCal Departure" },
    ],
  },
  // ---- Other US majors ------------------------------------------------------
  {
    icao: "KJFK",
    callName: "Kennedy",
    facilities: [
      { kind: "ATIS",      freq: 128.725, name: "JFK ATIS" },
      { kind: "CLEARANCE", freq: 135.05,  name: "JFK Clearance" },
      { kind: "GROUND",    freq: 121.90,  name: "JFK Ground" },
      { kind: "TOWER",     freq: 119.10,  name: "JFK Tower" },
      { kind: "APPROACH",  freq: 132.40,  name: "New York Approach" },
      { kind: "DEPARTURE", freq: 135.90,  name: "New York Departure" },
    ],
  },
  {
    icao: "KORD",
    callName: "O'Hare",
    facilities: [
      { kind: "ATIS",      freq: 135.40, name: "O'Hare ATIS" },
      { kind: "CLEARANCE", freq: 121.75, name: "O'Hare Clearance" },
      { kind: "GROUND",    freq: 121.90, name: "O'Hare Ground" },
      { kind: "TOWER",     freq: 120.75, name: "O'Hare Tower" },
      { kind: "APPROACH",  freq: 119.00, name: "Chicago Approach" },
    ],
  },
  {
    icao: "KATL",
    callName: "Atlanta",
    facilities: [
      { kind: "ATIS",      freq: 119.65, name: "Atlanta ATIS" },
      { kind: "CLEARANCE", freq: 118.10, name: "Atlanta Clearance" },
      { kind: "GROUND",    freq: 121.90, name: "Atlanta Ground" },
      { kind: "TOWER",     freq: 119.10, name: "Atlanta Tower" },
      { kind: "APPROACH",  freq: 127.25, name: "Atlanta Approach" },
    ],
  },
  {
    icao: "KSFO",
    callName: "San Francisco",
    facilities: [
      { kind: "ATIS",      freq: 113.70, name: "SFO ATIS" },
      { kind: "CLEARANCE", freq: 118.20, name: "SFO Clearance" },
      { kind: "GROUND",    freq: 121.80, name: "SFO Ground" },
      { kind: "TOWER",     freq: 120.50, name: "SFO Tower" },
      { kind: "APPROACH",  freq: 135.65, name: "NorCal Approach" },
    ],
  },
  {
    icao: "KSEA",
    callName: "Seattle",
    facilities: [
      { kind: "ATIS",      freq: 118.00, name: "Seattle ATIS" },
      { kind: "CLEARANCE", freq: 128.00, name: "Seattle Clearance" },
      { kind: "GROUND",    freq: 121.70, name: "Seattle Ground" },
      { kind: "TOWER",     freq: 119.90, name: "Seattle Tower" },
      { kind: "APPROACH",  freq: 120.40, name: "Seattle Approach" },
    ],
  },
  {
    icao: "KBOS",
    callName: "Boston",
    facilities: [
      { kind: "ATIS",      freq: 135.00, name: "Boston ATIS" },
      { kind: "CLEARANCE", freq: 121.65, name: "Boston Clearance" },
      { kind: "GROUND",    freq: 121.90, name: "Boston Ground" },
      { kind: "TOWER",     freq: 128.80, name: "Boston Tower" },
      { kind: "APPROACH",  freq: 118.25, name: "Boston Approach" },
    ],
  },
  {
    icao: "KDEN",
    callName: "Denver",
    facilities: [
      { kind: "ATIS",      freq: 125.60, name: "Denver ATIS" },
      { kind: "CLEARANCE", freq: 118.75, name: "Denver Clearance" },
      { kind: "GROUND",    freq: 121.85, name: "Denver Ground" },
      { kind: "TOWER",     freq: 132.35, name: "Denver Tower" },
      { kind: "APPROACH",  freq: 120.35, name: "Denver Approach" },
    ],
  },
  {
    icao: "KDFW",
    callName: "Dallas",
    facilities: [
      { kind: "ATIS",      freq: 117.00, name: "DFW ATIS" },
      { kind: "CLEARANCE", freq: 128.25, name: "DFW Clearance" },
      { kind: "GROUND",    freq: 121.65, name: "DFW Ground" },
      { kind: "TOWER",     freq: 124.15, name: "DFW Tower" },
      { kind: "APPROACH",  freq: 125.20, name: "Regional Approach" },
    ],
  },
  {
    icao: "KLAS",
    callName: "Las Vegas",
    facilities: [
      { kind: "ATIS",      freq: 132.40, name: "Vegas ATIS" },
      { kind: "CLEARANCE", freq: 118.00, name: "Vegas Clearance" },
      { kind: "GROUND",    freq: 121.90, name: "Vegas Ground" },
      { kind: "TOWER",     freq: 119.90, name: "Vegas Tower" },
      { kind: "APPROACH",  freq: 125.10, name: "Vegas Approach" },
    ],
  },
];

const FREQ_TOLERANCE_MHZ = 0.015; // ~one slot @ 25 kHz spacing

export function getAirportFrequencies(icao: string): AirportFrequencies | null {
  const up = icao.trim().toUpperCase();
  return atcFrequencies.find((a) => a.icao === up) ?? null;
}

/**
 * Resolve a tuned frequency at a given airport to the facility on the other end.
 * Returns `null` if no facility within tolerance — the AI should treat that as
 * dead air / wrong frequency (no response).
 */
export function lookupFacility(
  icao: string,
  freqMHz: number,
): { airport: AirportFrequencies | null; facility: AtcFacility | null; isUniversal: boolean } {
  // Universal first (Guard, etc.) — these win regardless of airport.
  for (const f of universalFacilities) {
    if (Math.abs(f.freq - freqMHz) <= FREQ_TOLERANCE_MHZ) {
      return { airport: null, facility: f, isUniversal: true };
    }
  }
  const airport = getAirportFrequencies(icao);
  if (!airport) return { airport: null, facility: null, isUniversal: false };
  let best: { facility: AtcFacility; delta: number } | null = null;
  for (const f of airport.facilities) {
    const delta = Math.abs(f.freq - freqMHz);
    if (delta <= FREQ_TOLERANCE_MHZ && (!best || delta < best.delta)) {
      best = { facility: f, delta };
    }
  }
  return { airport, facility: best?.facility ?? null, isUniversal: false };
}

export function formatFreq(freqMHz: number): string {
  // Always 3 decimals: 119.200
  return freqMHz.toFixed(3);
}

export function parseFreqInput(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const v = parseFloat(cleaned);
  if (!Number.isFinite(v)) return null;
  // Clamp to VHF aviation band 118.000 – 136.975
  if (v < 118 || v > 137) return null;
  return Math.round(v * 1000) / 1000;
}
