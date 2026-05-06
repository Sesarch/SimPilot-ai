import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plane, User, Check, ShieldAlert, Loader2, Clock, ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TrialActivity } from "@/hooks/useTrialStatus";

interface GraduationModalProps {
  open: boolean;
  displayName?: string | null;
  activity: TrialActivity;
}

type PlanKey = "student" | "pro" | "ultra";

interface PlanCard {
  key: PlanKey;
  name: string;
  price: number;
  tagline: string;
  icon: typeof Plane;
  accent: string; // tailwind color classes for icon + check
  border: string;
  badge?: string;
  features: string[];
  buttonClass: string;
  variant?: "default" | "outline";
}

const PLANS: PlanCard[] = [
  {
    key: "student",
    name: "Student",
    price: 29,
    tagline: "Everything to pass your checkride",
    icon: Plane,
    accent: "text-emerald-400",
    border: "border-border",
    features: [
      "19 Ground School modules (FAA ACS)",
      "Oral Exam simulator",
      "ATC communication trainer",
      "Live Flight Tracker & Weather",
      "Performance dashboard",
      "Session history (30 days)",
    ],
    buttonClass: "w-full border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 font-semibold",
    variant: "outline",
  },
  {
    key: "pro",
    name: "Pro Pilot",
    price: 59,
    tagline: "For active student & private pilots",
    icon: User,
    accent: "text-[#04C3EC]",
    border: "border-2 border-[#04C3EC]",
    badge: "Most Popular",
    features: [
      "Everything in Student",
      "Unlimited AI coaching",
      "POH upload & aircraft-specific answers",
      "VFR/IFR chart image analysis",
      "Sim debrief (.FLT files)",
      "Unlimited session history",
    ],
    buttonClass: "w-full bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background font-semibold",
  },
  {
    key: "ultra",
    name: "Gold Seal CFI",
    price: 99,
    tagline: "For CFIs & checkride-ready pilots",
    icon: GraduationCap,
    accent: "text-amber-400",
    border: "border-border",
    features: [
      "Everything in Pro",
      "Custom training scenarios & curricula",
      "24/7 priority 1-on-1 support",
      "Advanced checkride readiness analytics",
      "Multi-aircraft POH library",
      "Personalized study plan generation",
    ],
    buttonClass: "w-full border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 font-semibold",
    variant: "outline",
  },
];

export default function GraduationModal({ open, displayName }: GraduationModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async (plan: PlanKey) => {
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
        className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 border-border bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {!showPlans ? (
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
              See All Plans <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
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
                Choose Your Plan
              </h2>
              <p className="text-center mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
                Pick the plan that fits your training and unlock SimPilot again.
              </p>
            </div>

            <div className="px-6 pt-8 pb-4 grid md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-xl ${plan.border} bg-card/40 p-5 flex flex-col`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#04C3EC] text-background text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap">
                        {plan.badge}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-5 w-5 ${plan.accent}`} />
                      <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className={`h-4 w-4 ${plan.accent} mt-0.5 shrink-0`} />
                          <span className="text-foreground/90">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={loadingPlan !== null}
                      variant={plan.variant}
                      className={plan.buttonClass}
                    >
                      {loadingPlan === plan.key ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening checkout…</>
                      ) : (
                        `Choose ${plan.name}`
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Flight School option */}
            <div className="mx-6 mb-4 rounded-lg border border-border bg-card/30 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-[#04C3EC] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Flight School / Team plan</p>
                  <p className="text-xs text-muted-foreground">Train your entire program from $39/seat/mo with bulk seat management.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = "/for-schools"; }}
                className="shrink-0"
              >
                View School Plans <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
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
