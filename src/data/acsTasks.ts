/**
 * Lookup table for FAA ACS (Airman Certification Standards) task codes.
 * Used to resolve human-readable titles for ACS code chips in the UI.
 *
 * Naming format: <Cert>.<Area>.<Task>[.<Element>]
 *   PA = Private Pilot Airplane
 *   IR = Instrument Rating Airplane
 *   CA = Commercial Airplane
 *   FI = Flight Instructor (CFI)
 *
 * Element suffixes:
 *   K# = Knowledge element
 *   R# = Risk Management element
 *   S# = Skill element
 */

export type AcsTaskInfo = {
  code: string;
  area: string;     // e.g. "Preflight Preparation"
  task: string;     // e.g. "Preflight Procedures"
  description?: string;
};

// Areas of Operation per cert
const PA_AREAS: Record<string, string> = {
  I: "Preflight Preparation",
  II: "Preflight Procedures",
  III: "Airport & Seaplane Base Operations",
  IV: "Takeoffs, Landings, & Go-Arounds",
  V: "Performance & Ground Reference Maneuvers",
  VI: "Navigation",
  VII: "Slow Flight & Stalls",
  VIII: "Basic Instrument Maneuvers",
  IX: "Emergency Operations",
  X: "Night Operations",
  XI: "Postflight Procedures",
};

// Common Private Pilot tasks (most-referenced in the app)
const PA_TASKS: Record<string, { task: string; description?: string }> = {
  "PA.I.A": { task: "Pilot Qualifications", description: "Certification, currency, and 14 CFR Part 61 requirements." },
  "PA.I.B": { task: "Airworthiness Requirements", description: "Aircraft documentation, inspections (AVIATE), and AD compliance." },
  "PA.I.C": { task: "Weather Information", description: "METARs, TAFs, AIRMETs/SIGMETs, and weather decision making." },
  "PA.I.D": { task: "Cross-Country Flight Planning", description: "Route, fuel, performance, and nav log preparation." },
  "PA.I.E": { task: "National Airspace System", description: "Controlled/uncontrolled airspace and entry requirements." },
  "PA.I.F": { task: "Performance & Limitations", description: "Weight & balance, takeoff/landing distances, density altitude." },
  "PA.I.G": { task: "Operation of Systems", description: "Aircraft systems: powerplant, electrical, fuel, vacuum, avionics." },
  "PA.I.H": { task: "Human Factors", description: "Aeromedical factors, hypoxia, hyperventilation, spatial disorientation." },
  "PA.I.I": { task: "Water & Seaplane Characteristics (if applicable)" },
  "PA.I.J": { task: "Aeronautical Decision Making", description: "ADM, DECIDE model, PAVE, IMSAFE, hazardous attitudes." },
  "PA.I.K": { task: "ATC Communications", description: "Phraseology, frequency management, and lost-comm procedures." },
  "PA.II.A": { task: "Preflight Inspection" },
  "PA.II.B": { task: "Flight Deck Management" },
  "PA.II.C": { task: "Engine Starting" },
  "PA.II.D": { task: "Taxiing" },
  "PA.II.E": { task: "Before Takeoff Check" },
  "PA.III.A": { task: "Communications, Light Signals, & Runway Lighting" },
  "PA.III.B": { task: "Traffic Patterns" },
  "PA.IV.A": { task: "Normal Takeoff & Climb" },
  "PA.IV.B": { task: "Normal Approach & Landing" },
  "PA.IV.C": { task: "Soft-Field Takeoff & Climb" },
  "PA.IV.D": { task: "Soft-Field Approach & Landing" },
  "PA.IV.E": { task: "Short-Field Takeoff & Climb" },
  "PA.IV.F": { task: "Short-Field Approach & Landing" },
  "PA.IV.M": { task: "Forward Slip to a Landing" },
  "PA.IV.N": { task: "Go-Around / Rejected Landing" },
  "PA.V.A": { task: "Steep Turns" },
  "PA.V.B": { task: "Ground Reference Maneuvers" },
  "PA.VI.A": { task: "Pilotage & Dead Reckoning" },
  "PA.VI.B": { task: "Navigation Systems & Radar Services" },
  "PA.VI.C": { task: "Diversion" },
  "PA.VI.D": { task: "Lost Procedures" },
  "PA.VII.A": { task: "Maneuvering During Slow Flight" },
  "PA.VII.B": { task: "Power-Off Stalls" },
  "PA.VII.C": { task: "Power-On Stalls" },
  "PA.VII.D": { task: "Spin Awareness" },
  "PA.VIII.A": { task: "Straight-and-Level Flight (Instruments)" },
  "PA.VIII.B": { task: "Constant-Airspeed Climbs (Instruments)" },
  "PA.VIII.C": { task: "Constant-Airspeed Descents (Instruments)" },
  "PA.VIII.D": { task: "Turns to Headings (Instruments)" },
  "PA.VIII.E": { task: "Recovery from Unusual Attitudes" },
  "PA.VIII.F": { task: "Radio Communications, Navigation Systems, ATC Services" },
  "PA.IX.A": { task: "Emergency Descent" },
  "PA.IX.B": { task: "Emergency Approach & Landing (Simulated)" },
  "PA.IX.C": { task: "Systems & Equipment Malfunctions" },
  "PA.IX.D": { task: "Emergency Equipment & Survival Gear" },
  "PA.IX.E": { task: "Engine Failure During Takeoff Before V1 (Multi)" },
  "PA.X.A": { task: "Night Preparation" },
  "PA.XI.A": { task: "After Landing, Parking, & Securing" },
};

