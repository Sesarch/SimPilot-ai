import { useMemo, useState } from "react";
import { FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A small, self-contained sandbox so the pilot can type a blocked
 * transmission and preview which custom phrase rule + facility would be
 * inferred BEFORE saving the rule. Pure UI — no localStorage writes.
 *
 * Inputs:
 *  - transmission (free text, e.g. "tower clearance for departure")
 *  - draft phrase (substring) → action mapping the user is considering
 *
 * Outputs:
 *  - which rule matches (draft vs. built-in)
 *  - inferred action label
 *  - inferred facility (GROUND/TOWER/CLEARANCE/APPROACH/...)
 */

type FacilityKind =
  | "GROUND" | "TOWER" | "CLEARANCE" | "APPROACH" | "DEPARTURE"
  | "CENTER" | "ATIS" | "AWOS" | "CTAF" | "UNICOM" | "GUARD";

const ACTION_OPTIONS = [
  "taxi clearance",
  "takeoff clearance",
  "landing clearance",
  "IFR clearance",
  "VFR request",
  "radio check",
  "check-in",
  "request",
];

/** Mirrors the built-in inference used by the blocked-request chip. */
function builtInAction(said: string): string {
  if (/\btaxi\b/.test(said)) return "taxi clearance";
  if (/\bcleared?\s+for\s+takeoff|\btakeoff\b|\bdeparture\b/.test(said)) return "takeoff clearance";
  if (/\bcleared?\s+to\s+land|\blanding\b|\bfull\s+stop\b/.test(said)) return "landing clearance";
  if (/\bifr\s+clearance|\bclearance\b|\bifr\b/.test(said)) return "IFR clearance";
  if (/\bvfr\s+departure|\bvfr\b/.test(said)) return "VFR request";
  if (/\bready\s+to\s+copy|\brequest\b/.test(said)) return "request";
  if (/\bradio\s+check|\bcomm\s+check\b/.test(said)) return "radio check";
  if (/\binformation\s+[a-z]\b|\bwith\s+(?:information\s+)?[a-z]\b/.test(said)) return "check-in";
  return "transmission";
}

/** Best-guess facility from the action + raw text. */
function inferFacility(said: string, action: string): FacilityKind {
  if (/\btaxi\b|\bground\b|\bhold\s+short\b|\bcross\s+runway\b/.test(said)) return "GROUND";
  if (action === "taxi clearance") return "GROUND";
  if (action === "takeoff clearance" || action === "landing clearance") return "TOWER";
  if (action === "IFR clearance") return "CLEARANCE";
  if (/\bapproach\b/.test(said)) return "APPROACH";
  if (/\bdeparture\b/.test(said)) return "DEPARTURE";
  if (/\bcenter\b/.test(said)) return "CENTER";
  if (/\batis\b/.test(said)) return "ATIS";
  if (/\bguard\b|\bmayday\b|\bpan[\s-]?pan\b/.test(said)) return "GUARD";
  if (/\btraffic\b|\bctaf\b/.test(said)) return "CTAF";
  if (/\btower\b/.test(said)) return "TOWER";
  return "TOWER";
}

const KIND_NICE: Record<FacilityKind, string> = {
  TOWER: "Tower", GROUND: "Ground", CLEARANCE: "Clearance Delivery",
  APPROACH: "Approach", DEPARTURE: "Departure", CENTER: "Center",
  ATIS: "ATIS", AWOS: "AWOS", CTAF: "CTAF", UNICOM: "UNICOM", GUARD: "Guard",
};

interface RuleTesterProps {
  /** Optional: rules already saved by the user (checked first). */
  savedRules?: { phrase: string; action: string }[];
  /** Optional: prefill the transmission box (e.g., last blocked attempt). */
  defaultTransmission?: string;
  /** Optional: when user clicks "Save rule", parent can persist it. */
  onSaveRule?: (rule: { phrase: string; action: string }) => void;
  className?: string;
}

export function RuleTester({
  savedRules = [],
  defaultTransmission = "",
  onSaveRule,
  className,
}: RuleTesterProps) {
  const [open, setOpen] = useState(false);
  const [transmission, setTransmission] = useState(defaultTransmission);
  const [draftPhrase, setDraftPhrase] = useState("");
  const [draftAction, setDraftAction] = useState(ACTION_OPTIONS[0]);

  const result = useMemo(() => {
    const said = transmission.trim().toLowerCase();
    if (!said) return null;

    // 1. Draft rule (highest priority preview)
    const draft = draftPhrase.trim().toLowerCase();
    if (draft && said.includes(draft)) {
      const facility = inferFacility(said, draftAction);
      return {
        source: "draft" as const,
        matchedPhrase: draft,
        action: draftAction,
        facility,
      };
    }

    // 2. Already-saved custom rules
    for (const r of savedRules) {
      const p = r.phrase.trim().toLowerCase();
      if (p && said.includes(p)) {
        return {
          source: "saved" as const,
          matchedPhrase: p,
          action: r.action,
          facility: inferFacility(said, r.action),
        };
      }
    }

    // 3. Built-in fallback
    const action = builtInAction(said);
    return {
      source: "builtin" as const,
      matchedPhrase: null,
      action,
      facility: inferFacility(said, action),
    };
  }, [transmission, draftPhrase, draftAction, savedRules]);

  const [touched, setTouched] = useState(false);

  const validation = useMemo(() => {
    const phrase = draftPhrase.trim();
    if (!phrase) return { ok: false, error: "Phrase can't be empty." };
    if (phrase.length < 2) return { ok: false, error: "Phrase must be at least 2 characters." };
    if (phrase.length > 60) return { ok: false, error: "Phrase must be 60 characters or fewer." };
    if (!ACTION_OPTIONS.includes(draftAction)) {
      return { ok: false, error: "Pick a valid action label." };
    }
    const dup = savedRules.find(
      (r) => r.phrase.trim().toLowerCase() === phrase.toLowerCase(),
    );
    if (dup) return { ok: false, error: `Phrase "${phrase}" is already saved.` };
    if (!transmission.trim()) {
      return { ok: false, error: "Type a transmission above to test the rule first." };
    }
    if (!transmission.toLowerCase().includes(phrase.toLowerCase())) {
      return { ok: false, error: "Phrase must appear in the transmission to verify the match." };
    }
    return { ok: true as const, error: null };
  }, [draftPhrase, draftAction, savedRules, transmission]);

  const sourceLabel =
    result?.source === "draft" ? "Draft rule"
      : result?.source === "saved" ? "Saved rule"
        : "Built-in";
  const sourceTone =
    result?.source === "draft" ? "text-primary border-primary/50 bg-primary/10"
      : result?.source === "saved" ? "text-emerald-500 border-emerald-500/50 bg-emerald-500/10"
        : "text-muted-foreground border-border bg-muted/30";

  return (
    <div className={cn("rounded-md border border-border bg-card/40", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
          <FlaskConical className="h-3.5 w-3.5" />
          Rule Tester
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-border/60 pt-2.5">
          <div className="space-y-1">
            <label className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              Transmission
            </label>
            <Input
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              placeholder='e.g. "Tower clearance for departure runway 27"'
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <label className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                Draft phrase
              </label>
              <Input
                value={draftPhrase}
                onChange={(e) => setDraftPhrase(e.target.value)}
                placeholder='e.g. "tower clearance"'
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                Maps to
              </label>
              <select
                value={draftAction}
                onChange={(e) => setDraftAction(e.target.value)}
                className="h-8 rounded-md border border-input bg-background text-xs px-2 min-w-[10rem]"
              >
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-1.5">
            <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              Preview
            </div>
            {!result ? (
              <div className="text-[11px] text-muted-foreground italic">
                Type a transmission to see what would be inferred.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn(
                  "font-display text-[9px] tracking-[0.2em] uppercase rounded px-1.5 py-0.5 border",
                  sourceTone,
                )}>
                  {sourceLabel}
                </span>
                {result.matchedPhrase && (
                  <span className="font-mono text-[10px] text-foreground bg-muted/50 rounded px-1.5 py-0.5">
                    "{result.matchedPhrase}"
                  </span>
                )}
                <span className="font-display text-[10px] tracking-[0.2em] uppercase text-amber-500 border border-amber-500/50 bg-amber-500/10 rounded px-1.5 py-0.5">
                  {KIND_NICE[result.facility]} {result.action}
                </span>
              </div>
            )}
          </div>

          {onSaveRule && (
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!draftPhrase.trim() || result?.source !== "draft"}
                onClick={() => {
                  const phrase = draftPhrase.trim();
                  if (!phrase) return;
                  onSaveRule({ phrase, action: draftAction });
                  setDraftPhrase("");
                }}
                className="h-7 text-[10px] tracking-[0.2em] uppercase font-display"
                title={
                  result?.source === "draft"
                    ? "Save this phrase → action mapping"
                    : "Draft phrase must match the transmission to save"
                }
              >
                Save rule
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RuleTester;
