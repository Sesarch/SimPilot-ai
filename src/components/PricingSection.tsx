import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles, Plane, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PricingFAQ from "./PricingFAQ";
import DraftReviewBanner from "./DraftReviewBanner";
import { SUPPORT_EMAIL } from "@/lib/supportEmail";

// Stripe price IDs — created via Stripe MCP on 2026-05-17.
// Hardcoded here (not env-driven) so the UI is deterministic and easy to audit.
const PRICE_IDS = {
  pilot_monthly: "price_1TXw2MRusIXFsWjcPRHlBeUe",   // $39/mo
  pilot_annual: "price_1TXw3SRusIXFsWjcMTjhLNn0",    // $299/yr
  checkride_lifetime: "price_1TXw5IRusIXFsWjcHvUOrDHH", // $399 one-time
} as const;

type PlanKey = keyof typeof PRICE_IDS;

interface Tier {
  key: PlanKey;
  name: string;
  icon: typeof Plane;
  headlinePrice: string;
  priceSuffix: string;
  subPrice?: string;        // small text under price (e.g. "$24.92/mo equivalent")
  badge?: string;           // e.g. "MOST POPULAR"
  saveLine?: string;        // e.g. "Save $169/yr vs Monthly"
  billing: string;
  trial: string;
  conversationCap: string;
  supportSla: string;
  guarantee: boolean;
  cta: string;
  highlighted: boolean;
  /**
   * Stripe checkout mode. "subscription" = recurring, "payment" = one-time.
   * Checkride Lifetime is the only one-off plan.
   */
  checkoutMode: "subscription" | "payment";
}

const TIERS: Tier[] = [
  {
    key: "pilot_monthly",
    name: "Pilot Monthly",
    icon: Plane,
    headlinePrice: "$39",
    priceSuffix: "/month",
    billing: "Monthly, cancel anytime",
    trial: "7-day free trial",
    conversationCap: "500 AI conversations / month",
    supportSla: "Email support — 48 hr response",
    guarantee: false,
    cta: "Start free trial",
    highlighted: false,
    checkoutMode: "subscription",
  },
  {
    key: "pilot_annual",
    name: "Pilot Annual",
    icon: Sparkles,
    headlinePrice: "$299",
    priceSuffix: "/year",
    subPrice: "≈ $24.92 / month equivalent",
    badge: "MOST POPULAR",
    saveLine: "Save $169 / yr vs Monthly",
    billing: "Annual, auto-renews",
    trial: "7-day free trial",
    conversationCap: "1,000 AI conversations / month",
    supportSla: "Email support — 24 hr response",
    guarantee: true,
    cta: "Start free trial",
    highlighted: true,
    checkoutMode: "subscription",
  },
  {
    key: "checkride_lifetime",
    name: "Checkride Lifetime",
    icon: Crown,
    headlinePrice: "$399",
    priceSuffix: "one-time",
    subPrice: "No recurring charge",
    billing: "Until you pass target rating + 90 days (max 24 months)",
    trial: "No trial — one-time purchase",
    conversationCap: "1,500 AI conversations / month",
    supportSla: "Email support — 24 hr response",
    guarantee: true,
    cta: "Buy Lifetime",
    highlighted: false,
    checkoutMode: "payment",
  },
];

const SHARED_FEATURES: string[] = [
  "Multi-brain AI tutor (Claude + GPT-4o + Gemini routing)",
  "DPE oral exam simulator with scoring and debrief",
  "Live weather briefings (METAR / TAF integration)",
  "Live flight tracking (OpenSky / FlightAware)",
  "POH-grounded answers (upload your aircraft's POH)",
  "Vision-based chart & sectional analysis",
  "MSFS / X-Plane desktop bridge integration",
  "FAR/AIM & ACS citation on every answer",
  "Independent AI safety review on safety-critical answers",
  "Session history & progress tracking",
  "PWA mobile support",
];

