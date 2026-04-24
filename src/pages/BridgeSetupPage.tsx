import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle2, XCircle, Loader2, Radio, Link2, Sparkles, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

const BRIDGE_VERSION = "1.0.1";
const INSTALLER_FILENAME = `SimPilot Bridge Setup ${BRIDGE_VERSION}.exe`;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const INSTALLER_DOWNLOAD_URL = `${SUPABASE_URL}/functions/v1/bridge-download?platform=windows&version=${BRIDGE_VERSION}`;
const INSTALLER_CHECK_URL = `${SUPABASE_URL}/functions/v1/bridge-download?check=1&version=${BRIDGE_VERSION}`;

type InstallerCheck =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "error"; message: string };

export default function BridgeSetupPage() {
  const [pairing, setPairing] = useState(false);
  const [pairResult, setPairResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [installerCheck, setInstallerCheck] = useState<InstallerCheck>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    const verifyInstaller = async () => {
      try {
        const res = await fetch(INSTALLER_CHECK_URL, { method: "GET" });
        if (cancelled) return;
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          setInstallerCheck({
            status: "error",
            message: `Installer check returned HTTP ${res.status}. ${text.slice(0, 160)}`,
          });
          return;
        }
        const data = (await res.json()) as { windows?: boolean; version?: string };
        if (!data.windows) {
          setInstallerCheck({
            status: "error",
            message: `${INSTALLER_FILENAME} is not attached to the v${BRIDGE_VERSION} GitHub release.`,
          });
          return;
        }
        setInstallerCheck({ status: "ok" });
      } catch (err) {
        if (cancelled) return;
        setInstallerCheck({
          status: "error",
          message:
            (err as Error).message ||
            `Could not verify the installer. Confirm ${INSTALLER_FILENAME} is attached to the v${BRIDGE_VERSION} GitHub release.`,
        });
      }
    };
    verifyInstaller();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="SimPilot Bridge Setup | SimPilot.AI"
        description="Install and connect the SimPilot Bridge sidecar to stream MSFS 2024 and X-Plane 12 telemetry into your Flight Deck."
        keywords="SimPilot Bridge, MSFS 2024 SimConnect, X-Plane 12 telemetry, flight deck setup"
        canonical="/flight-deck/bridge"
        noIndex
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
          <Badge variant="outline" className="font-mono text-xs border-primary/50 text-primary">v{BRIDGE_VERSION} · STABLE</Badge>
        </div>
        <h1 className="font-orbitron text-3xl md:text-4xl font-bold tracking-tight mb-3">
          SimPilot Bridge Setup
        </h1>
        <p className="text-muted-foreground max-w-2xl mb-6">
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
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Download the installer for your platform, run the bridge app, and leave it open while you fly.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Pinned v{BRIDGE_VERSION}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={INSTALLER_DOWNLOAD_URL}
                className="inline-flex items-center gap-2 h-11 rounded-md px-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all font-semibold text-sm"
              >
                <Download className="h-5 w-5" />
                Download for Windows
              </a>
              <span
                title="Windows Only"
                aria-disabled="true"
                className="inline-flex items-center gap-2 h-11 rounded-md px-6 border border-border bg-muted/40 text-muted-foreground cursor-not-allowed font-semibold text-sm opacity-60"
              >
                <Lock className="h-4 w-4" />
                macOS · Windows Only
              </span>
              <span
                title="Windows Only"
                aria-disabled="true"
                className="inline-flex items-center gap-2 h-11 rounded-md px-6 border border-border bg-muted/40 text-muted-foreground cursor-not-allowed font-semibold text-sm opacity-60"
              >
                <Lock className="h-4 w-4" />
                Linux · Windows Only
              </span>
            </div>

            {/* Installer availability check */}
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                installerCheck.status === "ok"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : installerCheck.status === "error"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {installerCheck.status === "checking" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mt-0.5" />
                  <span>Verifying installer at <span className="font-mono">{INSTALLER_FILENAME}</span>…</span>
                </>
              )}
              {installerCheck.status === "ok" && (
                <>
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>Verified · v{BRIDGE_VERSION} installer is reachable.</span>
                </>
              )}
              {installerCheck.status === "error" && (
                <>
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>
                    Installer check failed: {installerCheck.message}{" "}
                    <a
                      href={`https://github.com/Sesarch/SimPilot-ai/releases/tag/v${BRIDGE_VERSION}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View release
                    </a>
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Pinned to v{BRIDGE_VERSION} · Windows: {INSTALLER_FILENAME} · macOS &amp; Linux are disabled for this Windows-only launch.
            </p>
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
              <AccordionItem value="pmdg">
                <AccordionTrigger>PMDG aircraft (737 / 777 / 747) — optional</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    SimPilot Bridge auto-detects PMDG airframes and unlocks advanced data —
                    MCP altitude / heading / IAS, autopilot &amp; autothrottle state, and flap handle
                    position — for richer briefings and post-flight analysis.
                  </p>
                  <p>
                    For the data to actually broadcast, open the aircraft's options <span className="font-mono">.ini</span> file
                    (e.g. <span className="font-mono text-foreground">…\PMDG\PMDG 737\PMDG_737_options.ini</span>) and add or set:
                  </p>
                  <pre className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs font-mono text-foreground">
{`[SDK]
EnableDataBroadcast=1`}
                  </pre>
                  <p>
                    Restart MSFS after editing. The bridge will log{" "}
                    <span className="font-mono text-foreground">PMDG aircraft detected</span> when it sees the airframe load.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Step 3 — One-click pairing */}
        <Card className="mb-6 border-primary/40 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold">3</span>
              <Sparkles className="h-4 w-4 text-primary" />
              Pair with one click
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              With the bridge installed and running, click below to mint a 5-minute pairing token and hand it
              off to the desktop app via the <span className="font-mono text-foreground">simpilot://</span> protocol.
              Your browser will ask permission the first time.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handlePairBridge} disabled={pairing} className="gap-2">
                {pairing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Pairing…</>
                ) : (
                  <><Link2 className="h-4 w-4" />Pair Bridge</>
                )}
              </Button>
              {pairResult && (
                <span className={`inline-flex items-center gap-2 text-sm ${pairResult.ok ? "text-primary" : "text-destructive"}`}>
                  {pairResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {pairResult.ok ? "Handshake sent" : "Pairing failed"}
                </span>
              )}
            </div>
            {pairResult && (
              <p className={`text-sm ${pairResult.ok ? "text-muted-foreground" : "text-destructive"}`}>
                {pairResult.message}
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

