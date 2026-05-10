import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, X, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

type Variant = "success" | "cancelled";

interface Props {
  /**
   * Force a variant. If omitted the banner reads `subscribed=1` /
   * `checkout=cancelled` from the URL and shows itself accordingly.
   */
  variant?: Variant;
  /** Optional override for the headline. */
  title?: string;
  /** Optional override for the supporting copy. */
  description?: string;
  /** When true, the URL search params are cleared after mount. Defaults to true. */
  stripParamsOnShow?: boolean;
}

/**
 * Branded post-checkout banner shown on Stripe success / cancel landings.
 * Always leads with the SimPilot wordmark so users see the brand immediately
 * after returning from Stripe Checkout, before the rest of the page renders.
 */
const PostCheckoutBrandBanner = ({
  variant: forced,
  title,
  description,
  stripParamsOnShow = true,
}: Props) => {
  const [params, setParams] = useSearchParams();
  const detected: Variant | null = forced
    ? forced
    : params.get("subscribed") === "1"
      ? "success"
      : params.get("checkout") === "cancelled"
        ? "cancelled"
        : null;

  // Recover the plan from the URL so refreshing or sharing the redirect link
  // still surfaces the right context. Falls back to a generic label.
  const planSlug = (params.get("plan") || "").toLowerCase();
  const planLabel =
    planSlug === "student"
      ? "Student"
      : planSlug === "pro"
        ? "Pro"
        : planSlug === "ultra"
          ? "Ultra"
          : null;

  const [open, setOpen] = useState<boolean>(detected !== null);

  useEffect(() => {
    if (!detected || forced || !stripParamsOnShow) return;
    // Clear only the transient checkout flags. Leave `plan`, `price`, and
    // `session_id` in the URL so a refresh / shared link still recovers the
    // selected plan context.
    const next = new URLSearchParams(params);
    next.delete("subscribed");
    next.delete("checkout");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!detected || !open) return null;

  const isSuccess = detected === "success";
  const planSuffix = planLabel ? ` ${planLabel}` : "";
  const headline =
    title ?? (isSuccess ? "Welcome aboard, pilot." : "Checkout cancelled.");
  const body =
    description ??
    (isSuccess
      ? `Your SimPilot.AI${planSuffix} subscription is active. Pre-flight your training below.`
      : `No charge was made. Your${planSuffix ? planSuffix + " " : " "}seat is still here whenever you're ready.`);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative mb-6 overflow-hidden rounded-2xl border bg-card/70 backdrop-blur-sm p-6 sm:p-8 ${
        isSuccess
          ? "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_30px_-10px_hsl(var(--primary)/0.4)]"
          : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss banner"
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-center text-center gap-4">
        <Logo height={36} />

        <div
          className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] ${
            isSuccess ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isSuccess ? "Payment confirmed" : "Payment cancelled"}
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-foreground">
            {headline}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PostCheckoutBrandBanner;
