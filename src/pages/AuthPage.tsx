import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import AuthBrand from "@/components/auth/AuthBrand";
import AuthDivider from "@/components/auth/AuthDivider";
import OAuthButtons from "@/components/auth/OAuthButtons";
import VerificationBanner from "@/components/auth/VerificationBanner";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import { useResendCooldown, parseRetryAfter } from "@/components/auth/useResendCooldown";

// Default cooldown after a successful signup or resend (matches Supabase's
// server-side rate limit window so the UI never under-reports).
const RESEND_COOLDOWN_SECONDS = 60;

const AuthPage = () => {
  const { settings } = useSiteSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const cooldown = useResendCooldown();

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = useMemo(() => {
    const stateRedirect = location.state && typeof location.state === "object" && "redirectTo" in location.state
      ? (location.state as { redirectTo?: unknown }).redirectTo
      : null;
    return typeof stateRedirect === "string" && stateRedirect.startsWith("/")
      ? stateRedirect
      : "/dashboard";
  }, [location.state]);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Send welcome email on first successful sign-in (post-verification).
      // Idempotency key ensures it only ever sends once per user.
      if (data.user) {
        const fullName =
          (data.user.user_metadata?.full_name as string | undefined) ?? undefined;
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome-signup",
            recipientEmail: data.user.email ?? email,
            idempotencyKey: `welcome-signup-${data.user.id}`,
            templateData: { name: fullName },
          },
        }).catch((err) => console.error("Welcome email failed:", err));
      }

      toast.success("Welcome back, pilot!");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (fullName: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      if (data.user) {
        await supabase
          .from("profiles")
          .update({ terms_agreed_at: new Date().toISOString() })
          .eq("user_id", data.user.id);

        // NOTE: Welcome email is intentionally NOT sent here. It is sent on the
        // user's first successful sign-in (after they verify their email) so they
        // don't mistake the welcome CTA for the verification link.


        supabase.functions.invoke("sync-omnisend-contact", {
          body: {
            email,
            source: "user_signup",
            pilotContext: fullName ? { full_name: fullName } : null,
          },
        }).catch((err) => console.error("Omnisend sync failed:", err));
      }

      toast.success("Account created! Check your email to verify, then sign in.");
      setPendingVerificationEmail(email);
      // Pre-arm the cooldown — Supabase already enforces ~60s server-side,
      // so showing the countdown immediately prevents confusing rate-limit
      // toasts and stops duplicate-account attempts.
      cooldown.start(RESEND_COOLDOWN_SECONDS);
      setIsLogin(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      // If the error itself encodes a retry window, sync the UI to it.
      const retry = parseRetryAfter(message);
      if (retry) cooldown.start(retry);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail || resending || cooldown.active) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingVerificationEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Verification email sent. Check your inbox.");
      cooldown.start(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend verification email.";
      // Sync local cooldown to the server-reported retry window when present.
      const retry = parseRetryAfter(message);
      if (retry) {
        cooldown.start(retry);
        toast.error(`Please wait ${retry}s before requesting another email.`);
      } else {
        toast.error(message);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEOHead
        title="Sign In / Sign Up — SimPilot.AI Pilot Training"
        description="Sign in or create your SimPilot.AI account to access AI-powered ground school, oral exam simulators, and personalized pilot training. Start your 7-day free trial today."
        keywords="SimPilot.AI login, pilot training sign up, aviation training account, ground school access, oral exam prep login, student pilot registration"
        canonical="/auth"
        ogImage="/og-auth.jpg"
        noIndex
      />
      <div className="w-full max-w-md">
        <AuthBrand />

        <div className="bg-gradient-card rounded-xl border border-border p-8">
          <h1 className="font-display text-xl text-foreground text-center mb-2 tracking-wide">
            {isLogin ? "Welcome Back" : "Join SimPilot"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? "Sign in to your training account" : "Create your pilot training account"}
          </p>

          {isLogin && pendingVerificationEmail && (
            <VerificationBanner
              email={pendingVerificationEmail}
              resending={resending}
              cooldown={cooldown.seconds}
              onResend={handleResendVerification}
            />
          )}

          <OAuthButtons />
          <AuthDivider />

          {isLogin ? (
            <SignInForm
              onSubmit={handleSignIn}
              loading={loading}
              initialEmail={pendingVerificationEmail ?? ""}
            />
          ) : (
            <SignUpForm onSubmit={handleSignUp} loading={loading} />
          )}

          {!settings.signup_enabled && !isLogin ? (
            <p className="text-sm text-destructive text-center mt-6">
              New signups are currently disabled. Please check back later.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline "
              >
                {isLogin ? (settings.signup_enabled ? "Sign up" : "Sign up (disabled)") : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
