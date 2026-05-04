import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, FlaskConical, Volume2 } from "lucide-react";
import { detectAtisIntent, toAtisPhonetic } from "@/lib/atisIntent";
import { detectCallsignIntent } from "@/lib/callsignIntent";
import { formatATISForAudio } from "@/lib/atisSpeech";

type Expect =
  | "callsign_missing"
  | "callsign_wrong"
  | "atis_missing"
  | "atis_mismatch"
  | "callsign_and_atis_ok";

type Step = {
  label: string;
  pilotSays: string;
  expect: Expect;
  /** Aircraft state — what controller knows. */
  callsign: string | null;
  currentAtisLetter: string | null;
  /** What ATC SHOULD say in response (for the diff report). */
  expectedAtcResponse: string;
};

type Scenario = {
  id: string;
  name: string;
  description: string;
  steps: Step[];
};

type StepResult = {
  step: Step;
  detected: {
    hasCallsign: boolean;
    matchedVariant: string | null;
    hasAtisToken: boolean;
    spokenPhonetic: string | null;
    atisMatchesCurrent: boolean;
  };
  /** What the ATC engine would actually say back, given the detection result. */
  actualAtcResponse: string;
  pass: boolean;
  reason: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "taxi-checkride-strict",
    name: "Request Taxi → Missing ATIS → Missing Tail Number (Checkride strict)",
    description:
      "Pilot calls Ground for taxi. ATC must enforce: (1) callsign on every readback, (2) correct ATIS phonetic, (3) reject mismatched callsigns and ATIS letters.",
    steps: [
      {
        label: "Instruction with NO callsign",
        pilotSays: "Taxi to 28R via Hotel.",
        expect: "callsign_missing",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        expectedAtcResponse:
          "Verify your callsign — readback must include your tail number.",
      },
      {
        label: "Instruction with WRONG callsign",
        pilotSays: "Cessna 4CD taxi to 28R via Hotel.",
        expect: "callsign_wrong",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        expectedAtcResponse:
          "Callsign mismatch — say your registered callsign (N123AB / 3AB).",
      },
      {
        label: "Callsign present, ATIS OMITTED",
        pilotSays: "Cessna 3AB ready to taxi.",
        expect: "atis_missing",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        expectedAtcResponse: "Confirm you have information Echo.",
      },
      {
        label: "Callsign present, WRONG ATIS letter",
        pilotSays: "Cessna 3AB taxi to 28R with Delta.",
        expect: "atis_mismatch",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        expectedAtcResponse:
          "Negative — current ATIS is Echo, not Delta. Re-check ATIS and say information Echo.",
      },
      {
        label: "Fully compliant transmission",
        pilotSays: "Cessna 3AB ready to taxi with Echo.",
        expect: "callsign_and_atis_ok",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        expectedAtcResponse:
          "Cessna 3AB, taxi to runway 28R via Hotel, hold short 28R.",
      },
    ],
  },
];

/**
 * Mock of the ATC engine's response logic. Mirrors the production rules in
 * src/components/ATCTrainer.tsx so we can verify behavior without a network call.
 */
function simulateAtcResponse(
  step: Step,
  detected: StepResult["detected"],
): string {
  if (!detected.hasCallsign) {
    return "Verify your callsign — readback must include your tail number.";
  }
  // Callsign was matched — verify it actually belongs to THIS aircraft.
  // detectCallsignIntent already enforces this against step.callsign, so a
  // false hasCallsign covers the wrong-callsign case too. But for clarity
  // we double-check the matched variant against the registered tail.
  if (
    step.callsign &&
    detected.matchedVariant &&
    !step.callsign.toUpperCase().includes(detected.matchedVariant)
  ) {
    return `Callsign mismatch — say your registered callsign (${step.callsign} / ${step.callsign.replace(/^N\d/, "").slice(0, 3)}).`;
  }
  if (!detected.hasAtisToken) {
    return `Confirm you have information ${step.currentAtisLetter}.`;
  }
  if (!detected.atisMatchesCurrent) {
    return `Negative — current ATIS is ${step.currentAtisLetter}, not ${detected.spokenPhonetic}. Re-check ATIS and say information ${step.currentAtisLetter}.`;
  }
  return `Cessna 3AB, taxi to runway 28R via Hotel, hold short 28R.`;
}

