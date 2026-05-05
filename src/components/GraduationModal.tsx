import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plane, Check, ShieldAlert, Loader2, Clock, ArrowRight } from "lucide-react";
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

export default function GraduationModal({ open, displayName }: GraduationModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "ultra" | null>(null);
  const [showPlans, setShowPlans] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-border bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {!showPlans ? (
          // STEP 1 — Expired notice
          <div className="px-6 py-12 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full" />
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                  <Clock className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Sorry{displayName ? `, ${displayName}` : ""}!
            </h2>
            <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-lg mx-auto">
              Your 7-day trial period has expired.
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg mx-auto">
              Choose a plan below to keep flying with your CFI-AI.
            </p>
            <Button
              onClick={() => setShowPlans(true)}
              size="lg"
              className="mt-8 bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background font-bold tracking-wider uppercase text-sm px-8"
            >
              Click Here To Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          // STEP 2 — Paid plan selection only
          <>
            <div className="relative bg-gradient-to-br from-[#04C3EC]/15 via-background to-background px-6 pt-8 pb-6 border-b border-border">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#04C3EC]/30 blur-2xl rounded-full" />
                  <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-[#04C3EC] to-[#0284c7] flex items-center justify-center shadow-lg">
                    <GraduationCap className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
              <h2 className="text-center font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Select a Plan to Continue
              </h2>
              <p className="text-center mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
                Pick the plan that fits your training and unlock SimPilot again.
              </p>
            </div>

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

            <div className="mx-6 mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                <span className="font-semibold text-amber-300">Keep flying safe.</span>{" "}
                Remember, under <span className="font-mono">§91.3</span>, you are always the final authority in the cockpit.
                SimPilot is a study aid — not FAA-approved instruction. AI may produce errors; always verify against
                authoritative sources and your CFI.
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
