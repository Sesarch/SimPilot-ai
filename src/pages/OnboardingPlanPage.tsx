import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, GraduationCap, Loader2, Plane, Star, Crown, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import SEOHead from "@/components/SEOHead";

type PlanKey = "student" | "pro" | "ultra" | "flight_school";

interface PlanCard {
  key: PlanKey;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  highlight?: boolean;
}

const PLANS: PlanCard[] = [
  {
    key: "student",
    name: "Student",
    price: "$29/mo",
    tagline: "For pilots just getting started",
    features: ["Ground school AI tutor", "PPL prep", "Daily quizzes"],
    icon: Plane,
  },
  {
    key: "pro",
    name: "Pro Pilot",
    price: "$59/mo",
    tagline: "For active student & private pilots",
    features: ["Everything in Student", "Oral exam prep", "Weather briefings", "Sim debriefs"],
    icon: Star,
    badge: "Most popular",
    highlight: true,
  },
  {
    key: "ultra",
    name: "Gold Seal CFI",
    price: "$99/mo",
    tagline: "For instructors and pro pilots",
    features: ["Everything in Pro", "CFI mode", "Unlimited chats", "Priority support"],
    icon: Crown,
  },
  {
    key: "flight_school",
    name: "Flight School",
    price: "Custom",
    tagline: "Team plans for academies",
    features: ["Seat licensing", "Student progress dashboard", "Custom onboarding"],
    icon: GraduationCap,
  },
];

const OnboardingPlanPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState<PlanKey | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true, state: { redirectTo: "/onboarding/plan" } });
    }
  }, [authLoading, user, navigate]);

  const handleSelect = async (plan: PlanCard) => {
    if (!user || submitting) return;
    setSubmitting(plan.key);
    try {
      await supabase
        .from("profiles")
        .update({ selected_plan: plan.key, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (plan.key === "flight_school") {
        toast.success("Let's get your school set up.");
        navigate("/intake", { replace: true });
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: plan.key },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start checkout.";
      toast.error(msg);
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Choose Your Plan — SimPilot.AI"
        description="Pick the SimPilot plan that fits your training goals."
        canonical="/onboarding/plan"
      />
      <header className="pt-10 pb-6 flex justify-center">
        <Logo height={40} />
      </header>
      <main className="flex-1 px-4 pb-16">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <p className="font-display text-xs tracking-[0.3em] uppercase text-primary mb-3">
              Step 1 of 1
            </p>
            <h1 className="font-display text-3xl md:text-4xl text-foreground">
              Choose your <span className="text-primary text-glow-cyan">flight plan</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              You can change or cancel anytime. We'll confirm your plan with Stripe before unlocking it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isLoading = submitting === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  disabled={!!submitting}
                  onClick={() => handleSelect(plan)}
                  className={`group text-left p-6 rounded-xl border bg-card/40 backdrop-blur-sm transition-all relative ${
                    plan.highlight
                      ? "border-primary/60 shadow-[0_0_30px_hsl(var(--cyan-glow)/0.15)]"
                      : "border-border hover:border-primary/40"
                  } ${submitting && !isLoading ? "opacity-50" : ""} disabled:cursor-not-allowed`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-background text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <Icon size={24} className="text-primary mb-3" />
                  <div className="font-display text-lg text-foreground">{plan.name}</div>
                  <div className="text-2xl text-foreground mt-2">{plan.price}</div>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">{plan.tagline}</p>
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                        <Check size={14} className="text-emerald-400 mt-1 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full font-display tracking-widest uppercase text-xs"
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={!!submitting}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        {plan.key === "flight_school" ? "Loading…" : "Redirecting…"}
                      </>
                    ) : plan.key === "flight_school" ? (
                      "Contact sales"
                    ) : (
                      "Choose plan"
                    )}
                  </Button>
                </button>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="text-xs text-muted-foreground hover:text-foreground tracking-widest uppercase"
            >
              Skip for now — continue on free trial
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPlanPage;