function evaluateStep(step: Step): StepResult {
  const cs = detectCallsignIntent(step.pilotSays, step.callsign);
  const atis = detectAtisIntent(step.pilotSays, step.currentAtisLetter);

  const detected = {
    hasCallsign: cs.hasCallsign,
    matchedVariant: cs.matchedVariant,
    hasAtisToken: atis.hasToken,
    spokenPhonetic: atis.spokenPhonetic,
    atisMatchesCurrent: atis.matchesCurrent,
  };

  const actualAtcResponse = simulateAtcResponse(step, detected);

  let pass = false;
  let reason = "";

  switch (step.expect) {
    case "callsign_missing":
      pass = !cs.hasCallsign;
      reason = pass
        ? "✓ ATC blocked transmission — callsign omission caught."
        : `✗ ATC accepted transmission as callsign "${cs.matchedVariant}" — should have blocked.`;
      break;
    case "callsign_wrong":
      // Strict: the matched variant (if any) must NOT belong to the registered callsign.
      // detectCallsignIntent only returns hasCallsign:true if a variant matched the
      // aircraft's registered tail, so a wrong callsign should produce hasCallsign:false.
      pass = !cs.hasCallsign;
      reason = pass
        ? "✓ Wrong tail number rejected."
        : `✗ Wrong callsign was accepted as "${cs.matchedVariant}" — registered is ${step.callsign}.`;
      break;
    case "atis_missing":
      pass = cs.hasCallsign && !atis.hasToken;
      reason = pass
        ? `✓ Callsign accepted, missing ATIS triggered "Confirm info ${step.currentAtisLetter}".`
        : !cs.hasCallsign
          ? "✗ Callsign was rejected — cannot evaluate ATIS step."
          : "✗ ATIS token incorrectly accepted — pilot did not state one.";
      break;
    case "atis_mismatch":
      pass = atis.hasToken && !atis.matchesCurrent;
      reason = pass
        ? `✓ ATIS mismatch caught (pilot: "${atis.spokenPhonetic}", current: "${step.currentAtisLetter}").`
        : "✗ Wrong ATIS letter was not flagged as a mismatch.";
      break;
    case "callsign_and_atis_ok":
      pass = cs.hasCallsign && atis.hasToken && atis.matchesCurrent;
      reason = pass
        ? "✓ Compliant transmission accepted."
        : "✗ Compliant transmission was incorrectly rejected.";
      break;
  }

  return { step, detected, actualAtcResponse, pass, reason };
}

/**
 * Phonetic Audio Check (Mock): verifies that the TTS pipeline expands a
 * single-letter ATIS code (e.g. "Information E") into the full phonetic word
 * ("Information Echo") before being sent to the audio engine.
 */
type PhoneticCheck = {
  letter: string;
  rawAtcText: string;
  ttsText: string;
  expectedPhonetic: string;
  pass: boolean;
};

function runPhoneticAudioChecks(): PhoneticCheck[] {
  const letters = ["A", "E", "K", "Q", "X", "Z"];
  return letters.map((letter) => {
    const rawAtcText = `Information ${letter}`;
    const ttsText = formatATISForAudio(rawAtcText);
    const expectedPhonetic = toAtisPhonetic(letter) ?? letter;
    const pass =
      ttsText.includes(expectedPhonetic) && !ttsText.match(new RegExp(`Information ${letter}\\b`));
    return { letter, rawAtcText, ttsText, expectedPhonetic, pass };
  });
}

