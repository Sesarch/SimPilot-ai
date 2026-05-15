/**
 * Progressive Flight Chain — phase model + randomized controller interruptions.
 *
 * The trainer LLM emits `[STATE phase=...]` markers that get merged into
 * `flightState.phase`. This module:
 *
 *   1. Normalizes any free-form phase string into a canonical FlightPhase.
 *   2. Generates realistic mid-state controller interruptions
 *      ("hold position for crossing traffic on Juliet", "extend downwind,
 *      I'll call your base"). Real-world pilots get interrupted constantly;
 *      a strict trainer must simulate that.
 *
 * Pure / side-effect free so it's easy to unit test.
 */

import type { FacilityKind } from "@/data/atcFrequencies";

export type FlightPhase =
  | "PRE_TAXI"
  | "TAXIING"
  | "RUNUP"
  | "TOWER_HANDOFF"
  | "DEPARTURE"
  | "PATTERN"
  | "UNKNOWN";

/** Map any LLM-emitted phase string to the canonical enum. */
export function normalizePhase(raw?: string | null): FlightPhase {
  if (!raw) return "UNKNOWN";
  const s = raw.toLowerCase();
  if (/(pre[\s_-]?taxi|clearance|pre[\s_-]?flight|cleared\s+to\s+taxi)/.test(s)) return "PRE_TAXI";
  if (/(tax[i]?ing|taxi)/.test(s)) return "TAXIING";
  if (/(run[\s_-]?up|holding[\s_-]?short)/.test(s)) return "RUNUP";
  if (/(handoff|hand[\s_-]?off|tower[\s_-]?transition|switching\s+to\s+tower)/.test(s)) return "TOWER_HANDOFF";
  if (/(departure|departing|climb[\s_-]?out|en[\s_-]?route)/.test(s)) return "DEPARTURE";
  if (/(pattern|downwind|base|final|closed[\s_-]?traffic|touch[\s_-]?and[\s_-]?go)/.test(s)) return "PATTERN";
  return "UNKNOWN";
}

/** Short callsign rendering — same convention as atcValidation.shortCallsign. */
function shortCallsign(cs?: string | null): string {
  if (!cs) return "Aircraft";
  const m = cs.toUpperCase().replace(/[^A-Z0-9]/g, "").match(/^N?(\d+)([A-Z]+)$/);
  if (!m) return cs.toUpperCase();
  return `${m[1].slice(-1)}${m[2]}`;
}

const TAXIWAYS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Juliett", "Kilo"];
const TRAFFIC = [
  "a Cessna 172",
  "a Cirrus on the inner",
  "a King Air taxiing for departure",
  "a Piper coming out of transient parking",
  "a Bonanza on the parallel",
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Build a controller interruption string. Returns null if no interruption is
 * appropriate for the current phase. The 30% probability gate is applied by
 * the caller so this stays deterministic for tests when wrapped with a fixed
 * RNG.
 */
export function buildInterruption(
  phase: FlightPhase,
  callsign: string,
  facilityKind?: FacilityKind | null,
): string | null {
  const cs = shortCallsign(callsign);

  if (phase === "TAXIING" && (facilityKind === "GROUND" || facilityKind === "TOWER" || !facilityKind)) {
    const variants = [
      `${cs}, hold position for crossing traffic on taxiway ${pick(TAXIWAYS)}.`,
      `${cs}, give way to ${pick(TRAFFIC)}, then continue taxi.`,
      `${cs}, hold short of taxiway ${pick(TAXIWAYS)} for departing traffic.`,
      `${cs}, expedite crossing — landing traffic short final.`,
    ];
    return pick(variants);
  }

  if (phase === "PATTERN" && (facilityKind === "TOWER" || !facilityKind)) {
    const variants = [
      `${cs}, extend downwind, I'll call your base for landing traffic.`,
      `${cs}, make short approach if able, traffic on a 3 mile final.`,
      `${cs}, change to full-stop, cleared to land runway 28R.`,
      `${cs}, follow the Cessna on base, number two for the runway.`,
      `${cs}, go around, traffic on the runway.`,
    ];
    return pick(variants);
  }

  return null;
}

/**
 * Roll the 30% interruption gate and return the controller line, or null.
 * Exposed as a single call so the trainer doesn't have to know the
 * probability or which phases are eligible.
 */
export function maybeInjectInterruption(
  phase: FlightPhase,
  callsign: string,
  facilityKind?: FacilityKind | null,
  rng: () => number = Math.random,
): string | null {
  if (phase !== "TAXIING" && phase !== "PATTERN") return null;
  if (rng() >= 0.3) return null;
  return buildInterruption(phase, callsign, facilityKind);
}
