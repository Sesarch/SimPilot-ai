import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import PilotIdentityChip from "./PilotIdentityChip";
import { useAuth } from "@/hooks/useAuth";
import { Plane } from "lucide-react";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import GraduationModal from "@/components/GraduationModal";

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const trial = useTrialStatus();
  const [dismissedOnce, setDismissedOnce] = useState(false);

  const [postCheckoutSyncing, setPostCheckoutSyncing] = useState(false);

  // Show graduation modal when trial expired AND user has no active subscription.
  // Account page is exempt so users can still manage billing/log out.
  // Also suppress while we're polling Stripe right after a successful checkout
  // so the modal doesn't flash before the webhook propagates.
  const showGraduation =
    !trial.loading &&
    !postCheckoutSyncing &&
    trial.trialExpired &&
    !trial.subscribed &&
    !dismissedOnce &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/account");

  // Poll subscription state when returning from successful checkout.
  // Stripe webhooks can take several seconds to land — without polling, the
  // first check-subscription call returns "unsubscribed" and the Graduation
  // modal flashes the user back into a paywall loop.
  // NOTE: trial.refresh is intentionally not a dependency — that object is
  // recreated every render and would cause an infinite refresh loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") !== "1") return;

    let cancelled = false;
    setPostCheckoutSyncing(true);

    (async () => {
      const MAX_ATTEMPTS = 12; // ~24s total
      const INTERVAL_MS = 2000;
      for (let i = 0; i < MAX_ATTEMPTS && !cancelled; i++) {
        await trial.refresh();
        if (cancelled) return;
        // Re-read latest by checking URL flag clearance + giving react state a tick
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
        // If subscription has landed, stop polling.
        // We re-read window since trial state from closure is stale.
        if ((window as any).__simpilot_subscribed === true) break;
      }
      if (!cancelled) {
        setPostCheckoutSyncing(false);
        // Clean URL so a refresh doesn't re-trigger polling
        const url = new URL(window.location.href);
        url.searchParams.delete("subscribed");
        url.searchParams.delete("plan");
        url.searchParams.delete("price");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror subscribed flag onto window so the polling loop above can early-exit.
  useEffect(() => {
    (window as any).__simpilot_subscribed = trial.subscribed;
    if (trial.subscribed && postCheckoutSyncing) {
      setPostCheckoutSyncing(false);
    }
  }, [trial.subscribed, postCheckoutSyncing]);
  void setDismissedOnce; // reserved for future "remind me later" affordance

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#101217] flex items-center justify-center">
        <Plane className="w-6 h-6 text-[#04C3EC] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="g3000 min-h-screen">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b border-border bg-background/90 px-4">
              <SidebarTrigger className="self-center text-muted-foreground hover:text-primary" />
              <div className="h-6 w-px self-center bg-border" />
              <span className="flex items-center self-center font-display text-[13px] leading-none tracking-[0.22em] uppercase text-foreground">
                SimPilot Avionics Suite
              </span>
              <div className="ml-auto flex h-full items-center gap-4 self-center">
                <div className="hidden items-center gap-2 md:flex">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--hud-green))] animate-pulse" />
                  <span className="flex items-center font-display text-[12px] leading-none tracking-[0.2em] uppercase text-foreground/80">
                    System Nominal
                  </span>
                </div>
                <div className="hidden h-6 w-px self-center bg-border md:block" />
                <PilotIdentityChip />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <GraduationModal
          open={showGraduation}
          displayName={user?.user_metadata?.full_name ?? user?.email ?? null}
          activity={trial.activity}
        />
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;
