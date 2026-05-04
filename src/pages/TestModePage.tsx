import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, FlaskConical } from "lucide-react";
import { detectAtisIntent } from "@/lib/atisIntent";
import { detectCallsignIntent } from "@/lib/callsignIntent";

type Step = {
  label: string;
  pilotSays: string;
  /** What the app's logic MUST flag/correct for this transmission. */
  expect:
    | "callsign_missing"
    | "atis_missing"
    | "callsign_and_atis_ok"
    | "atis_mismatch";
  /** Context the controller currently knows. */
  callsign?: string | null;
  currentAtisLetter?: string | null;
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
    hasAtisToken: boolean;
    atisMatchesCurrent: boolean;
  };
  pass: boolean;
  reason: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "taxi-missing-atis-and-callsign",
    name: "Request Taxi → Missing ATIS → Missing Tail Number",
    description:
      "Pilot calls Ground for taxi but omits the ATIS code AND their callsign. App must flag both omissions.",
    steps: [
      {
        label: "Initial taxi request — no callsign, no ATIS",
        pilotSays: "Ground, ready to taxi from the ramp.",
        expect: "callsign_missing",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
      },
      {
        label: "Pilot adds callsign but still missing ATIS",
        pilotSays: "Cessna 3AB ready to taxi.",
        expect: "atis_missing",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
      },
      {
        label: "Pilot reads back wrong ATIS letter",
        pilotSays: "Cessna 3AB taxi to 28R with Delta.",
        expect: "atis_mismatch",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
      },
      {
        label: "Compliant transmission — both callsign + correct ATIS",
        pilotSays: "Cessna 3AB ready to taxi with Echo.",
        expect: "callsign_and_atis_ok",
        callsign: "N123AB",
        currentAtisLetter: "Echo",
      },
    ],
  },
];

function evaluateStep(step: Step): StepResult {
  const cs = detectCallsignIntent(step.pilotSays, step.callsign ?? null);
  const atis = detectAtisIntent(step.pilotSays, step.currentAtisLetter ?? null);

  let pass = false;
  let reason = "";

  switch (step.expect) {
    case "callsign_missing":
      pass = !cs.hasCallsign;
      reason = pass
        ? "Logic correctly flagged missing callsign."
        : `FAIL: callsign was accepted (matched "${cs.matchedVariant}") but should have been blocked.`;
      break;
    case "atis_missing":
      pass = !atis.hasToken;
      reason = pass
        ? "Logic correctly flagged missing ATIS confirmation."
        : "FAIL: ATIS token was accepted but pilot did not state one.";
      break;
    case "atis_mismatch":
      pass = atis.hasToken && !atis.matchesCurrent;
      reason = pass
        ? `Logic correctly flagged ATIS mismatch (pilot said "${atis.spokenPhonetic}", current is "${step.currentAtisLetter}").`
        : "FAIL: wrong ATIS letter was not flagged as a mismatch.";
      break;
    case "callsign_and_atis_ok":
      pass = cs.hasCallsign && atis.hasToken && atis.matchesCurrent;
      reason = pass
        ? "Compliant transmission accepted as expected."
        : "FAIL: compliant transmission was incorrectly rejected.";
      break;
  }

  return {
    step,
    detected: {
      hasCallsign: cs.hasCallsign,
      hasAtisToken: atis.hasToken,
      atisMatchesCurrent: atis.matchesCurrent,
    },
    pass,
    reason,
  };
}

export default function TestModePage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, StepResult[]>>({});

  const runAll = async () => {
    setRunning(true);
    setResults({});
    const next: Record<string, StepResult[]> = {};
    for (const scn of SCENARIOS) {
      next[scn.id] = [];
      setResults({ ...next });
      for (const step of scn.steps) {
        // Small delay so the user can see the dialogue play out.
        await new Promise((r) => setTimeout(r, 350));
        next[scn.id] = [...next[scn.id], evaluateStep(step)];
        setResults({ ...next });
      }
    }
    setRunning(false);
  };

  const totals = Object.values(results)
    .flat()
    .reduce(
      (acc, r) => {
        acc.total++;
        if (r.pass) acc.pass++;
        else acc.fail++;
        return acc;
      },
      { total: 0, pass: 0, fail: 0 },
    );

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
            Simulates pilot transmissions and verifies the ATC enforcement logic
            (callsign + ATIS) flags the expected omissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totals.total > 0 && (
            <div className="text-sm font-mono">
              <span className="text-emerald-500">{totals.pass} pass</span>
              {" / "}
              <span className={totals.fail > 0 ? "text-destructive" : ""}>
                {totals.fail} fail
              </span>
            </div>
          )}
          <Button onClick={runAll} disabled={running}>
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
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          Step {idx + 1}: {step.label}
                        </div>
                        <div className="text-sm font-mono">
                          🎙️ "{step.pilotSays}"
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expected:{" "}
                          <span className="font-mono">{step.expect}</span>
                          {" · "}callsign:{" "}
                          <span className="font-mono">
                            {step.callsign ?? "—"}
                          </span>
                          {" · "}ATIS:{" "}
                          <span className="font-mono">
                            {step.currentAtisLetter ?? "—"}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {!r ? (
                          running ? (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              pending
                            </span>
                          )
                        ) : r.pass ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                    </div>
                    {r && (
                      <div
                        className={`mt-2 text-xs ${
                          r.pass ? "text-muted-foreground" : "text-destructive"
                        }`}
                      >
                        {r.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
