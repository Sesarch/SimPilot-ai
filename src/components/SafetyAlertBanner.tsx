import { ShieldAlert, ExternalLink } from "lucide-react";
import { useUserSafetyFlags } from "@/hooks/useAIOrchestrator";

/**
 * Real-time banner that surfaces the most recent Severity 1 contradiction
 * detected by the Shadow Audit (OpenAI o1) on this user's AI responses.
 */
export const SafetyAlertBanner = () => {
  const flags = useUserSafetyFlags();
  if (!flags.length) return null;
  const f = flags[0];
  // Only show flags from the last 5 minutes
  if (Date.now() - new Date(f.created_at).getTime() > 5 * 60 * 1000) return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 backdrop-blur-sm p-4 my-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm text-destructive">
              Safety Alert: Information flagged for POH verification
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
              {f.category.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-foreground/90 mt-1 leading-relaxed">{f.contradiction}</p>
          {f.poh_reference && (
            <a
              href="#"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <ExternalLink className="w-3 h-3" />
              Reference: {f.poh_reference}
            </a>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Audited by {f.auditor_model} · Always verify against your POH and consult a CFI.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafetyAlertBanner;