const IR_TASKS: Record<string, { task: string; description?: string }> = {
  "IR.I.A": { task: "Pilot Qualifications (IFR)" },
  "IR.I.B": { task: "Weather Information (IFR)" },
  "IR.I.C": { task: "Cross-Country Flight Planning (IFR)" },
  "IR.II.A": { task: "Compliance with ATC Clearances" },
  "IR.II.B": { task: "Holding Procedures" },
  "IR.III.A": { task: "Intercepting & Tracking Navaids" },
  "IR.IV.A": { task: "Nonprecision Approach" },
  "IR.IV.B": { task: "Precision Approach (ILS)" },
  "IR.IV.C": { task: "Missed Approach" },
  "IR.IV.D": { task: "Circling Approach" },
  "IR.IV.E": { task: "Landing from a Straight-In or Circling Approach" },
  "IR.V.A": { task: "Loss of Communications" },
  "IR.V.B": { task: "Approach with Loss of Primary Flight Instruments" },
};

export const ACS_TASKS: Record<string, AcsTaskInfo> = (() => {
  const all: Record<string, AcsTaskInfo> = {};
  const addCert = (
    map: Record<string, { task: string; description?: string }>,
    areas: Record<string, string>,
    certPrefix: string,
  ) => {
    for (const [code, meta] of Object.entries(map)) {
      const parts = code.split(".");
      const areaKey = parts[1];
      const area = areas[areaKey] ?? "";
      all[code] = { code, area, task: meta.task, description: meta.description };
      void certPrefix;
    }
  };
  addCert(PA_TASKS, PA_AREAS, "PA");
  addCert(IR_TASKS, {
    I: "Preflight Preparation",
    II: "Air Traffic Control Clearances & Procedures",
    III: "Navigation Systems",
    IV: "Instrument Approach Procedures",
    V: "Emergency Operations",
    VI: "Postflight Procedures",
  }, "IR");
  return all;
})();

/**
 * Resolve an ACS code to a human-readable label and description.
 * Falls back to a base task lookup when the code includes an element suffix
 * (e.g. "PA.I.A.K1" → looks up "PA.I.A").
 */
export function resolveAcsTask(code: string): AcsTaskInfo | null {
  const trimmed = code.trim().toUpperCase();
  if (ACS_TASKS[trimmed]) return ACS_TASKS[trimmed];
  // Strip trailing element suffix(es) like .K1 / .R2 / .S3
  const base = trimmed.replace(/\.(K|R|S)\d+.*$/i, "");
  if (base !== trimmed && ACS_TASKS[base]) return ACS_TASKS[base];
  return null;
}
