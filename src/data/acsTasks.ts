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

// Commercial Pilot Airplane (ACS FAA-S-ACS-7B)
const CA_AREAS: Record<string, string> = {
  I: "Preflight Preparation",
  II: "Preflight Procedures",
  III: "Airport & Seaplane Base Operations",
  IV: "Takeoffs, Landings, & Go-Arounds",
  V: "Performance Maneuvers",
  VI: "Ground Reference Maneuvers",
  VII: "Navigation",
  VIII: "Slow Flight & Stalls",
  IX: "Emergency Operations",
  X: "High-Altitude Operations",
  XI: "Postflight Procedures",
};

const CA_TASKS: Record<string, { task: string; description?: string }> = {
  "CA.I.A": { task: "Pilot Qualifications", description: "Commercial certification, currency, and 14 CFR Part 61 commercial privileges/limitations." },
  "CA.I.B": { task: "Airworthiness Requirements", description: "Aircraft documents, inspections, and AD compliance for commercial ops." },
  "CA.I.C": { task: "Weather Information", description: "Weather products, decision making, and commercial weather minimums." },
  "CA.I.D": { task: "Cross-Country Flight Planning", description: "Commercial-level route, fuel, performance, and nav planning." },
  "CA.I.E": { task: "National Airspace System" },
  "CA.I.F": { task: "Performance & Limitations", description: "Weight & balance, density altitude, and commercial performance charts." },
  "CA.I.G": { task: "Operation of Systems" },
  "CA.I.H": { task: "Human Factors" },
  "CA.I.I": { task: "Water & Seaplane Characteristics (if applicable)" },
  "CA.I.J": { task: "Aeronautical Decision Making", description: "ADM, PAVE, IMSAFE, and SRM at commercial level." },
  "CA.II.A": { task: "Preflight Inspection" },
  "CA.II.B": { task: "Flight Deck Management" },
  "CA.II.C": { task: "Engine Starting" },
  "CA.II.D": { task: "Taxiing" },
  "CA.II.E": { task: "Before Takeoff Check" },
  "CA.III.A": { task: "Communications, Light Signals, & Runway Lighting" },
  "CA.III.B": { task: "Traffic Patterns" },
  "CA.IV.A": { task: "Normal Takeoff & Climb" },
  "CA.IV.B": { task: "Normal Approach & Landing" },
  "CA.IV.C": { task: "Soft-Field Takeoff & Climb" },
  "CA.IV.D": { task: "Soft-Field Approach & Landing" },
  "CA.IV.E": { task: "Short-Field Takeoff & Climb" },
  "CA.IV.F": { task: "Short-Field Approach & Landing" },
  "CA.IV.G": { task: "Power-Off 180° Accuracy Approach & Landing" },
  "CA.IV.M": { task: "Go-Around / Rejected Landing" },
  "CA.V.A": { task: "Steep Turns" },
  "CA.V.B": { task: "Steep Spiral" },
  "CA.V.C": { task: "Chandelles" },
  "CA.V.D": { task: "Lazy Eights" },
  "CA.VI.A": { task: "Eights on Pylons" },
  "CA.VII.A": { task: "Pilotage & Dead Reckoning" },
  "CA.VII.B": { task: "Navigation Systems & Radar Services" },
  "CA.VII.C": { task: "Diversion" },
  "CA.VII.D": { task: "Lost Procedures" },
  "CA.VIII.A": { task: "Maneuvering During Slow Flight" },
  "CA.VIII.B": { task: "Power-Off Stalls" },
  "CA.VIII.C": { task: "Power-On Stalls" },
  "CA.VIII.D": { task: "Accelerated Stalls" },
  "CA.VIII.E": { task: "Spin Awareness" },
  "CA.IX.A": { task: "Emergency Descent" },
  "CA.IX.B": { task: "Emergency Approach & Landing (Simulated)" },
  "CA.IX.C": { task: "Systems & Equipment Malfunctions" },
  "CA.IX.D": { task: "Emergency Equipment & Survival Gear" },
  "CA.IX.E": { task: "Engine Failure During Takeoff Before V1 (Multi)" },
  "CA.IX.F": { task: "Engine Failure After Liftoff (Multi)" },
  "CA.IX.G": { task: "Approach & Landing with Inoperative Engine (Multi)" },
  "CA.X.A": { task: "Supplemental Oxygen" },
  "CA.X.B": { task: "Pressurization" },
  "CA.XI.A": { task: "After Landing, Parking, & Securing" },
  "CA.XI.B": { task: "Seaplane Post-Landing & Securing (if applicable)" },
};

