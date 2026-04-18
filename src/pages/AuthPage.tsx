import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Mail, Lock, Plane, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import TermsAgreement from "@/components/TermsAgreement";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const AuthPage = () => {
  const { settings } = useSiteSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = useMemo(() => {
    const stateRedirect = location.state && typeof location.state === "object" && "redirectTo" in location.state
      ? location.state.redirectTo
      : null;

    return typeof stateRedirect === "string" && stateRedirect.startsWith("/")
      ? stateRedirect
      : "/dashboard";
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !agreedToTerms) {
      toast.error("You must agree to the Terms & Conditions before signing up.");
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, pilot!");
        navigate(redirectTo, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Record terms agreement timestamp for legal compliance
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ terms_agreed_at: new Date().toISOString() })
            .eq("user_id", data.user.id);

          // Send branded welcome email (fire-and-forget, idempotent per user)
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "welcome-signup",
              recipientEmail: email,
              idempotencyKey: `welcome-signup-${data.user.id}`,
              templateData: { name: fullName || undefined },
            },
          }).catch((err) => console.error("Welcome email failed:", err));

          // Sync new user to Omnisend with signup tags
          supabase.functions.invoke("sync-omnisend-contact", {
            body: {
              email,
              source: "user_signup",
              pilotContext: fullName ? { full_name: fullName } : null,
            },
          }).catch((err) => console.error("Omnisend sync failed:", err));
        }

        toast.success("Account created! Check your email to verify, then sign in.");
        // Switch to login view with a clear next-step banner
        setPendingVerificationEmail(email);
        setIsLogin(true);
        setAgreedToTerms(false);
        setPassword("");
        setFullName("");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error("OAuth sign-in failed. Please try again.");
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
        {/* Logo */}
        <Link to="/" title="SimPilot.AI — AI-Powered Pilot Training Home" className="flex items-center justify-center gap-2 mb-8">
          <Plane className="w-8 h-8 text-primary" aria-hidden="true" />
          <span className="font-display text-2xl font-bold text-primary text-glow-cyan tracking-wider">
            SIM<span className="text-accent">PILOT</span>.AI
          </span>
        </Link>

        {/* Card */}
        <div className="bg-gradient-card rounded-xl border border-border p-8">
          <h1 className="font-display text-xl font-bold text-foreground text-center mb-2 tracking-wide">
            {isLogin ? "Welcome Back" : "Join SimPilot"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? "Sign in to your training account" : "Create your pilot training account"}
          </p>

          {isLogin && pendingVerificationEmail && (
            <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
              <p className="font-display font-semibold tracking-wide text-primary mb-1">
                ✉ Check your email
              </p>
              <p className="text-muted-foreground">
                We sent a verification link to{" "}
                <span className="text-foreground font-medium">{pendingVerificationEmail}</span>.
                Click the link in that email, then sign in below.
              </p>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-sm text-foreground transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              onClick={() => handleOAuth("apple")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-sm text-foreground transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 hud-line" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 hud-line" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-secondary rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary rounded-lg pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {isLogin && (
              <Link
                to="/forgot-password"
                className="block text-xs text-primary hover:underline text-right"
              >
                Forgot password?
              </Link>
            )}

            {!isLogin && (
              <TermsAgreement
                agreed={agreedToTerms}
                onAgreeChange={setAgreedToTerms}
              />
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !agreedToTerms)}
              className="w-full py-2.5 bg-primary text-primary-foreground font-display text-sm font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          {!settings.signup_enabled && !isLogin ? (
            <p className="text-sm text-destructive text-center mt-6">
              New signups are currently disabled. Please check back later.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => { setIsLogin(!isLogin); setAgreedToTerms(false); }}
                className="text-primary hover:underline font-medium"
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
