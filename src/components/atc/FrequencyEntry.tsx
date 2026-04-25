import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Radio } from "lucide-react";
import {
  formatFreq,
  lookupFacility,
  parseFreqInput,
  type AirportFrequencies,
} from "@/data/atcFrequencies";
import { cn } from "@/lib/utils";

interface FrequencyEntryProps {
  airport: AirportFrequencies;
  activeFreq: string;
  disabled?: boolean;
  onTune: (mhz: number) => void;
}

/**
 * Manual radio dial: pilot types a frequency like "119.2" and we:
 *  - parse + normalize to "119.200"
 *  - resolve which facility (if any) at the SELECTED airport answers it
 *  - warn when the freq is valid VHF but isn't published for this airport
 *    (and call out Guard/universal matches separately)
 */
export function FrequencyEntry({ airport, activeFreq, disabled, onTune }: FrequencyEntryProps) {
  const [raw, setRaw] = useState("");

  // Reset the field whenever the radio is tuned elsewhere (chip tap, swap, etc.)
  useEffect(() => {
    setRaw("");
  }, [activeFreq, airport.icao]);

  const parsed = useMemo(() => (raw.trim() ? parseFreqInput(raw) : null), [raw]);
  const lookup = useMemo(
    () => (parsed != null ? lookupFacility(airport.icao, parsed) : null),
    [parsed, airport.icao],
  );

  const normalized = parsed != null ? formatFreq(parsed) : "";
  const invalidShape = raw.trim().length > 0 && parsed == null;
  const matchedAirport = !!lookup?.facility && !lookup.isUniversal;
  const matchedUniversal = !!lookup?.facility && lookup.isUniversal;
  const noMatch = parsed != null && !lookup?.facility;

  const submit = () => {
    if (parsed == null || disabled) return;
    onTune(parsed);
  };

  return (
    <div className="rounded-md border border-border/70 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <Radio className="h-3 w-3 text-primary" />
        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
          Tune frequency
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="e.g. 119.2"
          disabled={disabled}
          aria-label="Enter VHF frequency in MHz"
          className={cn(
            "flex-1 min-w-0 px-2 py-1 rounded border bg-background/80 font-mono text-sm tabular-nums",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
            invalidShape || noMatch
              ? "border-amber-500/60"
              : matchedAirport
                ? "border-[hsl(var(--hud-green))]/60"
                : "border-border",
          )}
        />
        <span
          className="font-mono text-[11px] tabular-nums text-muted-foreground min-w-[64px] text-right"
          aria-label="Normalized frequency"
        >
          {normalized || "—"}
        </span>
        <button
          type="submit"
          disabled={disabled || parsed == null}
          className={cn(
            "px-2.5 py-1 rounded border text-[10px] font-display tracking-[0.18em] uppercase transition-colors",
            parsed == null
              ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed"
              : "border-primary bg-primary/15 text-primary hover:bg-primary/25",
          )}
        >
          Tune
        </button>
      </form>

      {/* Status / warning line */}
      <div className="mt-1.5 min-h-[16px] text-[10px] font-sans">
        {invalidShape && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="h-3 w-3" />
            Enter a VHF aviation frequency between 118.000 and 136.975 MHz.
          </span>
        )}
        {matchedAirport && (
          <span className="flex items-center gap-1 text-[hsl(var(--hud-green))]">
            <CheckCircle2 className="h-3 w-3" />
            {normalized} matches {lookup!.facility!.name} ({lookup!.facility!.kind}) at {airport.icao}.
          </span>
        )}
        {matchedUniversal && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="h-3 w-3" />
            {normalized} is {lookup!.facility!.name} (universal) — not a published {airport.icao} frequency.
          </span>
        )}
        {noMatch && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="h-3 w-3" />
            {normalized} isn’t published for {airport.icao}. Tuning will result in dead air.
          </span>
        )}
      </div>
    </div>
  );
}
