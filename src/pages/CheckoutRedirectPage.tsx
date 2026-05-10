import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Check, ShieldCheck, Lock, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, type StripePlan } from "@/hooks/useStripePlans";
import { toast } from "sonner";

interface CheckoutRedirectState {
  plan: StripePlan;
}

export default function CheckoutRedirectPage() {
  const location = useLocation();
  const state = location.state as CheckoutRedirectState | null;
  const plan = state?.plan;
  const [status, setStatus] = useState<"preparing" | "redirecting" | "error">("preparing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!plan || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { price_id: plan.price_id },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("No checkout URL returned");
        setStatus("redirecting");
        // Brief delay so the user sees the branded confirmation
        setTimeout(() => {
          window.location.href = data.url;
        }, 1200);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not start checkout.";
        setErrorMsg(msg);
        setStatus("error");
        toast.error(msg);
      }
    })();
  }, [plan]);

  if (!plan) {
    return <Navigate to="/dashboard" replace />;
  }

  const intervalLabel =
    plan.interval_count > 1 ? `/${plan.interval_count} ${plan.interval}s` : `/${plan.interval}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Logo height={44} />
        </div>

        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#04C3EC]/15 via-background to-background px-6 py-6 border-b border-border text-center">
            <div className="inline-flex items-center gap-2 text-xs font-display tracking-widest uppercase text-[#04C3EC]">
              <Lock className="h-3.5 w-3.5" /> Secure Checkout
            </div>
            <h1 className="mt-2 font-display text-xl md:text-2xl tracking-tight text-foreground">
              You're upgrading to {plan.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Continuing to Stripe — our trusted payment processor.
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-xl border border-border bg-background/40 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-[#04C3EC]" />
                <h2 className="font-display text-lg text-foreground">{plan.name}</h2>
                {plan.badge && (
                  <span className="ml-auto bg-[#04C3EC] text-background text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl text-foreground">
                  {formatPrice(plan.amount, plan.currency)}
                </span>
                <span className="text-sm text-muted-foreground">{intervalLabel}</span>
              </div>
              {(plan.tagline || plan.description) && (
                <p className="text-xs text-muted-foreground mb-4">
                  {plan.tagline ?? plan.description}
                </p>
              )}
              {plan.features.length > 0 && (
                <ul className="space-y-2">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              {status === "error" ? (
                <>
                  <p className="text-sm text-destructive text-center">
                    {errorMsg ?? "Could not start checkout."}
                  </p>
                  <Button
                    onClick={() => {
                      startedRef.current = false;
                      setStatus("preparing");
                      setErrorMsg(null);
                    }}
                    className="bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background"
                  >
                    Try again
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-[#04C3EC]" />
                    {status === "redirecting"
                      ? "Redirecting to Stripe…"
                      : "Preparing your secure checkout…"}
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 text-center max-w-xs">
                    If you aren't redirected automatically, please disable any pop-up blockers.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-card/20 px-6 py-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Payments secured by Stripe · 256-bit TLS · PCI-DSS compliant
          </div>
        </div>
      </div>
    </div>
  );
}
