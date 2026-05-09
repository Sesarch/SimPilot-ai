import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Check, ShieldAlert, Loader2, Clock, ArrowRight, Building2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStripePlans, formatPrice, type StripePlan } from "@/hooks/useStripePlans";
import PlanDetailsDrawer from "@/components/PlanDetailsDrawer";
import type { TrialActivity } from "@/hooks/useTrialStatus";

interface GraduationModalProps {
  open: boolean;
  displayName?: string | null;
  activity: TrialActivity;
}

export default function GraduationModal({ open, displayName }: GraduationModalProps) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [detailsPlan, setDetailsPlan] = useState<StripePlan | null>(null);
  const [billing, setBilling] = useState<"month" | "year">("month");
  const { plans, loading: plansLoading } = useStripePlans();

  const hasYearly = plans.some((p) => p.interval === "year");
  const hasMonthly = plans.some((p) => p.interval === "month");
  const filteredPlans = plans.filter((p) => p.interval === billing);

  const handleSubscribe = async (plan: StripePlan) => {
    setLoadingPriceId(plan.price_id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: plan.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else throw new Error("No checkout URL returned");
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className="max-w-6xl max-h-[92vh] overflow-y-auto p-0 border-border bg-background"
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
            <h2 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
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
              className="mt-8 bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background tracking-wider uppercase text-sm px-8"
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
              <h2 className="text-center font-display text-xl md:text-2xl tracking-tight text-foreground">
                Choose Your Plan
              </h2>
              <p className="text-center mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
                Live pricing synced from Stripe. Pick the plan that fits your training.
              </p>
            </div>

            {plansLoading ? (
              <div className="px-6 py-16 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading live plans…
              </div>
            ) : plans.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No active plans found. Please contact support.
              </div>
            ) : (
              <div
                className="px-6 pt-8 pb-4 grid gap-4"
                style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}
              >
                {plans.map((plan) => {
                  const isLoading = loadingPriceId === plan.price_id;
                  const intervalLabel = plan.interval_count > 1
                    ? `/${plan.interval_count} ${plan.interval}s`
                    : `/${plan.interval}`;
                  return (
                    <div
                      key={plan.price_id}
                      className={`relative rounded-xl ${plan.highlighted ? "border-2 border-[#04C3EC]" : "border border-border"} bg-card/40 p-5 flex flex-col`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#04C3EC] text-background text-[10px] tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap">
                          {plan.badge}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className={`h-5 w-5 ${plan.highlighted ? "text-[#04C3EC]" : "text-muted-foreground"}`} />
                        <h3 className="font-display text-lg ">{plan.name}</h3>
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl text-foreground">{formatPrice(plan.amount, plan.currency)}</span>
                        <span className="text-sm text-muted-foreground">{intervalLabel}</span>
                      </div>
                      {(plan.tagline || plan.description) && (
                        <p className="text-xs text-muted-foreground mb-4">{plan.tagline ?? plan.description}</p>
                      )}
                      {plan.features.length > 0 && (
                        <ul className="space-y-2 mb-5 flex-1">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <Check className={`h-4 w-4 ${plan.highlighted ? "text-[#04C3EC]" : "text-emerald-400"} mt-0.5 shrink-0`} />
                              <span className="text-foreground/90">{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-auto space-y-2">
                        <Button
                          onClick={() => handleSubscribe(plan)}
                          disabled={loadingPriceId !== null}
                          variant={plan.highlighted ? "default" : "outline"}
                          className={plan.highlighted
                            ? "w-full bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background "
                            : "w-full "}
                        >
                          {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening checkout…</>
                          ) : (
                            `Choose ${plan.name}`
                          )}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDetailsPlan(plan)}
                          className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mx-6 mb-4 rounded-lg border border-border bg-card/30 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-[#04C3EC] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">Flight School / Team plan</p>
                  <p className="text-xs text-muted-foreground">Train your entire program with bulk seat management.</p>
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
                <span className="text-amber-300">Keep flying safe.</span>{" "}
                Remember, under <span className="font-mono">§91.3</span>, you are always the final authority in the cockpit.
                SimPilot is a study aid — not FAA-approved instruction. AI may produce errors; always verify against
                authoritative sources and your CFI.
              </div>
            </div>
          </>
        )}
      </DialogContent>
      <PlanDetailsDrawer
        plan={detailsPlan}
        open={detailsPlan !== null}
        onOpenChange={(o) => { if (!o) setDetailsPlan(null); }}
        onSubscribe={(p) => { setDetailsPlan(null); handleSubscribe(p); }}
        loading={loadingPriceId !== null}
      />
    </Dialog>
  );
}
