/**
 * Deterministic ATC validation layer ("the No-No filter").
 *
 * These rules run BEFORE the LLM is called. If any rule fails, the controller's
 * response is hard-coded — the model never gets to be lenient. This guarantees
 * the strict FAA/ICAO behavior the simulator advertises.
 *
 * Rules enforced:
 *   1. Callsign present on every readback / acknowledgement.
 *   2. ATIS information letter present on initial contact for taxi/clearance.
 *   3. Taxi-clearance readback must include the runway and "hold short".
 *   4. Wrong-facility request (e.g. taxi on Tower, takeoff on Ground).
 */

import { detectCallsignIntent } from "./callsignIntent";
import { detectAtisIntent } from "./atisIntent";
import type { AtcFacility, FacilityKind } from "@/data/atcFrequencies";

export type ValidationKind =
  | "MISSING_CALLSIGN"
  | "MISSING_ATIS"
  | "MISSING_READBACK"
  | "WRONG_FACILITY";

export interface ValidationFailure {
  kind: ValidationKind;
  /** Canned controller line to display + speak. Already callsign-substituted. */
  cannedReply: string;
  /** Short coaching note for the [FEEDBACK] sidebar. */
  feedback: string;
}

export interface ValidationContext {
  /** Pilot's raw transmission text. */
  text: string;
  /** Aircraft callsign — e.g. "N123AB". Empty disables callsign enforcement. */
  callsign?: string | null;
  /** Facility currently tuned (Tower / Ground / Clearance / etc.). */
  facility?: AtcFacility | null;
  /** True when the pilot has not yet checked in on this freq this session. */
  isInitialContactOnFreq: boolean;
  /** Current ATIS letter for the airport (e.g. "E"). null = no ATIS active. */
  currentAtisLetter?: string | null;
  /** Last instruction the controller issued, lowercased. */
  lastControllerInstruction?: string | null;
  /** True when the prior turn was an ATC instruction (callsign rule applies). */
  priorWasAtc: boolean;
}

/** Short callsign for canned replies — last digit + last two letters. */
function shortCallsign(cs?: string | null): string {
  if (!cs) return "Aircraft";
  const m = cs.toUpperCase().replace(/[^A-Z0-9]/g, "").match(/^N?(\d+)([A-Z]+)$/);
  if (!m) return cs.toUpperCase();
  return `${m[1].slice(-1)}${m[2]}`;
}

/** Map raw kind → spoken role used in canned replies. */
function facilityRoleName(f?: AtcFacility | null): string {
  if (!f) return "Tower";
  return f.name;
}

/** Detect the controller's last instruction kind to know what to enforce. */
function lastInstructionMentionsTaxi(s?: string | null): boolean {
  if (!s) return false;
  return /\btaxi\b|\bhold short\b|\bvia\b/i.test(s);
}

/** Crude intent classifier for the pilot's request. */
export type RequestIntent =
  | "TAXI"
  | "TAKEOFF"
  | "LANDING"
  | "CLEARANCE"
  | "FREQ_CHANGE"
  | "READBACK"
  | "OTHER";

export function classifyPilotIntent(text: string): RequestIntent {
  const t = text.toLowerCase();
  if (/\b(taxi|ready to taxi|out of)\b/.test(t)) return "TAXI";
  if (/\b(takeoff|departure|cleared for takeoff|line up)\b/.test(t)) return "TAKEOFF";
  if (/\b(landing|cleared to land|full stop|touch and go|final)\b/.test(t)) return "LANDING";
  if (/\b(clearance|ifr|vfr flight following)\b/.test(t)) return "CLEARANCE";
  if (/\b(monitoring|switching|going to|tuning)\b/.test(t)) return "FREQ_CHANGE";
  if (/\b(roger|wilco|copy|going|out|with you)\b/.test(t)) return "READBACK";
  return "OTHER";
}

/** Returns null when transmission passes all rules. */
export function validateTransmission(ctx: ValidationContext): ValidationFailure | null {
  const cs = shortCallsign(ctx.callsign);
  const role = facilityRoleName(ctx.facility);
  const intent = classifyPilotIntent(ctx.text);
  const facilityKind: FacilityKind | undefined = ctx.facility?.kind;

  // 1. Wrong-facility — checked first because it's the most useful correction.
  if (facilityKind === "GROUND" && (intent === "TAKEOFF" || intent === "LANDING")) {
    return {
      kind: "WRONG_FACILITY",
      cannedReply: `${cs}, contact Tower for ${intent === "TAKEOFF" ? "takeoff" : "landing"} clearance.`,
      feedback: `Ground does not issue ${intent === "TAKEOFF" ? "takeoff" : "landing"} clearances. Switch to Tower.`,
    };
  }
  if (facilityKind === "TOWER" && intent === "TAXI") {
    return {
      kind: "WRONG_FACILITY",
      cannedReply: `${cs}, contact Ground for taxi.`,
      feedback: "Taxi instructions come from Ground, not Tower.",
    };
  }
  if (facilityKind === "CLEARANCE" && (intent === "TAXI" || intent === "TAKEOFF")) {
    return {
      kind: "WRONG_FACILITY",
      cannedReply: `${cs}, contact ${intent === "TAXI" ? "Ground for taxi" : "Tower for takeoff"}.`,
      feedback: `Clearance Delivery does not handle ${intent === "TAXI" ? "taxi" : "takeoff"}.`,
    };
  }

  // 2. Callsign on every readback when the prior turn was ATC.
  if (ctx.callsign && ctx.priorWasAtc) {
    const cs2 = detectCallsignIntent(ctx.text, ctx.callsign);
    if (!cs2.hasCallsign) {
      return {
        kind: "MISSING_CALLSIGN",
        cannedReply: `Station calling ${role}, say again with your callsign.`,
        feedback: "Every readback must include your aircraft callsign.",
      };
    }
  }

  // 3. ATIS on initial taxi/clearance contact.
  if (
    ctx.isInitialContactOnFreq &&
    ctx.currentAtisLetter &&
    (intent === "TAXI" || intent === "CLEARANCE") &&
    (facilityKind === "GROUND" || facilityKind === "CLEARANCE")
  ) {
    const atisIntent = detectAtisIntent(ctx.text, ctx.currentAtisLetter);
    if (!atisIntent.hasToken) {
      return {
        kind: "MISSING_ATIS",
        cannedReply: `${cs}, ${role}, verify you have Information ${ctx.currentAtisLetter}.`,
        feedback: "State the current ATIS information letter on initial contact.",
      };
    }
  }

  // 4. Readback discipline on taxi clearances.
  if (lastInstructionMentionsTaxi(ctx.lastControllerInstruction)) {
    const t = ctx.text.toLowerCase();
    const hasRunway = /runway\s*\d/i.test(ctx.text) || /\b(2[0-9][lrc]?|1[0-9][lrc]?|0?[0-9][lrc]?)\b/.test(t);
    const hasHoldShort = /hold\s*short/.test(t);
    if (!(hasRunway && hasHoldShort)) {
      return {
        kind: "MISSING_READBACK",
        cannedReply: `${cs}, read back taxi instructions.`,
        feedback: "Read back the runway assignment and any hold-short instruction.",
      };
    }
  }

  return null;
}
