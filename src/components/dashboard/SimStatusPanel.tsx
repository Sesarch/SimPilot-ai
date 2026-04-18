import { useState } from "react";
import { Plug, PlugZap, Radio, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSimTelemetry, type SimMode } from "@/hooks/useSimTelemetry";

const MODE_LABEL: Record<SimMode, string> = {
  msfs2024: "MSFS 2024",
  xplane12: "X-Plane 12",
};

const SimStatusPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const { mode, setMode, status, telemetry, lastUpdate } = useSimTelemetry({ enabled });

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const statusColor =
    status === "connected"
      ? "bg-[hsl(var(--cyan-glow))]"
      : status === "connecting"
        ? "bg-[hsl(var(--amber-instrument))] animate-pulse"
        : "bg-destructive/70";

  const statusLabel =
    status === "connected" ? "CONNECTED" : status === "connecting" ? "LINKING" : "DISCONNECTED";

  const fmt = (n: number | undefined, digits = 0) =>
    n == null || Number.isNaN(n) ? "---" : n.toFixed(digits);

  const com1 = telemetry?.com1_freq ?? "---.---";

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
            Sim Telemetry Link
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColor)} />
          <span
            className={cn(
              "font-display text-[10px] tracking-[0.25em] uppercase",
              isConnected ? "text-[hsl(var(--cyan-glow))]" : "text-muted-foreground",
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Telemetry readouts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "ALT (FT)", value: fmt(telemetry?.altitude) },
          { label: "HDG", value: fmt(telemetry?.heading).padStart(3, "0") + "°" },
          { label: "IAS (KT)", value: fmt(telemetry?.speed) },
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
            isConnected && telemetry?.com1_freq
              ? "text-[hsl(var(--amber-instrument))]"
              : "text-muted-foreground/60",
          )}
        >
          {isConnected ? com1 : "---.---"}
        </span>
      </div>

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
            {(Object.keys(MODE_LABEL) as SimMode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md border px-3 py-2 font-display text-[10px] tracking-[0.2em] uppercase transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {MODE_LABEL[m]}
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
              : `Awaiting bridge on ws://localhost:8080`}
        </div>
      </div>
    </div>
  );
};

export default SimStatusPanel;
