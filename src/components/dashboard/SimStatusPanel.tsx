import { useState } from "react";
import { Link } from "react-router-dom";
import { Plug, PlugZap, Radio, Settings2, Download, Plane } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSimBridge, type SimSource } from "@/hooks/useSimBridge";

const SOURCE_LABEL: Record<SimSource, string> = {
  msfs2024: "MSFS 2024",
  xplane12: "X-Plane 12",
};

const SimStatusPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [source, setSource] = useState<SimSource>("msfs2024");
  const { status, telemetry, lastUpdate, isFlightActive, isConnected } = useSimBridge({
    enabled,
    source,
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

      {/* Bridge download CTA — shown when not connected */}
      {!isConnected && enabled && (
        <div className="mb-4 rounded-md border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-start gap-3">
            <Download className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-display text-[10px] tracking-[0.25em] uppercase text-primary mb-1">
                Install SimPilot Bridge
              </div>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed mb-2">
                A small Windows app that streams MSFS 2024 / X-Plane 12 telemetry to your Flight Deck.
                Required to enable live data and auto-logging.
              </p>
              <Link
                to="/flight-deck/bridge"
                className="inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-[10px] tracking-[0.2em] uppercase text-primary hover:bg-primary/20 transition-colors"
              >
                <Download className="w-3 h-3" /> Set Up SimPilot Bridge
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Telemetry Listener
            </span>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable telemetry" />
        </div>

        <div>
          <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
            Sim Source
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SOURCE_LABEL) as SimSource[]).map((m) => {
              const active = source === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSource(m)}
                  className={cn(
                    "rounded-md border px-3 py-2 font-display text-[10px] tracking-[0.2em] uppercase transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {SOURCE_LABEL[m]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground/70">
          {isConnecting
            ? `Linking ws://localhost:8080…`
            : isConnected && lastUpdate
              ? `Last frame · ${new Date(lastUpdate).toLocaleTimeString()}`
              : enabled
                ? `Awaiting bridge on ws://localhost:8080`
                : `Listener off — toggle on once the bridge is installed`}
        </div>
      </div>
    </div>
  );
};

export default SimStatusPanel;
