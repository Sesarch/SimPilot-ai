import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles, Plane, Crown, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PricingFAQ from "./PricingFAQ";

import { SUPPORT_EMAIL } from "@/lib/supportEmail";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// Stripe price IDs — created via Stripe MCP on 2026-05-17.
const PRICE_IDS = {
  pilot_monthly: "price_1TXw2MRusIXFsWjcPRHlBeUe",   // $39/mo recurring
  pilot_annual: "price_1TXw3SRusIXFsWjcMTjhLNn0",    // $299/yr recurring
  checkride_lifetime: "price_1TXw5IRusIXFsWjcHvUOrDHH", // $399 one-time
} as const;

type PlanKey = keyof typeof PRICE_IDS;

const TARGET_RATINGS = [
  "Private Pilot",
  "Sport Pilot",
  "Recreational Pilot",
  "Instrument Rating",
  "Commercial Pilot",
  "CFI (Certificated Flight Instructor)",
  "CFII (Instrument Instructor)",
  "MEI (Multi-Engine Instructor)",
  "ATP (Airline Transport Pilot)",
] as const;

const CONVERSATION_TOOLTIP =
  "A conversation is one back-and-forth study session with the AI, typically 5-10 follow-up questions on the same topic. Conversations reset on the 1st of each calendar month.";

interface Tier {
  key: PlanKey;
  name: string;
  icon: typeof Plane;
  headlinePrice: string;
  priceSuffix: string;
  subPrice?: string;
  badge?: string;
  saveLine?: string;
  billing: string;
  trial: string;
  conversationCap: string;
  conversationFootnote?: string;
  supportSla: string;
  guarantee: boolean;
  cta: string;
  highlighted: boolean;
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
    trial: "Direct purchase — no trial",
    conversationCap: "1,500 AI conversations / month",
    conversationFootnote: "during your active access window",
    supportSla: "Email support — 24 hr response",
    guarantee: true,
    cta: "Get Lifetime Access",
    highlighted: false,
    checkoutMode: "payment",
  },
];

const SHARED_FEATURES: string[] = [
  "Multi-brain AI tutor (Claude + GPT-4o + Gemini routing)",
  "DPE oral exam simulator with scoring and debrief",
  "Live weather briefings (METAR / TAF integration)",
  "Live flight tracking (OpenSky)",
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
  const [lifetimeOpen, setLifetimeOpen] = useState(false);
  const [targetRating, setTargetRating] = useState<string>("");
  const [ackChecked, setAckChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  const startCheckout = async (tier: Tier) => {
    setLoadingKey(tier.key);
    try {
      const fnName =
        tier.checkoutMode === "payment" ? "create-checkout-onetime" : "create-checkout";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { plan: tier.key, price_id: PRICE_IDS[tier.key] },
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

  const handleCta = async (tier: Tier) => {
    if (loadingKey) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.info("Please sign in to continue to checkout.");
      navigate(`/auth?redirect=/pricing&plan=${tier.key}`);
      return;
    }

    // Lifetime requires target-rating capture before Stripe.
    if (tier.key === "checkride_lifetime") {
      setTargetRating("");
      setAckChecked(false);
      setLifetimeOpen(true);
      return;
    }

    await startCheckout(tier);
  };

  const handleLifetimeConfirm = async () => {
    if (!targetRating || !ackChecked) return;
    const tier = TIERS.find((t) => t.key === "checkride_lifetime")!;
    setLoadingKey(tier.key);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (uid) {
        const { error: upErr } = await supabase
          .from("profiles")
          .update({
            target_rating: targetRating,
            target_rating_selected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", uid);
        if (upErr) console.error("[PricingSection] target_rating save failed", upErr);
      }
      setLifetimeOpen(false);
      await startCheckout(tier);
    } catch (err) {
      console.error("[PricingSection] lifetime confirm error", err);
      setLoadingKey(null);
      toast.error("Could not save your target rating. Please try again.");
    }
  };

  return (
    <section id="pricing" className="py-24 relative bg-gradient-hero scroll-mt-20">
      <div className="absolute top-0 left-0 right-0 hud-line" />
      <div className="container mx-auto px-4 sm:px-6">
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
                    style={{ top: 0, transform: "translate(-50%, -100%) translateY(8px)" }}
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

                <div className="space-y-1.5 mb-5 text-xs">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary-foreground">{tier.trial}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-secondary-foreground">{tier.conversationCap}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="What is a conversation?"
                              className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                            >
                              <HelpCircle className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {CONVERSATION_TOOLTIP}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {tier.conversationFootnote && (
                        <p className="text-[10px] italic text-muted-foreground/80 mt-0.5">
                          {tier.conversationFootnote}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary-foreground">{tier.supportSla}</span>
                  </div>
                  {tier.guarantee && (
                    <div className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-secondary-foreground">
                        Pass-the-checkride guarantee
                      </span>
                    </div>
                  )}
                </div>

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

      {/* Target Rating capture — Checkride Lifetime only */}
      <Dialog open={lifetimeOpen} onOpenChange={setLifetimeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">
              Which FAA certificate or rating are you pursuing?
            </DialogTitle>
            <DialogDescription>
              Your Checkride Lifetime access is bounded to one specific target rating.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-display tracking-wider uppercase text-muted-foreground">
                Target rating
              </label>
              <Select value={targetRating} onValueChange={setTargetRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rating…" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-start gap-2 text-xs text-foreground/90 cursor-pointer">
              <Checkbox
                checked={ackChecked}
                onCheckedChange={(v) => setAckChecked(v === true)}
                className="mt-0.5"
              />
              <span>
                I understand that my Checkride Lifetime access continues until I pass my
                selected rating + 90 days, with a maximum of 24 months from purchase. This
                is not perpetual access.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setLifetimeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLifetimeConfirm}
              disabled={!targetRating || !ackChecked || loadingKey === "checkride_lifetime"}
              className="font-display tracking-widest uppercase text-xs"
            >
              {loadingKey === "checkride_lifetime" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  Opening…
                </>
              ) : (
                "Continue to Checkout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingSection;
