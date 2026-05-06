import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, GraduationCap, User, Plane, ShieldCheck, RefreshCcw, CreditCard, Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PlanComparisonTable from "./PlanComparisonTable";
import PricingFAQ from "./PricingFAQ";
import ForSchoolsSection from "./ForSchoolsSection";

const plans = [
  {
    icon: Plane,
    name: "Student",
    monthly: 29,
    annual: 23,
    description: "Everything you need to pass your checkride",
    priceSuffix: "/mo",
    features: [
      "19 Ground One-on-One modules (FAA ACS)",
      "Oral Exam simulator",
      "ATC communication trainer",
      "Live Flight Tracker & Weather",
      "Performance tracking dashboard",
      "Session history (30 days)",
      "Community access",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    icon: User,
    name: "Pro Pilot",
    monthly: 59,
    annual: 47,
    description: "Advanced tools for serious pilots and CFIs",
    priceSuffix: "/mo",
    features: [
      "Everything in Student",
      "Unlimited AI coaching sessions",
      "POH upload & aircraft-specific coaching",
      "VFR/IFR chart image analysis",
      "Sim debrief (.FLT file upload)",
      "Instrument procedure drills",
      "Unlimited session history",
      "Priority AI response",
    ],
    cta: "Go Pro",
    highlighted: true,
    checkoutPlan: "pro" as const,
  },
  {
    icon: Crown,
    name: "Gold Seal CFI",
    monthly: 99,
    annual: 79,
    description: "The ultimate AI flight training experience",
    priceSuffix: "/mo",
    features: [
      "Everything in Pro Pilot",
      "Unlimited AI coaching sessions",
      "Custom training scenarios & curricula",
      "1-on-1 priority support (24/7)",
      "Advanced checkride readiness analytics",
      "Multi-aircraft POH library",
      "Early access to new features",
      "Personalized study plan generation",
    ],
    cta: "Go Gold Seal",
    highlighted: false,
    checkoutPlan: "ultra" as const,
  },
  {
    icon: GraduationCap,
    name: "Flight School",
    monthly: 39,
    annual: 31,
    description: "Train your entire program under one roof",
    priceSuffix: "/seat/mo",
    features: [
      "Everything in Pro Pilot",
      "10-seat minimum",
      "Instructor admin dashboard",
      "Batch student analytics",
      "Curriculum integration API",
      "Custom training scenarios",
      "Dedicated account manager",
      "White-label option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  // Visual QA mode — toggle with Alt+Shift+Q (or ?qa=1 in URL).
  // Renders z-index labels on each card, outlines the badge, and lets you
  // force-hover and reduced-motion to inspect layering interactions.
  const [qaMode, setQaMode] = useState(false);
  const [qaForceHover, setQaForceHover] = useState(false);
  const [qaReducedMotion, setQaReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("qa") === "1") {
      setQaMode(true);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "Q" || e.key === "q")) {
        e.preventDefault();
        setQaMode((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCtaClick = async (plan: typeof plans[number]) => {
    if (loadingPlan) return;

    if (plan.name === "Flight School") {
      navigate("/for-schools");
      return;
    }

    if (!plan.checkoutPlan) {
      navigate("/auth");
      return;
    }

    setLoadingPlan(plan.name);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.info("Please sign in to start your subscription.");
        navigate(`/auth?redirect=/dashboard&plan=${plan.checkoutPlan}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: plan.checkoutPlan },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("[PricingSection] checkout error", err);
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section
      id="pricing"
      data-qa-mode={qaMode || undefined}
      data-qa-force-hover={qaForceHover || undefined}
      data-qa-reduced-motion={qaReducedMotion || undefined}
      className={`py-24 relative bg-gradient-hero scroll-mt-20 ${
        qaReducedMotion ? "[&_*]:!transition-none [&_*]:!animate-none" : ""
      } ${qaForceHover ? "[&_[data-qa-card]]:!border-primary/40" : ""}`}
    >
      <div className="absolute top-0 left-0 right-0 hud-line" />
      {qaMode && (
        <div className="fixed top-4 right-4 z-[100] w-64 rounded-lg border border-primary/40 bg-background/95 backdrop-blur p-3 shadow-2xl text-xs font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display tracking-widest uppercase text-[10px] text-primary">
              QA Mode
            </span>
            <button
              type="button"
              onClick={() => setQaMode(false)}
              className="text-muted-foreground hover:text-foreground text-[10px]"
              aria-label="Close QA panel"
            >
              ✕
            </button>
          </div>
          <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={qaForceHover}
              onChange={(e) => setQaForceHover(e.target.checked)}
            />
            <span>Force hover state</span>
          </label>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={qaReducedMotion}
              onChange={(e) => setQaReducedMotion(e.target.checked)}
            />
            <span>Reduced motion</span>
          </label>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Alt+Shift+Q to toggle. Cards show z-index; badge has dashed outline.
          </p>
        </div>
      )}
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Pricing
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
            Choose Your <span className="text-primary text-glow-cyan">Flight Plan</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Transparent pricing for every level of aviator. Start free, upgrade when you're ready.
          </p>
          <p className="mt-3 font-display text-sm font-bold tracking-wide text-primary">
            ✦ 7-Day Free Trial · No Credit Card Required
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium transition-colors ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-7 rounded-full border border-border bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Toggle annual pricing"
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 rounded-full bg-primary shadow-md"
                animate={{ left: annual ? "calc(100% - 1.625rem)" : "0.125rem" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
            </span>
            <AnimatePresence>
              {annual && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-[10px] font-display font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25"
                >
                  Save 20%+
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto items-stretch pt-12 px-1 overflow-visible">
          {plans.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <motion.div
                key={plan.name}
                data-qa-card
                initial={qaReducedMotion ? false : { opacity: 0, y: 30 }}
                whileInView={qaReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: qaReducedMotion ? 0 : i * 0.12 }}
                className={`relative flex flex-col rounded-xl px-6 pt-10 pb-6 border transition-all duration-500 overflow-visible isolate ${
                  plan.highlighted
                    ? "border-primary/50 border-glow-cyan bg-gradient-card scale-[1.02] z-20"
                    : "border-border bg-gradient-card hover:border-primary/20 z-10"
                } ${qaMode ? "outline outline-1 outline-dashed outline-accent/60" : ""}`}
              >
                {qaMode && (
                  <span className="absolute top-1 right-1 z-40 px-1.5 py-0.5 rounded bg-accent text-accent-foreground text-[9px] font-mono pointer-events-none">
                    z:{plan.highlighted ? 20 : 10}
                  </span>
                )}
                {plan.highlighted && (
                  <div
                    className={`absolute left-1/2 z-30 pointer-events-none w-max max-w-[calc(100%-2rem)] flex justify-center ${
                      qaMode ? "outline outline-1 outline-dashed outline-primary" : ""
                    }`}
                    style={{ top: 0, transform: "translate(-50%, -100%) translateY(8px)" }}
                  >
                    {qaMode && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-mono whitespace-nowrap">
                        badge z:30
                      </span>
                    )}
                    <span className="block whitespace-nowrap font-display text-[9px] xs:text-[10px] leading-[1] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg ring-1 ring-background/40">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? "bg-primary/20" : "bg-accent/10"
                    }`}
                  >
                    <plan.icon
                      className={`w-5 h-5 ${plan.highlighted ? "text-primary" : "text-accent"}`}
                    />
                  </div>
                  <h3 className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-1 flex items-baseline gap-1">
                  <motion.span
                    key={price}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-4xl font-bold text-foreground"
                  >
                    ${price}
                  </motion.span>
                  <span className="text-muted-foreground text-sm">{plan.priceSuffix}</span>
                  {annual && (
                    <span className="text-muted-foreground text-xs line-through ml-1">
                      ${plan.monthly}
                    </span>
                  )}
                </div>
                <p className={`text-[11px] text-muted-foreground mb-1 min-h-[16px] ${annual ? "" : "invisible"}`}>
                  {annual ? (
                    <>
                      Billed ${price * 12}/year
                      {plan.name === "Flight School" && " per seat"}
                    </>
                  ) : (
                    "placeholder"
                  )}
                </p>
                <span className="inline-block text-[10px] font-display font-semibold tracking-widest uppercase px-3 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 mb-4 w-fit">
                  7-Day Free Trial
                </span>

                <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">{plan.description}</p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.highlighted ? "text-primary" : "text-accent"
                        }`}
                      />
                      <span className="text-secondary-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleCtaClick(plan)}
                  disabled={loadingPlan === plan.name}
                  aria-busy={loadingPlan === plan.name}
                  className={`inline-flex items-center justify-center gap-2 h-12 w-full px-6 rounded font-display text-xs font-semibold tracking-widest uppercase transition-all duration-300 disabled:opacity-80 disabled:cursor-not-allowed ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)]"
                      : "border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {loadingPlan === plan.name ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Opening checkout…</span>
                    </>
                  ) : (
                    <span>{plan.cta}</span>
                  )}
                </button>

                {/* Trust badges */}
                <div className="mt-4 flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                    <span>14-Day Money-Back Guarantee</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5 text-accent" />
                    <span>No Credit Card for Trial</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <RefreshCcw className="w-3.5 h-3.5 text-accent" />
                    <span>Cancel Anytime</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Value Comparison Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-16 mb-12 rounded-xl border border-primary/30 border-glow-cyan bg-gradient-card p-8"
        >
          <h3 className="font-display text-lg md:text-xl font-bold text-foreground text-center mb-6">
            How SimPilot.AI Compares to Traditional Training
          </h3>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="text-center p-6 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-2">
                Ground One-on-One + CFI Tutoring
              </p>
              <p className="font-display text-4xl md:text-5xl font-bold text-destructive">$2,500+</p>
              <p className="text-sm text-muted-foreground mt-2">
                Sporty's $299 + King Schools $349 + CFI tutoring hours
              </p>
            </div>
            <div className="text-center p-6 rounded-lg bg-primary/10 border border-primary/30">
              <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-2">
                SimPilot.AI Pro Pilot Plan
              </p>
              <p className="font-display text-4xl md:text-5xl font-bold text-primary text-glow-cyan">$59/mo</p>
              <p className="text-sm text-muted-foreground mt-2">
                Unlimited AI coaching · Oral Exam prep · Chart analysis · 24/7
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <span className="text-accent font-semibold">Traditional ground school alone costs $300–$600</span> — SimPilot.AI adds unlimited AI tutoring, exam prep, and sim debriefs for just $59/month.
          </p>
        </motion.div>

        <PlanComparisonTable />
        <ForSchoolsSection />
        <PricingFAQ />
      </div>
    </section>
  );
};

export default PricingSection;
