import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StripePlan {
  price_id: string;
  product_id: string;
  name: string;
  description: string | null;
  amount: number; // cents
  currency: string;
  interval: string;
  interval_count: number;
  features: string[];
  tagline: string | null;
  badge: string | null;
  highlighted: boolean;
  sort_order: number;
  metadata: Record<string, string>;
}

export function useStripePlans() {
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase.functions.invoke("list-plans");
        if (err) throw err;
        if (!cancelled) setPlans(data?.plans ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { plans, loading, error };
}

export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}