// Flight Instructor Airplane (ACS FAA-S-ACS-25)
const FI_AREAS: Record<string, string> = {
  I: "Fundamentals of Instructing",
  II: "Technical Subject Areas",
  III: "Preflight Preparation",
  IV: "Preflight Lesson on a Maneuver to Be Performed in Flight",
  V: "Preflight Procedures",
  VI: "Airport & Seaplane Base Operations",
  VII: "Takeoffs, Landings, & Go-Arounds",
  VIII: "Fundamentals of Flight",
  IX: "Performance & Ground Reference Maneuvers",
  X: "Slow Flight, Stalls, & Spins",
  XI: "Basic Instrument Maneuvers",
  XII: "Emergency Operations",
  XIII: "Multiengine Operations",
  XIV: "Postflight Procedures",
};

const FI_TASKS: Record<string, { task: string; description?: string }> = {
  "FI.I.A": { task: "The Learning Process", description: "Learning theory, perceptions, insight, and motivation." },
  "FI.I.B": { task: "Human Behavior & Effective Communication" },
  "FI.I.C": { task: "Teaching Process", description: "Preparation, presentation, application, and assessment." },
  "FI.I.D": { task: "Teaching Methods & Common Errors" },
  "FI.I.E": { task: "Assessment & Critique" },
  "FI.I.F": { task: "Instructor Responsibilities & Professionalism" },
  "FI.I.G": { task: "Techniques of Flight Instruction", description: "Obstacles, integrated flight instruction, and SRM/ADM teaching." },
  "FI.I.H": { task: "Risk Management During Flight Instruction" },
  "FI.II.A": { task: "Certificates, Endorsements, & Logbook Entries" },
  "FI.II.B": { task: "Runway Incursion Avoidance" },
  "FI.II.C": { task: "Visual Scanning & Collision Avoidance" },
  "FI.II.D": { task: "Principles of Flight" },
  "FI.II.E": { task: "Aircraft Flight Controls" },
  "FI.II.F": { task: "Aircraft Weight & Balance" },
  "FI.II.G": { task: "Navigation & Cross-Country Flight Planning" },
  "FI.II.H": { task: "Night Operations" },
  "FI.II.I": { task: "High Altitude Operations" },
  "FI.II.J": { task: "Federal Aviation Regulations & Publications" },
  "FI.II.K": { task: "Use of Minimum Equipment List & Operations Specifications" },
  "FI.II.L": { task: "National Airspace System" },
  "FI.III.A": { task: "Pilot Qualifications" },
  "FI.III.B": { task: "Airworthiness Requirements" },
  "FI.III.C": { task: "Weather Information" },
  "FI.III.D": { task: "Operation of Systems" },
  "FI.III.E": { task: "Performance & Limitations" },
  "FI.III.F": { task: "Aeromedical Factors" },
  "FI.IV.A": { task: "Maneuver Lesson", description: "Conduct a complete preflight lesson on a selected flight maneuver." },
  "FI.V.A": { task: "Preflight Inspection" },
  "FI.V.B": { task: "Flight Deck Management" },
  "FI.V.C": { task: "Engine Starting" },
  "FI.V.D": { task: "Taxiing" },
  "FI.V.E": { task: "Before Takeoff Check" },
  "FI.VI.A": { task: "Communications, Light Signals, & Runway Lighting" },
  "FI.VI.B": { task: "Traffic Patterns" },
  "FI.VII.A": { task: "Normal Takeoff & Climb" },
  "FI.VII.B": { task: "Normal Approach & Landing" },
  "FI.VII.C": { task: "Soft-Field Takeoff & Climb" },
  "FI.VII.D": { task: "Soft-Field Approach & Landing" },
  "FI.VII.E": { task: "Short-Field Takeoff & Climb" },
  "FI.VII.F": { task: "Short-Field Approach & Landing" },
  "FI.VII.G": { task: "Power-Off 180° Accuracy Approach & Landing" },
  "FI.VII.M": { task: "Forward Slip to a Landing" },
  "FI.VII.N": { task: "Go-Around / Rejected Landing" },
  "FI.VIII.A": { task: "Straight-and-Level Flight" },
  "FI.VIII.B": { task: "Level Turns" },
  "FI.VIII.C": { task: "Straight Climbs & Climbing Turns" },
  "FI.VIII.D": { task: "Straight Descents & Descending Turns" },
  "FI.IX.A": { task: "Steep Turns" },
  "FI.IX.B": { task: "Steep Spiral" },
  "FI.IX.C": { task: "Chandelles" },
  "FI.IX.D": { task: "Lazy Eights" },
  "FI.IX.E": { task: "Ground Reference Maneuvers" },
  "FI.IX.F": { task: "Eights on Pylons" },
  "FI.X.A": { task: "Maneuvering During Slow Flight" },
  "FI.X.B": { task: "Power-Off Stalls" },
  "FI.X.C": { task: "Power-On Stalls" },
  "FI.X.D": { task: "Accelerated Stalls" },
  "FI.X.E": { task: "Cross-Control Stalls" },
  "FI.X.F": { task: "Elevator Trim Stalls" },
  "FI.X.G": { task: "Secondary Stalls" },
  "FI.X.H": { task: "Spin Awareness & Spins" },
  "FI.XI.A": { task: "Straight-and-Level Flight (Instruments)" },
  "FI.XI.B": { task: "Constant-Airspeed Climbs (Instruments)" },
  "FI.XI.C": { task: "Constant-Airspeed Descents (Instruments)" },
  "FI.XI.D": { task: "Turns to Headings (Instruments)" },
  "FI.XI.E": { task: "Recovery from Unusual Attitudes" },
  "FI.XII.A": { task: "Emergency Approach & Landing (Simulated)" },
  "FI.XII.B": { task: "Systems & Equipment Malfunctions" },
  "FI.XII.C": { task: "Emergency Equipment & Survival Gear" },
  "FI.XII.D": { task: "Emergency Descent" },
  "FI.XIII.A": { task: "Maneuvering with One Engine Inoperative" },
  "FI.XIII.B": { task: "Vmc Demonstration" },
  "FI.XIII.C": { task: "One Engine Inoperative — Approach & Landing" },
  "FI.XIV.A": { task: "After Landing, Parking, & Securing" },
};

