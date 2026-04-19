import { Plug, PlugZap, Radio, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimBridge } from "@/hooks/useSimBridge";

const SimStatusPanel = () => {
  // Telemetry listener is always on; users configure their sim on /flight-deck/bridge.
  // MSFS 2024 is the default source — the bridge auto-detects MSFS vs X-Plane upstream.
  const { status, telemetry, lastUpdate, isFlightActive, isConnected } = useSimBridge({
    enabled: true,
    source: "msfs2024",
  });

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
            <PlugZap className="w-4 h-4 text-[hsl(var(--cyan-glow))]" />
          ) : (
            <Plug className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            SimPilot Bridge · Telemetry Link
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-1.5 h-1.5 rounded-full", statusDot)} />
          <span
            className={cn(
              "font-display text-[10px] tracking-[0.25em] uppercase",
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
            <span className="ml-1 inline-flex items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-display text-[9px] tracking-[0.2em] uppercase text-primary">
              <Plane className="w-2.5 h-2.5" /> In Flight
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
            className="rounded-md border border-border bg-background/40 px-3 py-2 text-center"
          >
            <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              {item.label}
            </div>
            <div
              className={cn(
                "font-display text-lg font-bold tabular-nums mt-0.5",
                isConnected ? "text-[hsl(var(--cyan-glow))]" : "text-muted-foreground/60",
              )}
            >
              {isConnected ? item.value : "---"}
            </div>
          </div>
        ))}
      </div>

      {/* COM1 sync */}
      <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-[hsl(var(--amber-instrument))]" />
          <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            COM1 · ATC Radio Sync
          </span>
        </div>
        <span
          className={cn(
            "font-display text-sm font-bold tabular-nums",
            isConnected && telemetry?.com1
              ? "text-[hsl(var(--amber-instrument))]"
              : "text-muted-foreground/60",
          )}
        >
          {isConnected ? com1 : "---.---"}
        </span>
      </div>

      {/* Status footer */}
      <div className="mt-3 pt-3 border-t border-border font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground/70">
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
