import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { formatPrice, type StripePlan } from "@/hooks/useStripePlans";

interface PlanDetailsDrawerProps {
  plan: StripePlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (plan: StripePlan) => void;
  loading: boolean;
}

const HIDDEN_META_KEYS = new Set([
  "features", "tagline", "badge", "highlighted", "sort_order", "audience", "hidden",
]);

export default function PlanDetailsDrawer({ plan, open, onOpenChange, onSubscribe, loading }: PlanDetailsDrawerProps) {
  if (!plan) return null;

  const intervalLabel = plan.interval_count > 1
    ? `every ${plan.interval_count} ${plan.interval}s`
    : `per ${plan.interval}`;

  const extraMeta = Object.entries(plan.metadata).filter(([k]) => !HIDDEN_META_KEYS.has(k));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`h-5 w-5 ${plan.highlighted ? "text-[#04C3EC]" : "text-muted-foreground"}`} />
            <SheetTitle className="font-display text-xl">{plan.name}</SheetTitle>
            {plan.badge && (
              <Badge className="bg-[#04C3EC] text-background hover:bg-[#04C3EC] text-[10px] tracking-widest uppercase">
                {plan.badge}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl text-foreground">{formatPrice(plan.amount, plan.currency)}</span>
            <span className="text-sm text-muted-foreground">{intervalLabel}</span>
          </div>
          {plan.tagline && (
            <SheetDescription className="text-sm text-foreground/80 mt-1">{plan.tagline}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {plan.description && (
            <section>
              <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Description
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {plan.description}
              </p>
            </section>
          )}

          {plan.features.length > 0 && (
            <section>
              <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2">
                What's included
              </h4>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 ${plan.highlighted ? "text-[#04C3EC]" : "text-emerald-400"} mt-0.5 shrink-0`} />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {extraMeta.length > 0 && (
            <section>
              <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Plan details
              </h4>
              <dl className="grid grid-cols-1 gap-2 text-sm rounded-lg border border-border bg-card/30 p-3">
                {extraMeta.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-foreground/90 text-right break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section>
            <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Billing
            </h4>
            <dl className="grid grid-cols-1 gap-2 text-sm rounded-lg border border-border bg-card/30 p-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Billing cycle</dt>
                <dd className="text-foreground/90">{intervalLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="text-foreground/90 uppercase">{plan.currency}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Price ID</dt>
                <dd className="text-foreground/60 font-mono text-[11px] truncate max-w-[60%]" title={plan.price_id}>
                  {plan.price_id}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <SheetFooter className="mt-6">
          <Button
            onClick={() => onSubscribe(plan)}
            disabled={loading}
            className={plan.highlighted
              ? "w-full bg-[#04C3EC] hover:bg-[#04C3EC]/90 text-background "
              : "w-full "}
            variant={plan.highlighted ? "default" : "outline"}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening checkout…</>
            ) : (
              `Choose ${plan.name}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
