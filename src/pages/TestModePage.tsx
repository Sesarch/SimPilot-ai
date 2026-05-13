import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, FlaskConical, Volume2 } from "lucide-react";
import { detectAtisIntent, toAtisPhonetic } from "@/lib/atisIntent";
import { detectCallsignIntent } from "@/lib/callsignIntent";
import { formatATISForAudio } from "@/lib/atisSpeech";
import { supabase } from "@/integrations/supabase/client";
import { FAA_PROMPT } from "@/components/ATCTrainer";

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
  callsign: string; // registered tail
  currentAtisLetter: string;
  /** Substrings the real ATC reply MUST contain to be considered correct. */
  mustContainAny: string[];
  /** Substrings the reply MUST NOT contain (e.g. "taxi to" when blocked). */
  mustNotContain?: string[];
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
  /** Real ATC reply from the pilot-chat edge function. */
  actualAtcResponse: string;
  pass: boolean;
  reason: string;
};

const SCENARIOS = [
  {
    id: "taxi-checkride-strict",
    name: "Request Taxi → Missing ATIS → Missing Tail Number (Checkride strict)",
    description:
      "Runs against the real pilot-chat ATC pipeline. Verifies the controller blocks missing/wrong callsign and missing/wrong ATIS before issuing taxi.",
    steps: [
      {
        label: "Instruction with NO callsign",
        pilotSays: "Taxi to 28R via Hotel.",
        expect: "callsign_missing",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        mustContainAny: ["callsign", "say callsign", "confirm callsign"],
        mustNotContain: ["cleared to taxi", "taxi to runway 28R via"],
      },
      {
        label: "Instruction with WRONG callsign",
        pilotSays: "Cessna 4CD taxi to 28R via Hotel.",
        expect: "callsign_wrong",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        mustContainAny: ["callsign"],
        mustNotContain: ["cleared to taxi", "taxi to runway 28R via"],
      },
      {
        label: "Callsign present, ATIS OMITTED",
        pilotSays: "Cessna 3AB ready to taxi.",
        expect: "atis_missing",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        mustContainAny: ["ATIS", "information Echo", "Information Echo"],
        mustNotContain: ["taxi to runway 28R via"],
      },
      {
        label: "Callsign present, WRONG ATIS letter",
        pilotSays: "Cessna 3AB ready to taxi with Delta.",
        expect: "atis_mismatch",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        mustContainAny: ["Echo", "current ATIS", "verify"],
        mustNotContain: ["taxi to runway 28R via"],
      },
      {
        label: "Fully compliant transmission",
        pilotSays: "Cessna 3AB ready to taxi with Echo.",
        expect: "callsign_and_atis_ok",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
        mustContainAny: ["taxi", "runway"],
      },
    ] as Step[],
  },
];

/**
 * Build the SAME hint-injection block ATCTrainer.tsx wraps around every
 * pilot-chat call, so Test Mode hits the production decision pipeline.
 */
function buildHintMessages(step: Step) {
  const atisIntent = detectAtisIntent(step.pilotSays, step.currentAtisLetter);
  const callsignIntent = detectCallsignIntent(step.pilotSays, step.callsign);
  const currentAtisPhonetic = toAtisPhonetic(step.currentAtisLetter);

  const atisHint = atisIntent.hasToken
    ? [
        {
          role: "system" as const,
          content: atisIntent.matchesCurrent
            ? `[ATIS_CONFIRMED] The pilot's current transmission explicitly contains the active ATIS token${atisIntent.spokenPhonetic ? ` ("${atisIntent.spokenPhonetic}")` : ""}. Do NOT ask them to verify ATIS. Acknowledge and proceed with the requested instruction in the same transmission.`
            : `[ATIS_TOKEN_MISMATCH] The pilot stated "${atisIntent.spokenPhonetic}" but current ATIS is Information ${currentAtisPhonetic ?? step.currentAtisLetter}. Use exactly: "<Callsign>, verify you have the current ATIS, Information ${currentAtisPhonetic ?? step.currentAtisLetter}." Do not issue taxi clearance until confirmed.`,
        },
      ]
    : [];

  // Test Mode treats the test scenario as the pilot's first reply to a prior
  // ATC turn, so callsign discipline is always enforced (same as ATCTrainer
  // when priorWasATC).
  const callsignHint = !callsignIntent.hasCallsign
    ? [
        {
          role: "system" as const,
          content: `[CALLSIGN_MISSING] The pilot just transmitted a readback/acknowledgment WITHOUT including the aircraft callsign (${step.callsign} / "Three Alpha Bravo"). Per FAA AIM 4-2, every readback must include the callsign. DO NOT accept this transmission. Respond ONLY with one of: "Aircraft calling, say callsign." or "Three Alpha Bravo, confirm callsign on that readback?" — then STOP. Do not advance the clearance, do not issue any new instruction.`,
        },
      ]
    : [];

  return {
    detected: {
      hasCallsign: callsignIntent.hasCallsign,
      matchedVariant: callsignIntent.matchedVariant,
      hasAtisToken: atisIntent.hasToken,
      spokenPhonetic: atisIntent.spokenPhonetic,
      atisMatchesCurrent: atisIntent.matchesCurrent,
    },
    hintMessages: [...atisHint, ...callsignHint],
  };
}

