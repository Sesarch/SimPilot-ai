import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle2, XCircle, Loader2, Radio, Link2, Sparkles, Lock, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

const BRIDGE_VERSION = "1.0.1";
const INSTALLER_FILENAME = `SimPilot.Bridge.Setup.${BRIDGE_VERSION}.exe`;
const INSTALLER_DOWNLOAD_URL = `https://github.com/Sesarch/SimPilot-ai/releases/download/v${BRIDGE_VERSION}/${INSTALLER_FILENAME}`;

type DownloadState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "downloading"; received: number; total: number | null; startedAt: number }
  | { status: "saving" }
  | { status: "done" }
  | { status: "cancelled" }
  | { status: "error"; message: string; hint?: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function describeDownloadError(status: number, body: string): { message: string; hint?: string } {
  const trimmed = body.trim().slice(0, 240);
  switch (status) {
    case 401:
    case 403:
      return {
        message: "The download server rejected the request (auth).",
        hint: "Refresh the page or sign in again, then retry.",
      };
    case 404:
      return {
        message: `${INSTALLER_FILENAME} is not attached to the v${BRIDGE_VERSION} GitHub release yet.`,
        hint: "Wait for the release workflow to finish, then retry.",
      };
    case 429:
      return {
        message: "GitHub rate-limited the download proxy.",
        hint: "Wait a minute and try again.",
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: `Download proxy is temporarily unavailable (HTTP ${status}).`,
        hint: "Try again in a moment. If it persists, contact support.",
      };
    default:
      return {
        message: `Download failed with HTTP ${status}.`,
        hint: trimmed || undefined,
      };
  }
}

export default function BridgeSetupPage() {
  const [pairing, setPairing] = useState(false);
  const [pairResult, setPairResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [download, setDownload] = useState<DownloadState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

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

  const handleDownload = async () => {
    if (download.status === "downloading" || download.status === "starting" || download.status === "saving") {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setDownload({ status: "starting" });
    try {
      const res = await fetch(INSTALLER_DOWNLOAD_URL, { method: "GET", signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const { message, hint } = describeDownloadError(res.status, body);
        setDownload({ status: "error", message, hint });
        return;
      }
      const lenHeader = res.headers.get("content-length");
      const total = lenHeader ? Number(lenHeader) : null;
      const startedAt = Date.now();
      setDownload({ status: "downloading", received: 0, total, startedAt });

      if (!res.body) {
        // Browser doesn't expose a stream — fall back to blob() with no progress.
        const blob = await res.blob();
        triggerSave(blob);
        setDownload({ status: "done" });
        return;
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          setDownload({ status: "downloading", received, total, startedAt });
        }
      }
      setDownload({ status: "saving" });
      const blob = new Blob(chunks as BlobPart[], { type: "application/octet-stream" });
      triggerSave(blob);
      setDownload({ status: "done" });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setDownload({ status: "cancelled" });
        return;
      }
      const msg = (err as Error).message || "Network error during download.";
      setDownload({
        status: "error",
        message: msg,
        hint: "Check your connection and retry. If you're on a corporate network, the proxy may be blocked.",
      });
    } finally {
      abortRef.current = null;
    }
  };

  const triggerSave = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = INSTALLER_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const cancelDownload = () => {
    abortRef.current?.abort();
  };

  const isBusy =
    download.status === "starting" || download.status === "downloading" || download.status === "saving";
  const downloadDisabled = isBusy;
  const progressPct =
    download.status === "downloading" && download.total
      ? Math.min(100, Math.round((download.received / download.total) * 100))
      : download.status === "saving" || download.status === "done"
        ? 100
        : 0;
  const speedKbps =
    download.status === "downloading" && Date.now() - download.startedAt > 250
      ? (download.received / 1024) / ((Date.now() - download.startedAt) / 1000)
      : 0;
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
              <Button
                type="button"
                onClick={handleDownload}
                disabled={downloadDisabled}
                className="h-11 px-8 gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all font-semibold text-sm disabled:opacity-60 disabled:hover:scale-100"
              >
                {download.status === "starting" || download.status === "saving" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : download.status === "downloading" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {download.status === "starting"
                  ? `Connecting to SimPilot Bridge ${BRIDGE_VERSION}…`
                  : download.status === "downloading"
                    ? `Downloading SimPilot Bridge ${BRIDGE_VERSION}… ${progressPct}%`
                    : download.status === "saving"
                      ? `Saving SimPilot Bridge ${BRIDGE_VERSION}…`
                      : download.status === "done"
                        ? "Download complete · Re-download"
                        : "Download for Windows"}
              </Button>
              {isBusy && (
                <Button type="button" variant="outline" className="h-11 gap-2" onClick={cancelDownload}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
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

            {/* Download progress */}
            {(isBusy || download.status === "done" || download.status === "cancelled") && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5"
              >
                <Progress value={progressPct} className="h-2" />
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>
                    {download.status === "downloading" && download.total
                      ? `${formatBytes(download.received)} / ${formatBytes(download.total)}`
                      : download.status === "downloading"
                        ? `${formatBytes(download.received)} received`
                        : download.status === "starting"
                          ? "Contacting download proxy…"
                          : download.status === "saving"
                            ? "Writing file to disk…"
                            : download.status === "done"
                              ? `Saved ${INSTALLER_FILENAME}`
                              : "Download cancelled"}
                  </span>
                  <span>
                    {download.status === "downloading" && speedKbps > 0
                      ? speedKbps > 1024
                        ? `${(speedKbps / 1024).toFixed(2)} MB/s`
                        : `${speedKbps.toFixed(0)} KB/s`
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Download error */}
            {download.status === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Download failed</p>
                  <p>{download.message}</p>
                  {download.hint && <p className="text-destructive/80">{download.hint}</p>}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="underline font-semibold hover:text-destructive/80"
                  >
                    Retry download
                  </button>
                </div>
              </div>
            )}

            {/* Installer availability check — hidden for v1.0.1 stable launch */}

            <p className="text-xs text-muted-foreground">
              Pinned to v{BRIDGE_VERSION} · Windows installer: {INSTALLER_FILENAME}
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

