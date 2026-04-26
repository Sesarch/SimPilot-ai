import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Logo from "@/components/Logo";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for the reset link!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEOHead
        title="Forgot Password — SimPilot.AI"
        description="Reset your SimPilot.AI password. Enter your email address to receive a password reset link for your pilot training account."
        keywords="forgot password, reset password, SimPilot.AI account recovery, pilot training login help"
        canonical="/forgot-password"
        noIndex
      />
      <div className="w-full max-w-md">
        <Link to="/" title="SimPilot.AI — AI-Powered Pilot Training Home" className="flex items-center justify-center mb-8">
          <Logo height={40} />
        </Link>

        <div className="bg-gradient-card rounded-xl border border-border p-8">
          <h1 className="font-display text-xl font-bold text-foreground text-center mb-2">
            Reset Password
          </h1>

          {sent ? (
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-4">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>.
              </p>
              <Link to="/auth" title="Back to SimPilot.AI sign in" className="text-primary text-sm hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter your email and we'll send you a reset link
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-display text-sm font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-4">
                <Link to="/auth" title="Back to SimPilot.AI sign in" className="text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