/** Calls the real pilot-chat edge function the same way ATCTrainer does. */
async function callRealAtc(step: Step): Promise<{
  reply: string;
  detected: StepResult["detected"];
  error?: string;
}> {
  const { detected, hintMessages } = buildHintMessages(step);

  const systemPrompt =
    FAA_PROMPT("Ground — Taxi Clearance (Test Mode)") +
    `\n\nCURRENT ATIS: Information ${step.currentAtisLetter} is active at this field. ` +
    `The pilot is preparing to taxi. The previous controller transmission was an ` +
    `instruction, so any pilot reply MUST include the aircraft callsign (${step.callsign}).`;

  // Seed history with a prior ATC turn so the controller's reply is treated as
  // a response to a real instruction (mirroring ATCTrainer's priorWasATC path).
  const history = [
    {
      role: "assistant" as const,
      content: `${step.callsign}, Ground, taxi to runway 28R via Hotel, hold short 28R.`,
    },
    { role: "user" as const, content: step.pilotSays },
  ];

  try {
    const { data, error } = await supabase.functions.invoke("pilot-chat", {
      body: {
        mode: "atc",
        messages: [
          { role: "system", content: systemPrompt },
          ...hintMessages,
          ...history,
        ],
      },
    });
    if (error) throw error;
    const reply: string =
      data?.choices?.[0]?.message?.content || data?.reply || "";
    return { reply: reply.trim(), detected };
  } catch (e) {
    return {
      reply: "",
      detected,
      error: e instanceof Error ? e.message : "Edge function call failed",
    };
  }
}

function evaluateReply(step: Step, reply: string): { pass: boolean; reason: string } {
  if (!reply) {
    return { pass: false, reason: "✗ No reply received from ATC pipeline." };
  }
  const lower = reply.toLowerCase();
  const hits = step.mustContainAny.filter((s) => lower.includes(s.toLowerCase()));
  const banned = (step.mustNotContain ?? []).filter((s) =>
    lower.includes(s.toLowerCase()),
  );

  if (hits.length === 0) {
    return {
      pass: false,
      reason: `✗ Reply missing required correction. Expected one of: [${step.mustContainAny.join(" | ")}].`,
    };
  }
  if (banned.length > 0) {
    return {
      pass: false,
      reason: `✗ Reply contains forbidden content (${banned.join(", ")}) — controller advanced clearance instead of correcting the pilot.`,
    };
  }
  return { pass: true, reason: `✓ Controller correctly enforced: matched "${hits[0]}".` };
}

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
      ttsText.includes(expectedPhonetic) &&
      !new RegExp(`Information ${letter}\\b`).test(ttsText);
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
        const { reply, detected, error } = await callRealAtc(step);
        const verdict = error
          ? { pass: false, reason: `✗ Pipeline error: ${error}` }
          : evaluateReply(step, reply);
        const result: StepResult = {
          step,
          detected,
          actualAtcResponse: reply || "(no reply)",
          pass: verdict.pass,
          reason: verdict.reason,
        };
        next[scn.id] = [...next[scn.id], result];
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
            Runs against the <span className="font-mono text-primary">pilot-chat</span> edge
            function (the same pipeline production uses). Verifies callsign
            discipline, ATIS confirmation, and TTS phonetic expansion.
          </p>
        </div>
        <Button onClick={runAll} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running live...
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
                    <span className="badge-status-danger" tabIndex={0} role="status">FAILED</span>
                  ) : (
                    <span className="badge-status-success" tabIndex={0} role="status">PASSED</span>
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
                          <span className="font-mono">{step.callsign}</span>
                          {" · "}ATIS:{" "}
                          <span className="font-mono">{step.currentAtisLetter}</span>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                            <div className="text-emerald-500 mb-1">
                              EXPECTED ATC must include
                            </div>
                            <div className="font-mono">
                              [{step.mustContainAny.join(" | ")}]
                            </div>
                          </div>
                          <div
                            className={`rounded border p-2 ${
                              r.pass
                                ? "border-border/40 bg-muted/20"
                                : "border-destructive/30 bg-destructive/5"
                            }`}
                          >
                            <div
                              className={`mb-1 ${
                                r.pass ? "text-foreground" : "text-destructive"
                              }`}
                            >
                              ACTUAL ATC reply
                            </div>
                            <div className="font-mono break-words">
                              "{r.actualAtcResponse}"
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

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
                <Loader2 className="w-3 h-3 animate-spin" /> Pending — runs after radio steps complete...
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
                <div className={`text-5xl font-display ${proficiencyGrade.color}`}>
                  {proficiency}%
                </div>
                <div className={`text-xs uppercase tracking-widest mt-1 ${proficiencyGrade.color}`}>
                  {proficiencyGrade.label}
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <div>Radio dialogue (live ATC): {radioPass}/{radioTotal}</div>
                <div>Phonetic TTS: {phoneticPass}/{phoneticTotal}</div>
                <div>Total: {totalPass}/{totalCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
