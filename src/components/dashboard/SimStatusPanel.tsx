import { useEffect, useState } from "react";
import { Plug, PlugZap, Radio, Plane, Sparkles, ArrowUpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSimBridge } from "@/hooks/useSimBridge";
import { readCachedBridgeRelease, isNewerVersion } from "@/lib/bridgeReleaseCache";

const SimStatusPanel = () => {
  // Telemetry listener is always on; users configure their sim on /flight-deck/bridge.
  // MSFS 2024 is the default source — the bridge auto-detects MSFS vs X-Plane upstream.
  const { status, telemetry, lastUpdate, isFlightActive, isConnected, bridgeVersion } = useSimBridge({
    enabled: true,
    source: "msfs2024",
  });

  // Latest published bridge tag, sourced from the localStorage cache populated
  // by /flight-deck/bridge. We re-read on mount and whenever the bridge
  // reports its version so the badge stays accurate without a network call.
  const [latestTag, setLatestTag] = useState<string | null>(null);
  useEffect(() => {
    const cached = readCachedBridgeRelease();
    setLatestTag(cached?.tagName ?? null);
  }, [bridgeVersion]);

  const updateAvailable = isConnected && isNewerVersion(bridgeVersion, latestTag);

  const isConnecting = status === "connecting";

  const fmt = (n: number | undefined, digits = 0) =>
    n == null || Number.isNaN(n) ? "---" : n.toFixed(digits);

  const com1 = telemetry?.com1 ?? "---.---";

  // Status pill — pulsing cyan-glow when LIVE
  const statusDot = isConnected
    ? "bg-[hsl(var(--cyan-glow))] shadow-[0_0_8px_hsl(var(--cyan-glow))] animate-pulse"
    : isConnecting
      ? "bg-[hsl(var(--amber-instrument))] animate-pulse"
      : "bg-destructive/70";

  const statusLabel = isConnected ? "LIVE" : isConnecting ? "LINKING" : "OFFLINE";

  return (
    <div className="g3000-bezel rounded-xl p-4 sm:p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <PlugZap className="w-[18px] h-[18px] text-[hsl(var(--cyan-glow))]" />
          ) : (
            <Plug className="w-[18px] h-[18px] text-muted-foreground" />
          )}
          <span className="font-display text-[12px] font-semibold tracking-[0.22em] uppercase text-foreground/90">
            SimPilot Bridge · Telemetry Link
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", statusDot)} />
          <span
            className={cn(
              "font-display text-[12px] font-semibold tracking-[0.22em] uppercase",
              isConnected
                ? "text-[hsl(var(--cyan-glow))]"
                : isConnecting
                  ? "text-[hsl(var(--amber-instrument))]"
                  : "text-muted-foreground",
            )}
          >
            {statusLabel}
          </span>
          {isFlightActive && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 font-display text-[11px] font-semibold tracking-[0.2em] uppercase text-primary">
              <Plane className="w-3 h-3" /> In Flight
            </span>
          )}
        </div>
      </div>

      {/* Telemetry readouts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "ALT (FT)", value: fmt(telemetry?.alt) },
          { label: "HDG", value: fmt(telemetry?.hdg).padStart(3, "0") + "°" },
          { label: "IAS (KT)", value: fmt(telemetry?.spd) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border bg-background/40 px-3 py-3 text-center"
          >
            <div className="font-display text-[12px] font-bold tracking-[0.24em] uppercase text-foreground/80">
              {item.label}
            </div>
            <div
              className={cn(
                "font-display text-3xl font-extrabold tabular-nums mt-1.5",
                isConnected ? "text-[hsl(var(--cyan-glow))]" : "text-muted-foreground/70",
              )}
              style={isConnected ? { textShadow: "0 0 12px hsl(var(--cyan-glow) / 0.5)" } : undefined}
            >
              {isConnected ? item.value : "---"}
            </div>
          </div>
        ))}
      </div>

      {/* COM1 sync */}
      <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[hsl(var(--amber-instrument))]" />
          <span className="font-display text-[12px] font-semibold tracking-[0.22em] uppercase text-foreground/90">
            COM1 · ATC Radio Sync
          </span>
        </div>
        <span
          className={cn(
            "font-display text-base font-bold tabular-nums",
            isConnected && telemetry?.com1
              ? "text-[hsl(var(--amber-instrument))]"
              : "text-muted-foreground/60",
          )}
        >
          {isConnected ? com1 : "---.---"}
        </span>
      </div>

      {/* PMDG advanced data — only shown when bridge reports a PMDG airframe */}
      {isConnected && telemetry?.pmdg && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/[0.04] p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-display text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">
                {telemetry.pmdg.variant} · MCP / FCU
              </span>
            </div>
            <div className="flex items-center gap-2 font-display text-[10px] font-semibold tracking-[0.2em] uppercase">
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-sm border",
                  telemetry.pmdg.autopilot_master
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground/70",
                )}
              >
                A/P {telemetry.pmdg.autopilot_master ? "ON" : "OFF"}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-sm border",
                  telemetry.pmdg.autothrottle_active
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground/70",
                )}
              >
                A/T {telemetry.pmdg.autothrottle_active ? "ON" : "OFF"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "MCP ALT", value: fmt(telemetry.pmdg.mcp_altitude) },
              { label: "MCP HDG", value: fmt(telemetry.pmdg.mcp_heading).padStart(3, "0") + "°" },
              { label: "MCP IAS", value: fmt(telemetry.pmdg.mcp_ias) },
              { label: "FLAPS", value: String(telemetry.pmdg.flaps_handle_index) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-sm border border-border bg-background/50 px-2 py-2 text-center"
              >
                <div className="font-display text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/70">
                  {item.label}
                </div>
                <div
                  className="font-display text-lg font-extrabold tabular-nums mt-0.5 text-primary"
                  style={{ textShadow: "0 0 10px hsl(var(--primary) / 0.45)" }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status footer */}
      <div className="mt-3 pt-3 border-t border-border font-display text-[12px] font-semibold tracking-[0.22em] uppercase text-foreground/70">
        {isConnecting
          ? `Linking ws://localhost:8080…`
          : isConnected && lastUpdate
            ? `Last frame · ${new Date(lastUpdate).toLocaleTimeString()}`
            : `Awaiting bridge on ws://localhost:8080 — set up at /flight-deck/bridge`}
      </div>
    </div>
  );
};

export default SimStatusPanel;