// Airline Transport Pilot Airplane (ACS FAA-S-ACS-11)
const ATP_AREAS: Record<string, string> = {
  I: "Preflight Preparation",
  II: "Preflight Procedures",
  III: "Takeoff & Departure Phase",
  IV: "Inflight Maneuvers & Procedures",
  V: "Instrument Procedures",
  VI: "Approaches",
  VII: "Landings & Approaches to Landings",
  VIII: "Normal & Abnormal Procedures",
  IX: "Emergency Procedures",
  X: "Postflight Procedures",
};

const ATP_TASKS: Record<string, { task: string; description?: string }> = {
  "ATP.I.A": { task: "Pilot Qualifications", description: "ATP certification, currency, and 14 CFR Part 121/135 requirements." },
  "ATP.I.B": { task: "Airworthiness Requirements", description: "Aircraft documents, MEL/CDL, and airworthiness for air carrier ops." },
  "ATP.I.C": { task: "Weather Information", description: "Advanced weather products, turbulence, icing, windshear, and dispatch decisions." },
  "ATP.I.D": { task: "Cross-Country Flight Planning", description: "ATC flight plans, fuel planning (reserves, alternates), and ETOPS where applicable." },
  "ATP.I.E": { task: "Human Factors", description: "CRM, threat & error management, fatigue, and aeromedical considerations." },
  "ATP.II.A": { task: "Preflight Inspection" },
  "ATP.II.B": { task: "Powerplant Start" },
  "ATP.II.C": { task: "Taxiing" },
  "ATP.II.D": { task: "Pre-Takeoff Checks" },
  "ATP.III.A": { task: "Normal & Crosswind Takeoff" },
  "ATP.III.B": { task: "Instrument Takeoff" },
  "ATP.III.C": { task: "Powerplant Failure During Takeoff", description: "Engine failure before/after V1, rejected takeoff, and continued takeoff procedures." },
  "ATP.III.D": { task: "Rejected Takeoff" },
  "ATP.III.E": { task: "Departure Procedures (DPs/SIDs)" },
  "ATP.IV.A": { task: "Steep Turns" },
  "ATP.IV.B": { task: "Approaches to Stalls", description: "Clean, takeoff/departure, and landing configuration stall recoveries." },
  "ATP.IV.C": { task: "Powerplant Failure — Multiengine" },
  "ATP.IV.D": { task: "Specific Flight Characteristics", description: "High-altitude handling, Mach buffet, and upset prevention & recovery (UPRT)." },
  "ATP.IV.E": { task: "Recovery from Unusual Attitudes" },
  "ATP.V.A": { task: "Standard Instrument Departures & Arrivals" },
  "ATP.V.B": { task: "Holding" },
  "ATP.V.C": { task: "Instrument Cross-Check & Interpretation" },
  "ATP.VI.A": { task: "Precision Approach (ILS)", description: "Single-engine and all-engine precision approaches to CAT I/II/III minimums." },
  "ATP.VI.B": { task: "Nonprecision Approach (RNAV/VOR/LOC)" },
  "ATP.VI.C": { task: "Circling Approach" },
  "ATP.VI.D": { task: "Missed Approach" },
  "ATP.VII.A": { task: "Normal Landing" },
  "ATP.VII.B": { task: "Crosswind Landing" },
  "ATP.VII.C": { task: "Landing from a Precision Approach" },
  "ATP.VII.D": { task: "Rejected Landing / Go-Around" },
  "ATP.VII.E": { task: "Landing from a Circling Approach" },
  "ATP.VII.F": { task: "Landing with Powerplant Failure (Multiengine)" },
  "ATP.VIII.A": { task: "Normal & Abnormal Procedures", description: "Use of QRH/checklists for aircraft systems and abnormal conditions." },
  "ATP.IX.A": { task: "Emergency Procedures", description: "Fire, smoke, decompression, ditching, and evacuation per QRH." },
  "ATP.IX.B": { task: "Emergency Descent" },
  "ATP.X.A": { task: "After Landing, Parking, & Securing" },
};

