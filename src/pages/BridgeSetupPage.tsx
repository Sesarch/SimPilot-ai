import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Plug, CheckCircle2, XCircle, Loader2, AlertTriangle, Radio, Copy, ShieldCheck, Link2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

type TestState = "idle" | "testing" | "success" | "failure";

const BRIDGE_URL = "ws://localhost:8080";
const TEST_TIMEOUT_MS = 4000;

// SimPilot Bridge Windows installer.
// Points at the GitHub Releases "latest" alias so the URL never goes stale —
// publish a new release tagged on the simpilot-ai/bridge repo and this button
// instantly serves the new build. Override per-version if you ever need to pin
// (e.g. ".../releases/download/v0.2.0/SimPilotBridge.exe").
const BRIDGE_DOWNLOAD_URL: string | null =
  "https://github.com/simpilot-ai/bridge/releases/latest/download/SimPilotBridge.exe";
// SHA-256 of the published SimPilotBridge.exe (lowercase hex, 64 chars).
// Publish this alongside the GitHub Release so users can verify integrity:
//   Get-FileHash SimPilotBridge.exe -Algorithm SHA256
const BRIDGE_DOWNLOAD_SHA256: string | null = null;
const BRIDGE_RELEASES_URL = "https://github.com/simpilot-ai/bridge/releases";
const BRIDGE_SOURCE_URL = "https://github.com/simpilot-ai/bridge";

