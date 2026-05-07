## Goal
Rebuild the ATC Communication Engine to enforce strict FAA/ICAO phraseology, frequency-correct personas, real ATIS data, progressive flight state, and a release-to-transmit PTT.

## Current state
- All logic lives in **`src/components/ATCTrainer.tsx`** (~4,700 lines). There is no `useATC` hook or `ChatLogic` component yet.
- Frequencies are defined in **`src/data/atcFrequencies.ts`** (already a lookup table — good base).
- ATIS is currently synthesized client-side (random values).
- PTT uses a click-to-toggle pattern.
- `TestModePage.tsx` imports `FAA_PROMPT` from `ATCTrainer.tsx`, so we must preserve that export.

## Plan

### 1. Extract a real `useATC` hook
Create **`src/hooks/useATC.ts`** that owns:
- `flightState` ('PRE_TAXI' | 'TAXI' | 'RUN_UP' | 'DEPARTURE' | 'CRUISE')
- `tunedFrequency`, `currentAirport`, `currentAtis` (letter + raw METAR)
- `validateTransmission(text)` returning `{ ok, correction }` (callsign / ATIS / readback rules)
- `resolveFacility(freq, airport)` returning the facility or `null` (→ STATIC)
- `advanceFlightState(controllerInstruction)` (e.g. when Ground issues taxi → state becomes TAXI)
- `generateRandomTwist()` (hold position / extend downwind / give way)

### 2. Strict validation layer (the "No-No filter")
Implement in the hook, run **before** the LLM call:
- **Callsign**: regex `\b[NCG]\d{1,5}[A-Z]{0,2}\b` (covers N123AB, plus military-style). If absent → return canned *"Station calling [Facility], say again with your callsign."*
- **ATIS on initial contact**: if `firstContactOnFreq && !/with (alpha|bravo|...|zulu)/i` → *"Verify you have Information [letter]."*
- **Readback on taxi clearance**: track last controller message; if it contained "taxi to" / "hold short", next pilot transmission must include the runway and "hold short" tokens, else → *"[Callsign], read back taxi instructions."*

These are deterministic responses — no LLM round-trip.

### 3. Frequency-correct persona / STATIC
- Lookup `(airport, freq)` in `atcFrequencies.ts`. If unmatched for the selected airport → return `[STATIC / NO RESPONSE]` UI bubble, no audio.
- If matched but the request mismatches the facility (e.g. taxi request on Tower, takeoff request on Ground), the controller corrects: *"Cessna 3AB, contact Ground 121.7."*
- Inject the resolved facility name + role into the system prompt so the LLM stays in character.

### 4. Real ATIS via METAR
- Replace the random ATIS generator with a fetch to the existing weather edge function (already used by `useWeatherBriefing` against aviationweather.gov).
- Parse METAR → wind, vis, ceiling, alt, current Information letter (rotates hourly using UTC hour → letter A–Z).
- Store the ATIS string and the letter on the hook.

### 5. Phonetic TTS expansion
- Add a small util `expandPhonetic(text)` that replaces standalone letters/digits with NATO words and "niner" / "tree" / "fife" before sending to TTS (does **not** alter the on-screen transcript).
- Also expand runway numbers ("28R" → "two eight right") and frequencies ("121.7" → "one two one point seven").

### 6. Progressive flight logic
- After Ground issues taxi → `flightState = 'TAXI'`, controller produces a complex multi-taxiway clearance (random pick from realistic taxiway templates per airport).
- Only ask destination if user requested *Flight Following* or filed *IFR* (detect keywords).
- Advance state on relevant clearances (run-up complete → DEPARTURE, etc.).

### 7. PTT overhaul
- Replace the current toggle button with a **press-and-hold** button (`onMouseDown` / `onTouchStart` / Space `keydown` to start, `onMouseUp` / `onTouchEnd` / `keyup` to stop).
- On release → automatically run STT, then validation, then controller response.
- Visual: button shows "TRANSMITTING" while held; brief tick on release.

### 8. Random scenario generator
- 20 % chance per controller turn (when in-flight or taxi) to inject one of:
  - "Hold position for traffic on the Alpha taxiway."
  - "Extend downwind, I'll call your base."
  - "Give way to the Cessna on Hotel."
  - "Line up and wait, traffic on a two-mile final."
- Pulled from a typed `RANDOM_TWISTS` array; respects current `flightState`.

### 9. Refactor `ATCTrainer.tsx`
- Slim the component to UI + wiring only; move all business logic into `useATC`.
- Keep `FAA_PROMPT` exported (TestModePage depends on it) but rebuild it to reflect the new rules.

## Files
- **new** `src/hooks/useATC.ts` — state machine, validators, ATIS, twists
- **new** `src/lib/phonetic.ts` — NATO/number expansion for TTS
- **new** `src/lib/atisFromMetar.ts` — METAR → ATIS string + letter
- **edit** `src/components/ATCTrainer.tsx` — consume hook, press-and-hold PTT, STATIC bubble, slimmed
- **edit** `src/data/atcFrequencies.ts` — add taxiway templates per airport (KMYF, KSAN, KSEE, etc.) so taxi clearances are realistic
- **edit** `src/pages/TestModePage.tsx` — only if `FAA_PROMPT` shape changes

## Out of scope (confirm if you want these too)
- Adding new airports beyond what's already in `atcFrequencies.ts`
- Multi-controller handoffs across sectors (Approach → Center)
- Voice-character switching per controller (different TTS voice per facility)

Reply **go** to proceed, or tell me what to adjust (e.g. keep click-to-talk as a fallback, narrow scope to just validation + ATIS, etc.).