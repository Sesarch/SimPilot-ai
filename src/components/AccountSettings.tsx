import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Mail, Trash2, AlertTriangle, GraduationCap, Globe, Copy, ExternalLink, CreditCard, Receipt, Download, AlertCircle, RefreshCw } from "lucide-react";
import { usePilotContext } from "@/hooks/usePilotContext";
import RedeemSchoolCode from "@/components/RedeemSchoolCode";
import MfaSettings from "@/components/MfaSettings";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { calculatePlanLabel } from "@/lib/planLabel";

const TRACK_OPTIONS = [
  { value: "PPL", label: "PPL — Private Pilot" },
  { value: "IR", label: "IR — Instrument Rating" },
  { value: "CPL", label: "CPL — Commercial Pilot" },
  { value: "ATP", label: "ATP — Airline Transport Pilot" },
];

function normalizeTrack(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.toLowerCase();
  if (v.includes("atp") || v.includes("airline transport")) return "ATP";
  if (v.includes("instrument") || v === "ir") return "IR";
  if (v.includes("commercial") || v === "cpl") return "CPL";
  if (v.includes("private") || v === "ppl" || v.includes("student") || v.includes("sport") || v.includes("recreational")) return "PPL";
  return "";
}
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AccountSettings = () => {
  const { user } = useAuth();
  const { context, updateField } = usePilotContext();
  const currentTrack = normalizeTrack(context.certificate_type);
  const handleTrackChange = (value: string) => {
    updateField("certificate_type", value);
    toast.success(`Study Track set to ${value}. Your CFI-AI will use ${value} ACS depth.`);
  };
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [profilePublic, setProfilePublic] = useState<boolean | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);

  type BillingSummary = {
    subscribed: boolean;
    status?: string | null;
    tier?: string | null;
    amount?: number | null;
    currency?: string | null;
    interval?: string | null;
    interval_count?: number | null;
    cancel_at_period_end?: boolean;
    subscription_end?: string | null;
  };
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  type Invoice = {
    id: string;
    number: string | null;
    amount_paid: number;
    amount_due: number;
    currency: string;
    status: string | null;
    created: number;
    period_start: number | null;
    period_end: number | null;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
  };
  type PaymentMethod = {
    type?: string;
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
  };
  type PaymentIssue = {
    invoice_id: string;
    status: string | null;
    amount_due: number;
    currency: string;
    hosted_invoice_url: string | null;
    attempt_count: number;
    next_payment_attempt: number | null;
  };
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentIssue, setPaymentIssue] = useState<PaymentIssue | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<number>(0);

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("message_usage")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();
    setDailyUsage(data?.message_count ?? 0);
  }, [user]);

  const fetchBilling = async () => {
    const [subRes, billRes] = await Promise.all([
      supabase.functions.invoke("check-subscription"),
      supabase.functions.invoke("billing-details"),
    ]);
    if (subRes.error) {
      console.error("[AccountSettings] check-subscription error", subRes.error);
      setBilling({ subscribed: false });
    } else {
      setBilling((subRes.data as BillingSummary) ?? { subscribed: false });
    }
    if (billRes.error) {
      console.error("[AccountSettings] billing-details error", billRes.error);
      setInvoices([]);
      setPaymentMethod(null);
      setPaymentIssue(null);
    } else {
      setInvoices((billRes.data?.invoices ?? []) as Invoice[]);
      setPaymentMethod((billRes.data?.payment_method ?? null) as PaymentMethod | null);
      setPaymentIssue((billRes.data?.payment_issue ?? null) as PaymentIssue | null);
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setBillingLoading(true);
    setPaymentsLoading(true);
    fetchBilling().finally(() => {
      if (cancelled) return;
      setBillingLoading(false);
      setPaymentsLoading(false);
    });
    fetchUsage();
    return () => { cancelled = true; };
  }, [user, fetchUsage]);

  // Live-update usage: subscribe to today's row in message_usage so the
  // counter refreshes whenever the user sends a chat message in another tab
  // or the pilot-chat function writes a new row.
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const channel = supabase
      .channel(`usage-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_usage",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { usage_date?: string; message_count?: number } | null;
          if (row?.usage_date === today && typeof row.message_count === "number") {
            setDailyUsage(row.message_count);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Auto-recovery: while there's a payment issue or past-due status, poll every
  // 15s so the UI clears itself the moment the Stripe webhook records success.
  useEffect(() => {
    const hasIssue =
      !!paymentIssue ||
      billing?.status === "past_due" ||
      billing?.status === "unpaid";
    if (!hasIssue || !user) return;
    const interval = window.setInterval(async () => {
      const prevHadIssue = !!paymentIssue;
      await fetchBilling();
      // success toast handled by effect below when paymentIssue clears
      void prevHadIssue;
    }, 15000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIssue, billing?.status, user]);

  // When a payment issue clears, surface a one-time success toast.
  const [hadIssue, setHadIssue] = useState(false);
  useEffect(() => {
    if (paymentIssue) {
      setHadIssue(true);
    } else if (hadIssue) {
      setHadIssue(false);
      toast.success("Payment recovered. Your subscription is active again.");
    }
  }, [paymentIssue, hadIssue]);


  const formatMoney = (amountMinor?: number | null, currency?: string | null) => {
    if (amountMinor == null || !currency) return null;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amountMinor / 100);
    } catch {
      return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const { trialEndsAt } = useTrialStatus();
  const planInfo = calculatePlanLabel({
    subscribed: billing?.subscribed,
    tier: billing?.tier,
    trialEndsAt,
  });
  const planLabel = planInfo.label;

  const statusMeta: Record<string, { label: string; tone: string }> = {
    active: { label: "Active", tone: "badge-status-success" },
    trialing: { label: "Trial", tone: "badge-status-info" },
    past_due: { label: "Past due", tone: "badge-status-warn" },
    unpaid: { label: "Unpaid", tone: "badge-status-danger" },
    canceled: { label: "Canceled", tone: "badge-status-neutral" },
  };
  const status = billing?.status ?? (billing?.subscribed ? "active" : "none");
  const statusBadge = statusMeta[status] ?? { label: "No subscription", tone: "badge-status-neutral" };

  const renewalAmount = formatMoney(billing?.amount, billing?.currency);
  const renewalDate = formatDate(billing?.subscription_end);
  const billingNoun = billing?.cancel_at_period_end ? "Ends on" : "Next billing";

  // Daily message limits per tier. Kept in sync with the conversion funnel:
  // anon 5, free signed-in 20, paid tiers scale up, Ultra unlimited.
  const tierKey = (billing?.tier ?? "free").toLowerCase();
  const DAILY_LIMITS: Record<string, number> = {
    free: 20,
    student: 200,
    pro: 1000,
    ultra: Infinity,
  };
  const dailyLimit = DAILY_LIMITS[tierKey] ?? 20;
  const usagePct = dailyLimit === Infinity ? 0 : Math.min(100, Math.round((dailyUsage / dailyLimit) * 100));
  const usageTone =
    dailyLimit === Infinity ? "bg-primary"
    : usagePct >= 90 ? "bg-red-500"
    : usagePct >= 70 ? "bg-amber-500"
    : "bg-primary";
  const priceLabel = renewalAmount
    ? `${renewalAmount}${billing?.interval ? ` / ${billing.interval}` : ""}`
    : billing?.subscribed ? "—" : planInfo.trialActive ? `Trial · ${planInfo.trialDaysLeft}d left` : "Free";

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("no stripe customer")) {
        toast.error("No paid subscription yet — choose a plan to upgrade.");
        window.location.href = "/#pricing";
      } else {
        toast.error("Couldn't open billing portal. Please try again.");
      }
      console.error("[AccountSettings] customer-portal error", err);
    } finally {
      setOpeningPortal(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("profile_public")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfilePublic((data as any)?.profile_public ?? true);
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleTogglePrivacy = async (next: boolean) => {
    if (!user) return;
    setSavingPrivacy(true);
    setProfilePublic(next); // optimistic
    const { error } = await supabase
      .from("profiles")
      .update({ profile_public: next } as any)
      .eq("user_id", user.id);
    setSavingPrivacy(false);
    if (error) {
      setProfilePublic(!next);
      toast.error("Couldn't update privacy. Try again.");
    } else {
      toast.success(next ? "Profile is now public" : "Profile is now private");
    }
  };

  const publicProfileUrl = user ? `${window.location.origin}/pilot/${user.id}` : "";

  const copyProfileUrl = async () => {
    if (!publicProfileUrl) return;
    await navigator.clipboard.writeText(publicProfileUrl);
    toast.success("Public profile link copied");
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("Confirmation email sent to your new address. Please verify to complete the change.");
      setNewEmail("");
    }
    setChangingEmail(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    // Account deletion requires an edge function with service role
    toast.error("Please contact support to delete your account.");
    setShowDeleteDialog(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <div id="security" className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <MfaSettings />
      </div>

      {/* Billing & Subscription */}
      <div id="billing" className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm text-foreground mb-1 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" /> Billing & Subscription
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Manage your SimPilot plan, update payment methods, download invoices, or cancel — all securely through Stripe.
        </p>

        {/* Payment failed banner — auto-clears once webhook records success */}
        {paymentIssue && (() => {
          const amount = (() => {
            try {
              return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: paymentIssue.currency.toUpperCase(),
              }).format(paymentIssue.amount_due / 100);
            } catch {
              return `${(paymentIssue.amount_due / 100).toFixed(2)} ${paymentIssue.currency.toUpperCase()}`;
            }
          })();
          const nextAttempt = paymentIssue.next_payment_attempt
            ? new Date(paymentIssue.next_payment_attempt * 1000).toLocaleDateString(undefined, {
                month: "short", day: "numeric",
              })
            : null;
          return (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-red-300 mb-1">
                    Payment failed — {amount} outstanding
                  </div>
                  <p className="text-xs text-red-200/80 mb-3">
                    Your last charge didn&apos;t go through
                    {paymentIssue.attempt_count > 0 ? ` (attempt ${paymentIssue.attempt_count})` : ""}.
                    Retry now to keep your subscription active
                    {nextAttempt ? ` — Stripe will otherwise auto-retry on ${nextAttempt}.` : "."}
                    {" "}This panel will update automatically once payment succeeds.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {paymentIssue.hosted_invoice_url && (
                      <Button
                        asChild
                        size="sm"
                        className="bg-red-500 hover:bg-red-500/90 text-white"
                      >
                        <a
                          href={paymentIssue.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          Retry payment
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={openingPortal}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Update payment method
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={recovering}
                      onClick={async () => {
                        setRecovering(true);
                        try {
                          await fetchBilling();
                          toast.success("Billing status refreshed.");
                        } finally {
                          setRecovering(false);
                        }
                      }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recovering ? "animate-spin" : ""}`} />
                      Check status
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="rounded-lg border border-border bg-background/40 p-4 mb-4">
          {billingLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
              <div className="h-3 w-48 rounded bg-muted/30 animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Current plan</div>
                  <div className="font-display text-base text-foreground">{planLabel}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{priceLabel}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${statusBadge.tone}`}>
                  {statusBadge.label}
                </span>
              </div>

              {billing?.subscribed ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{billingNoun}</div>
                    <div className="text-foreground">{renewalDate ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      {billing?.cancel_at_period_end ? "Final amount" : "Renewal amount"}
                    </div>
                    <div className="text-foreground">{priceLabel}</div>
                  </div>
                  {billing?.cancel_at_period_end && (
                    <div className="col-span-2 text-[11px] text-amber-400/90">
                      Your subscription is set to cancel at the end of the current period.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You don't have an active subscription. Upgrade to unlock unlimited CFI-AI sessions, oral exam prep, and more.
                </p>
              )}

              {/* Today's usage — updates live via realtime subscription */}
              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Today's AI messages
                  </div>
                  <div className="text-xs text-foreground tabular-nums">
                    {dailyLimit === Infinity
                      ? `${dailyUsage} used · Unlimited`
                      : `${dailyUsage} / ${dailyLimit}`}
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={`h-full ${usageTone} transition-all`}
                    style={{ width: dailyLimit === Infinity ? "100%" : `${usagePct}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground">
                  Resets at midnight UTC.{" "}
                  {dailyLimit !== Infinity && usagePct >= 70 && (
                    <span className="text-amber-400/90">
                      {usagePct >= 100 ? "Daily limit reached." : "Approaching daily limit."}
                    </span>
                  )}
                </div>
              </div>

            </>
          )}
        </div>

        {billing?.subscribed ? (
          <Button onClick={() => setShowBillingConfirm(true)} disabled={openingPortal} size="sm">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            {openingPortal ? "Opening…" : "Manage subscription"}
          </Button>
        ) : (
          <Button onClick={() => { window.location.href = "/#pricing"; }} size="sm">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Upgrade plan
          </Button>
        )}
      </div>

      {/* Payment Method & Invoice History */}
      <div id="payments" className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm text-foreground mb-1 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" /> Payments & Invoices
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Your payment method on file and recent Stripe invoices. Use "Manage subscription" above to update your card.
        </p>

        {/* Payment method */}
        <div className="rounded-lg border border-border bg-background/40 p-4 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Payment method</div>
          {paymentsLoading ? (
            <div className="h-4 w-40 rounded bg-muted/40 animate-pulse" />
          ) : paymentMethod ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-6 rounded bg-gradient-to-br from-primary/20 to-accent/10 border border-border flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-foreground capitalize">
                    {paymentMethod.brand ?? paymentMethod.type ?? "Card"}
                    {paymentMethod.last4 ? ` •••• ${paymentMethod.last4}` : ""}
                  </div>
                  {paymentMethod.exp_month && paymentMethod.exp_year && (
                    <div className="text-[11px] text-muted-foreground">
                      Expires {String(paymentMethod.exp_month).padStart(2, "0")}/{String(paymentMethod.exp_year).slice(-2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No payment method on file.</p>
          )}
        </div>

        {/* Invoice history */}
        <div className="rounded-lg border border-border bg-background/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            Invoice history
          </div>
          {paymentsLoading ? (
            <div className="p-4 space-y-2">
              <div className="h-4 w-full rounded bg-muted/30 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted/30 animate-pulse" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((inv) => {
                const date = new Date(inv.created * 1000).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                });
                const amount = (() => {
                  const v = inv.amount_paid || inv.amount_due;
                  try {
                    return new Intl.NumberFormat(undefined, {
                      style: "currency", currency: inv.currency.toUpperCase(),
                    }).format(v / 100);
                  } catch {
                    return `${(v / 100).toFixed(2)} ${inv.currency.toUpperCase()}`;
                  }
                })();
                const statusTone =
                  inv.status === "paid" ? "text-emerald-500"
                  : inv.status === "open" ? "text-amber-400"
                  : inv.status === "void" || inv.status === "uncollectible" ? "text-red-400"
                  : "text-muted-foreground";
                return (
                  <li key={inv.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground truncate">
                        {inv.number ?? inv.id}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{date}</div>
                    </div>
                    <div className="text-foreground tabular-nums">{amount}</div>
                    <div className={`text-[10px] uppercase tracking-wider ${statusTone} w-14 text-right`}>
                      {inv.status ?? "—"}
                    </div>
                    <div className="flex items-center gap-1">
                      {inv.hosted_invoice_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2" title="View invoice">
                          <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer noopener">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      {inv.invoice_pdf && (
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2" title="Download PDF">
                          <a href={inv.invoice_pdf} target="_blank" rel="noreferrer noopener">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>


      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <RedeemSchoolCode />
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm text-foreground mb-1 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> Study Track
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Sets the ACS depth your CFI-AI uses across Ground One-on-One, Oral Exam, and chat. Syncs across devices.
        </p>
        <Select value={currentTrack} onValueChange={handleTrackChange}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select your certificate level" />
          </SelectTrigger>
          <SelectContent>
            {TRACK_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p><span className="text-foreground">PPL</span> — VFR fundamentals, basic aerodynamics, Part 91</p>
          <p><span className="text-foreground">IR</span> — IFR procedures, approach plates, weather minima</p>
          <p><span className="text-foreground">CPL</span> — Commercial maneuvers, complex aircraft, Part 119</p>
          <p><span className="text-foreground">ATP</span> — High-altitude, multi-crew CRM, Part 121/135</p>
        </div>
      </div>

      {/* Public Profile Privacy */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="font-display text-sm text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Public Profile
          </h3>
          <Switch
            checked={profilePublic ?? true}
            onCheckedChange={handleTogglePrivacy}
            disabled={savingPrivacy || profilePublic === null}
            aria-label="Toggle public profile visibility"
          />
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          When on, anyone with your link can see your callsign, certificate, flight hours, and earned badges.
          When off, your <code className="text-foreground">/pilot/{user?.id?.slice(0, 8)}…</code> page shows a "Private Profile" message.
        </p>
        {profilePublic && publicProfileUrl && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
            <span className="font-mono text-[11px] text-muted-foreground truncate flex-1">
              {publicProfileUrl}
            </span>
            <Button size="sm" variant="ghost" onClick={copyProfileUrl} className="h-7 px-2">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" asChild className="h-7 px-2">
              <a href={publicProfileUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Change Email */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm text-foreground mb-1 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" /> Change Email
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Current: <span className="text-foreground">{user?.email}</span>
        </p>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail.trim()} size="sm">
            {changingEmail ? "Sending..." : "Update"}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm text-foreground mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> Change Password
        </h3>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
            size="sm"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-6">
        <h3 className="font-display text-sm text-destructive mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
        </Button>
      </div>

      <AlertDialog open={showBillingConfirm} onOpenChange={setShowBillingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open Stripe billing portal?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  You'll be redirected to Stripe in a new tab where you can update payment methods,
                  download invoices, switch plans, or cancel your subscription.
                </p>
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
                  <div className="font-medium text-amber-300 mb-1">If you cancel:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      You'll keep access until{" "}
                      <span className="text-foreground font-medium">
                        {formatDate(billing?.subscription_end) ?? "the end of your current billing period"}
                      </span>.
                    </li>
                    <li>No further charges will be made and auto-renewal stops.</li>
                    <li>
                      After that date, your CFI-AI usage drops back to the free tier and premium
                      features (unlimited chat, oral exam mode, POH grounding) are paused.
                    </li>
                    <li>Your training history and profile are preserved — resubscribe anytime.</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay here</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowBillingConfirm(false);
                await handleManageBilling();
              }}
            >
              Continue to Stripe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all training progress, session history,
              and profile data. Type <strong>DELETE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSettings;