export default function BridgeSetupPage() {
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState<string>("");
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [pairResult, setPairResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handlePairBridge = async () => {
    setPairing(true);
    setPairResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setPairResult({ ok: false, message: "Sign in first — pairing requires your SimPilot session." });
        return;
      }
      const { data, error } = await supabase.functions.invoke("bridge-pair-token");
      if (error) throw error;
      const deepLink = (data as { deep_link?: string })?.deep_link;
      if (!deepLink) throw new Error("No deep link returned");
      // Trigger the simpilot:// protocol — Windows hands off to the installed bridge.
      window.location.href = deepLink;
      setPairResult({
        ok: true,
        message: "Pairing handshake sent. Check the SimPilot Bridge tray app — it should light up green within a few seconds.",
      });
    } catch (err) {
      setPairResult({ ok: false, message: (err as Error).message || "Failed to mint pairing token." });
    } finally {
      setPairing(false);
    }
  };

  const runTest = async () => {
    setTestState("testing");
    setTestMessage("Connecting to ws://localhost:8080…");
    setLastFrame(null);

    // The bridge requires an authenticated session — fetch the access token
    // before opening the socket so we can complete the handshake.
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setTestState("failure");
      setTestMessage("You need to be signed in to test the bridge — it only accepts your authenticated session token.");
      return;
    }

    let ws: WebSocket | null = null;
    let settled = false;

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      setTestState("failure");
      setTestMessage(msg);
      try { ws?.close(); } catch { /* noop */ }
    };

    const succeed = (frame?: string) => {
      if (settled) return;
      settled = true;
      setTestState("success");
      setTestMessage("Bridge detected and authenticated. Telemetry stream is live.");
      if (frame) setLastFrame(frame);
      try { ws?.close(); } catch { /* noop */ }
    };

    const timer = window.setTimeout(() => {
      fail("No response from the bridge after 4 seconds. Make sure SimPilot Bridge is running.");
    }, TEST_TIMEOUT_MS);

    try {
      ws = new WebSocket(BRIDGE_URL);
      ws.onopen = () => {
        setTestMessage("Connected. Authenticating…");
        try {
          ws?.send(JSON.stringify({ type: "auth", token }));
        } catch (err) {
          fail((err as Error).message);
        }
      };
      ws.onmessage = (evt) => {
        const text = typeof evt.data === "string" ? evt.data : "";
        try {
          const parsed = JSON.parse(text);
          if (parsed?.type === "auth-error") {
            window.clearTimeout(timer);
            fail(`Bridge rejected the session token (${parsed.reason ?? "unknown"}).`);
            return;
          }
          if (parsed?.type === "auth-ok") {
            setTestMessage("Authenticated. Waiting for first telemetry frame…");
            return;
          }
        } catch {
          // not a control frame — fall through, treat as telemetry
        }
        window.clearTimeout(timer);
        succeed(text.slice(0, 240));
      };
      ws.onerror = () => {
        window.clearTimeout(timer);
        fail("Could not reach ws://localhost:8080. Is SimPilot Bridge installed and running?");
      };
      ws.onclose = (evt) => {
        if (!settled) {
          window.clearTimeout(timer);
          if (evt.code === 4401) {
            fail("Bridge rejected the session token. Sign out and back in, then retry.");
          } else {
            fail(`Connection closed before any data arrived (code ${evt.code}).`);
          }
        }
      };
    } catch (err) {
      window.clearTimeout(timer);
      fail((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="SimPilot Bridge Setup | SimPilot.AI"
        description="Install and connect the SimPilot Bridge sidecar to stream MSFS 2024 and X-Plane 12 telemetry into your Flight Deck."
        keywords="SimPilot Bridge, MSFS 2024 SimConnect, X-Plane 12 telemetry, flight deck setup"
        canonical="/flight-deck/bridge"
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Flight Deck
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Radio className="h-6 w-6 text-primary" />
          <Badge variant="outline" className="font-mono text-xs">v0.1.0 · BETA</Badge>
        </div>
        <h1 className="font-orbitron text-3xl md:text-4xl font-bold tracking-tight mb-3">
          SimPilot Bridge Setup
        </h1>
        <p className="text-muted-foreground max-w-2xl mb-10">
          The SimPilot Bridge is a small app that runs on your PC and streams live telemetry from
          Microsoft Flight Simulator 2024 or X-Plane 12 into your browser-based Flight Deck.
        </p>

        {/* Step 1 — Download */}
        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold">1</span>
              Download &amp; install
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the Windows installer, run <span className="font-mono text-foreground">SimPilotBridge.exe</span>, and
              leave it open while you fly. macOS / Linux builds are coming soon — for now you can run it from source.
            </p>
            <div className="flex flex-wrap gap-3">
              {BRIDGE_DOWNLOAD_URL ? (
                <Button asChild className="gap-2">
                  <a href={BRIDGE_DOWNLOAD_URL} download>
                    <Download className="h-4 w-4" />
                    Download SimPilotBridge.exe
                  </a>
                </Button>
              ) : (
                <Button disabled className="gap-2">
                  <Download className="h-4 w-4" />
                  Download for Windows (coming soon)
                </Button>
              )}
              <Button asChild variant="outline" className="gap-2">
                <a href={BRIDGE_RELEASES_URL} target="_blank" rel="noreferrer noopener">
                  All releases
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={BRIDGE_SOURCE_URL} target="_blank" rel="noreferrer noopener">
                  View source
                </a>
              </Button>
            </div>
            {BRIDGE_DOWNLOAD_SHA256 && (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  SHA-256 checksum
                </div>
                <div className="flex items-start gap-2">
                  <code className="flex-1 break-all rounded bg-background/60 px-2 py-1.5 font-mono text-[11px] text-foreground">
                    {BRIDGE_DOWNLOAD_SHA256}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(BRIDGE_DOWNLOAD_SHA256);
                      toast({ title: "Checksum copied", description: "Paste it next to your Get-FileHash output to compare." });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Verify on Windows: <span className="font-mono text-foreground">Get-FileHash SimPilotBridge.exe -Algorithm SHA256</span>
                  </p>
                  <p>
                    Verify on macOS / Linux: <span className="font-mono text-foreground">shasum -a 256 SimPilotBridge.exe</span>
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The bridge binds to <span className="font-mono">127.0.0.1:8080</span> only — it never exposes data to your network.
            </p>
          </CardContent>
        </Card>

        {/* Step 2 — Configure your sim */}
        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold">2</span>
              Configure your sim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="msfs">
              <AccordionItem value="msfs">
                <AccordionTrigger>Microsoft Flight Simulator 2024 / 2020</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>No additional setup required. SimConnect is enabled by default in MSFS.</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Launch MSFS and load any flight (or sit at the menu).</li>
                    <li>Start SimPilot Bridge.</li>
                    <li>Open the Flight Deck and toggle the sim listener on.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="xplane">
                <AccordionTrigger>X-Plane 12</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Enable UDP Data Output so the bridge can read telemetry:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>X-Plane → <span className="font-mono">Settings → Data Output</span>.</li>
                    <li>
                      Tick the <span className="font-mono">Network via UDP</span> column for rows{" "}
                      <span className="font-mono">3 (Speeds)</span>, <span className="font-mono">17 (Pitch/Roll/Hdg)</span>,{" "}
                      <span className="font-mono">20 (Lat/Lon/Alt)</span>, and{" "}
                      <span className="font-mono">116 (COM Frequencies)</span>.
                    </li>
                    <li>
                      Set the IP to <span className="font-mono">127.0.0.1</span> and port to{" "}
                      <span className="font-mono">49003</span>.
                    </li>
                    <li>Set the data rate to ~10 Hz.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Step 3 — Test connection */}
        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold">3</span>
              Test connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runTest} disabled={testState === "testing"} className="gap-2">
                {testState === "testing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing…
                  </>
                ) : (
                  <>
                    <Plug className="h-4 w-4" />
                    Test connection
                  </>
                )}
              </Button>

              {testState === "success" && (
                <span className="inline-flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              )}
              {testState === "failure" && (
                <span className="inline-flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  Failed
                </span>
              )}
            </div>

            {testMessage && (
              <p className={`text-sm ${testState === "failure" ? "text-destructive" : "text-muted-foreground"}`}>
                {testMessage}
              </p>
            )}

            {lastFrame && (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">First frame</p>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">{lastFrame}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="not-running">
                <AccordionTrigger>Test says "No response from the bridge"</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>Make sure <span className="font-mono">SimPilotBridge.exe</span> is running — you should see a console window.</p>
                  <p>Check that no other app is using port <span className="font-mono">8080</span>.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="firewall">
                <AccordionTrigger>Windows Firewall is blocking the bridge</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  When you first run the bridge, allow it on <strong>Private networks</strong>. The bridge only listens on{" "}
                  <span className="font-mono">127.0.0.1</span> so your data never leaves your machine.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="msfs-noconnect">
                <AccordionTrigger>MSFS connects but no telemetry shows up</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  SimConnect only emits values once a flight is loaded. Sit at the runway or in flight, then re-test.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="xplane-noconnect">
                <AccordionTrigger>X-Plane is running but the bridge sees nothing</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>Double-check the four required Data Output rows are ticked under <span className="font-mono">Network via UDP</span>.</p>
                  <p>Confirm the destination IP is <span className="font-mono">127.0.0.1</span> and port <span className="font-mono">49003</span>.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="https">
                <AccordionTrigger>Browser blocks ws:// from an https:// page</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Modern browsers allow <span className="font-mono">ws://localhost</span> from secure pages. If your browser
                  still blocks it, try Chrome or Edge — Safari occasionally requires a flag.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
