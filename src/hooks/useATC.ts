/**
 * useATC — thin facade hook the rest of the app can use to access the ATC
 * communication engine without depending on the (large) ATCTrainer component.
 *
 * Surface:
 *   - validate(text, ctx)        deterministic pre-LLM check
 *   - resolveFacility(icao, mhz) what controller is on this frequency
 *   - speechFor(text)            phonetic-expanded TTS string
 *   - classifyIntent(text)       pilot-request classifier
 *
 * The component-level state (messages, flightState, hotkeys, audio fx) still
 * lives in ATCTrainer.tsx — those are presentation concerns. Pure logic is
 * exported here so it can be unit-tested and reused (e.g. by TestModePage).
 */

import { useCallback } from "react";
import {
  lookupFacility,
  resolveFacilityByFreq,
  type AirportFrequencies,
  type AtcFacility,
} from "@/data/atcFrequencies";
import {
  validateTransmission,
  classifyPilotIntent,
  type ValidationContext,
  type ValidationFailure,
} from "@/lib/atcValidation";
import { expandPhoneticForSpeech } from "@/lib/phoneticSpeech";

export interface UseATC {
  validate: (ctx: ValidationContext) => ValidationFailure | null;
  classifyIntent: typeof classifyPilotIntent;
  resolveFacility: (icao: string, freqMHz: number) => {
    airport: AirportFrequencies | null;
    facility: AtcFacility | null;
    isUniversal: boolean;
  };
  resolveAnyFacility: typeof resolveFacilityByFreq;
  speechFor: (text: string) => string;
}

export function useATC(): UseATC {
  return {
    validate: useCallback((ctx) => validateTransmission(ctx), []),
    classifyIntent: useCallback((t: string) => classifyPilotIntent(t), []),
    resolveFacility: useCallback(
      (icao: string, freqMHz: number) => lookupFacility(icao, freqMHz),
      [],
    ),
    resolveAnyFacility: useCallback(
      (...args: Parameters<typeof resolveFacilityByFreq>) => resolveFacilityByFreq(...args),
      [],
    ),
    speechFor: useCallback((t: string) => expandPhoneticForSpeech(t), []),
  };
}

export type { ValidationFailure, ValidationContext } from "@/lib/atcValidation";