export default function TestModePage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, StepResult[]>>({});
  const [phoneticResults, setPhoneticResults] = useState<PhoneticCheck[]>([]);
  const [completed, setCompleted] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setResults({});
    setPhoneticResults([]);
    setCompleted(false);
    const next: Record<string, StepResult[]> = {};
    for (const scn of SCENARIOS) {
      next[scn.id] = [];
      setResults({ ...next });
      for (const step of scn.steps) {
        await new Promise((r) => setTimeout(r, 300));
        next[scn.id] = [...next[scn.id], evaluateStep(step)];
        setResults({ ...next });
      }
    }
    setPhoneticResults(runPhoneticAudioChecks());
    setRunning(false);
    setCompleted(true);
  };

  const allStepResults = Object.values(results).flat();
  const radioPass = allStepResults.filter((r) => r.pass).length;
  const radioTotal = allStepResults.length;
  const phoneticPass = phoneticResults.filter((p) => p.pass).length;
  const phoneticTotal = phoneticResults.length;
  const totalPass = radioPass + phoneticPass;
  const totalCount = radioTotal + phoneticTotal;
  const proficiency =
    totalCount > 0 ? Math.round((totalPass / totalCount) * 100) : 0;

  const proficiencyGrade =
    proficiency === 100
      ? { label: "CHECKRIDE READY", color: "text-emerald-500" }
      : proficiency >= 80
        ? { label: "NEEDS POLISH", color: "text-yellow-500" }
        : { label: "UNSAT — REVIEW LOGIC", color: "text-destructive" };

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <Helmet>
        <title>Test Mode — SimPilot.AI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-wider uppercase flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            ATC Logic Test Mode
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Checkride-strict validation: enforces callsign on every readback,
            ATIS confirmation, mismatch correction, and TTS phonetic expansion.
          </p>
        </div>
        <Button onClick={runAll} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            "Run Full Test Suite"
          )}
        </Button>
      </div>

      {SCENARIOS.map((scn) => {
        const scnResults = results[scn.id] || [];
        const scnFailed = scnResults.some((r) => !r.pass);
        const scnDone = scnResults.length === scn.steps.length;
        return (
          <Card key={scn.id} className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{scn.name}</span>
                {scnDone &&
                  (scnFailed ? (
                    <Badge variant="destructive">FAILED</Badge>
                  ) : (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                      PASSED
                    </Badge>
                  ))}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{scn.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {scn.steps.map((step, idx) => {
                const r = scnResults[idx];
                return (
                  <div
                    key={idx}
                    className="rounded-md border border-border/60 p-3 bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          Step {idx + 1}: {step.label}
                        </div>
                        <div className="text-sm font-mono break-words">
                          🎙️ "{step.pilotSays}"
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Expect: <span className="font-mono">{step.expect}</span>
                          {" · "}callsign:{" "}
                          <span className="font-mono">{step.callsign ?? "—"}</span>
                          {" · "}ATIS:{" "}
                          <span className="font-mono">{step.currentAtisLetter ?? "—"}</span>
                        </div>
                      </div>
                      <div className="shrink-0 pt-1">
                        {!r ? (
                          running ? (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">pending</span>
                          )
                        ) : r.pass ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                    </div>

                    {r && (
                      <div className="mt-3 space-y-2">
                        <div className={`text-xs ${r.pass ? "text-muted-foreground" : "text-destructive"}`}>
                          {r.reason}
                        </div>
                        {!r.pass && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                              <div className="font-semibold text-emerald-500 mb-1">
                                EXPECTED ATC
                              </div>
                              <div className="font-mono">
                                "{step.expectedAtcResponse}"
                              </div>
                            </div>
                            <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                              <div className="font-semibold text-destructive mb-1">
                                ACTUAL ATC
                              </div>
                              <div className="font-mono">
                                "{r.actualAtcResponse}"
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Phonetic Audio Check */}
      {(running || phoneticResults.length > 0) && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              Phonetic Audio Check (TTS Pipeline)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Verifies single-letter ATIS codes are expanded to phonetic words
              before being sent to the speech engine.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {phoneticResults.length === 0 && running && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Running checks...
              </div>
            )}
            {phoneticResults.map((p) => (
              <div
                key={p.letter}
                className="flex items-center justify-between gap-3 rounded border border-border/60 bg-muted/20 p-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-muted-foreground">
                    "{p.rawAtcText}"
                  </span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-mono">"{p.ttsText}"</span>
                </div>
                <div className="shrink-0">
                  expects{" "}
                  <span className="font-mono text-primary">{p.expectedPhonetic}</span>
                </div>
                {p.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pilot Proficiency Score */}
      {completed && (
        <Card className="border-2 border-primary/40">
          <CardHeader>
            <CardTitle className="text-base font-display tracking-wider uppercase">
              Pilot Proficiency Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className={`text-5xl font-display font-bold ${proficiencyGrade.color}`}>
                  {proficiency}%
                </div>
                <div className={`text-xs uppercase tracking-widest mt-1 ${proficiencyGrade.color}`}>
                  {proficiencyGrade.label}
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <div>
                  Radio dialogue: {radioPass}/{radioTotal}
                </div>
                <div>
                  Phonetic TTS: {phoneticPass}/{phoneticTotal}
                </div>
                <div>
                  Total: {totalPass}/{totalCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