const PricingSection = () => {
  const [loadingKey, setLoadingKey] = useState<PlanKey | null>(null);
  const navigate = useNavigate();

  // Confirm signed-in state once on mount; not blocking.
  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  const handleCta = async (tier: Tier) => {
    if (loadingKey) return;
    setLoadingKey(tier.key);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.info("Please sign in to continue to checkout.");
        navigate(`/auth?redirect=/pricing&plan=${tier.key}`);
        return;
      }

      const fnName =
        tier.checkoutMode === "payment" ? "create-checkout-onetime" : "create-checkout";

      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          plan: tier.key,
          price_id: PRICE_IDS[tier.key],
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("[PricingSection] checkout error", err);
      const message =
        err instanceof Error && err.message ? err.message : "Could not start checkout.";
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        `Checkout error — ${tier.name}`
      )}&body=${encodeURIComponent(
        `Error: ${message}\nPlan: ${tier.name}\nPrice ID: ${PRICE_IDS[tier.key]}`
      )}`;
      toast.error(`Couldn't open ${tier.name} checkout`, {
        description: `${message} Please try again.`,
        action: {
          label: "Contact support",
          onClick: () => window.open(mailto, "_blank", "noopener,noreferrer"),
        },
        duration: 8000,
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <section id="pricing" className="py-24 relative bg-gradient-hero scroll-mt-20">
      <div className="absolute top-0 left-0 right-0 hud-line" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Pricing
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Choose your <span className="text-primary text-glow-cyan">flight plan</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Three plans. Same full feature set. Pick the billing rhythm that matches your training.
          </p>
        </motion.div>

        {/* 3-column on desktop, stacked on mobile */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch pt-10 overflow-visible">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const isLoading = loadingKey === tier.key;
            return (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col rounded-xl px-6 pt-10 pb-6 border bg-gradient-card transition-all duration-500 overflow-visible isolate ${
                  tier.highlighted
                    ? "border-primary/60 border-glow-cyan scale-[1.02] z-20"
                    : "border-border hover:border-primary/20 z-10"
                }`}
              >
                {tier.badge && (
                  <div
                    className="absolute left-1/2 z-30 pointer-events-none w-max"
                    style={{
                      top: 0,
                      transform: "translate(-50%, -100%) translateY(8px)",
                    }}
                  >
                    <span className="block whitespace-nowrap font-display text-[10px] leading-[1] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-background/40">
                      ✦ {tier.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tier.highlighted ? "bg-primary/20" : "bg-accent/10"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${tier.highlighted ? "text-primary" : "text-accent"}`}
                    />
                  </div>
                  <h3 className="font-display text-sm tracking-wider uppercase text-foreground">
                    {tier.name}
                  </h3>
                </div>

                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-foreground">
                    {tier.headlinePrice}
                  </span>
                  <span className="text-muted-foreground text-sm">{tier.priceSuffix}</span>
                </div>
                {tier.subPrice && (
                  <p className="text-[11px] text-muted-foreground mb-1">{tier.subPrice}</p>
                )}
                {tier.saveLine && (
                  <p className="text-[11px] font-display tracking-wide text-emerald-400 mb-1">
                    {tier.saveLine}
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground/80 mt-1 mb-4">{tier.billing}</p>

                {/* Plan-specific summary chips */}
                <div className="space-y-1.5 mb-5 text-xs">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary-foreground">{tier.trial}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary-foreground">{tier.conversationCap}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary-foreground">{tier.supportSla}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    {tier.guarantee ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-secondary-foreground">
                          Pass-the-checkride guarantee
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/40">
                          —
                        </span>
                        <span className="text-muted-foreground/60 line-through">
                          Pass-the-checkride guarantee
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Shared full feature list */}
                <div className="border-t border-border/50 pt-4 mb-6 flex-1">
                  <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground mb-3">
                    Everything included
                  </p>
                  <ul className="space-y-2">
                    {SHARED_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            tier.highlighted ? "text-primary" : "text-accent"
                          }`}
                        />
                        <span className="text-secondary-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleCta(tier)}
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className={`inline-flex items-center justify-center gap-2 h-12 w-full px-6 rounded font-display text-xs tracking-widest uppercase transition-all duration-300 disabled:cursor-not-allowed ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)] disabled:opacity-80"
                      : "border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary disabled:opacity-80"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening checkout…</span>
                    </>
                  ) : (
                    <span>{tier.cta}</span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Flight school link */}
        <p className="text-center text-sm text-muted-foreground mt-12">
          Flight school or training organization?{" "}
          <a
            href="mailto:sales@simpilot.ai"
            className="text-primary hover:underline font-display tracking-wide"
          >
            Contact sales →
          </a>
        </p>
      </div>

      <PricingFAQ />
    </section>
  );
};

export default PricingSection;