// ATP-CTP (Certification Training Program) — knowledge-only academic module
const ATP_CTP_TASKS: Record<string, { task: string; description?: string }> = {
  "ATP-CTP.I.A": { task: "Aerodynamics & Performance (High Altitude)", description: "Swept-wing aerodynamics, Mach effects, coffin corner, and stall characteristics." },
  "ATP-CTP.I.B": { task: "Automation Management", description: "Autoflight modes, mode awareness, and automation surprise mitigation." },
  "ATP-CTP.I.C": { task: "Adverse Weather Operations", description: "Windshear, icing, thunderstorms, and turbulence avoidance & recovery." },
  "ATP-CTP.I.D": { task: "Air Carrier Operations", description: "14 CFR Part 117 fatigue rules, dispatch, and Part 121 operating environment." },
  "ATP-CTP.I.E": { task: "Leadership, Professional Development, CRM, & SBT", description: "Captain authority, crew resource management, and scenario-based training." },
  "ATP-CTP.II.A": { task: "Stall Prevention & Recovery (UPRT)", description: "Upset Prevention & Recovery Training in full flight simulator." },
  "ATP-CTP.II.B": { task: "High-Altitude Operations Sim", description: "Sim training for high-altitude handling, emergency descent, and decompression." },
  "ATP-CTP.II.C": { task: "Adverse Weather Sim", description: "Windshear escape, icing encounters, and thunderstorm avoidance in the sim." },
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
  addCert(CA_TASKS, CA_AREAS, "CA");
  addCert(FI_TASKS, FI_AREAS, "FI");
  addCert(ATP_TASKS, ATP_AREAS, "ATP");
  addCert(ATP_CTP_TASKS, {
    I: "Academic Knowledge",
    II: "Simulator Training",
  }, "ATP-CTP");
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
