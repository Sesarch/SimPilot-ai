import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plane, BookOpen, Radio, ClipboardCheck, NotebookPen, Check, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TrialActivity } from "@/hooks/useTrialStatus";

interface GraduationModalProps {
  open: boolean;
  displayName?: string | null;
  activity: TrialActivity;
}

const PRO_FEATURES = [
  "Unlimited AI coaching",
  "POH upload & aircraft-specific answers",
  "VFR/IFR chart image analysis",
  "Sim debrief (.FLT files)",
  "Instrument procedure drills",
  "Unlimited session history",
];

const ULTRA_FEATURES = [
  "Everything in Pro",
  "Custom training scenarios & curricula",
  "24/7 priority 1-on-1 support",
  "Advanced checkride readiness analytics",
  "Multi-aircraft POH library",
  "Personalized study plan generation",
];

export default function GraduationModal({ open, displayName, activity }: GraduationModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "ultra" | null>(null);

  const handleSubscribe = async (plan: "pro" | "ultra") => {
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const stats = [
    { icon: BookOpen, label: "Ground School modules", value: activity.groundSchoolModules },
    { icon: Radio, label: "Simulated ATC flights", value: activity.atcSessions },
    { icon: ClipboardCheck, label: "Oral exam attempts", value: activity.examAttempts },
    { icon: NotebookPen, label: "Logbook entries", value: activity.flightLogs },
  ];

  // Build a friendly summary sentence from non-zero stats
  const summaryParts: string[] = [];
  if (activity.groundSchoolModules > 0)
    summaryParts.push(`completed ${activity.groundSchoolModules} Ground School module${activity.groundSchoolModules === 1 ? "" : "s"}`);
  if (activity.atcSessions > 0)
    summaryParts.push(`flew ${activity.atcSessions} simulated ATC flight${activity.atcSessions === 1 ? "" : "s"}`);
  if (activity.examAttempts > 0)
    summaryParts.push(`attempted ${activity.examAttempts} oral exam${activity.examAttempts === 1 ? "" : "s"}`);
  if (activity.flightLogs > 0)
    summaryParts.push(`logged ${activity.flightLogs} flight${activity.flightLogs === 1 ? "" : "s"}`);

  const summarySentence =
    summaryParts.length === 0
      ? "Your 7-day trial is complete."
      : `You ${summaryParts.slice(0, -1).join(", ")}${summaryParts.length > 1 ? " and " : ""}${summaryParts[summaryParts.length - 1]}!`;

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-border bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#04C3EC]/15 via-background to-background px-6 pt-8 pb-6 border-b border-border">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#04C3EC]/30 blur-2xl rounded-full" />
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-[#04C3EC] to-[#0284c7] flex items-center justify-center shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-center font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            🎓 SimPilot Graduation
          </h2>
          <p className="text-center mt-2 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            {displayName ? `Congratulations, ${displayName}. ` : "Congratulations. "}
            {summarySentence} Choose a plan to keep flying with your CFI-AI.
          </p>
        </div>

        {/* Activity stats */}
        <div className="px-6 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card/40 px-3 py-3 text-center"
              >
                <Icon className="h-4 w-4 mx-auto text-[#04C3EC] mb-1.5" />
                <div className="font-display text-2xl font-bold text-foreground leading-none">
                  {value}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5 leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-6 pt-6 pb-4 grid md:grid-cols-2 gap-4">
          {/* Pro */}
          <div className="relative rounded-xl border-2 border-[#04C3EC] bg-card/40 p-5 flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#04C3EC] text-background text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Plane className="h-5 w-5 text-[#04C3EC]" />
              <h3 className="font-display text-lg font-bold">SimPilot Pro</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-foreground">$59</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">For active student & private pilots</p>
            <ul className="space-y-2 mb-5 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-[#04C3EC] mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe("pro")}
              disabled={loadingPlan !== null}
              className="w-full bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background font-semibold"
            >
              {loadingPlan === "pro" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening checkout…</>
              ) : (
                "Choose Pro"
              )}
            </Button>
          </div>

          {/* Ultra */}
          <div className="relative rounded-xl border border-border bg-gradient-to-b from-amber-500/5 to-card/40 p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-5 w-5 text-amber-400" />
              <h3 className="font-display text-lg font-bold">SimPilot Ultra</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-foreground">$99</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">For CFIs & checkride-ready pilots</p>
            <ul className="space-y-2 mb-5 flex-1">
              {ULTRA_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe("ultra")}
              disabled={loadingPlan !== null}
              variant="outline"
              className="w-full border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 font-semibold"
            >
              {loadingPlan === "ultra" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening checkout…</>
              ) : (
                "Choose Ultra"
              )}
            </Button>
          </div>
        </div>

        {/* Safety note */}
        <div className="mx-6 mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
            <span className="font-semibold text-amber-300">Keep flying safe.</span>{" "}
            Remember, under <span className="font-mono">§91.3</span>, you are always the final authority in the cockpit.
            SimPilot is a study aid — not FAA-approved instruction. AI may produce errors; always verify against
            authoritative sources and your CFI.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
