import { X, LogIn, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

type Props = {
  type: "signup_required" | "paywall";
  onDismiss: () => void;
};

const ChatGateModal = ({ type, onDismiss }: Props) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl"
    >
      <div className="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {type === "signup_required" ? (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">
              You're enjoying SimPilot AI!
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Create a free account to keep chatting with your AI flight instructor.
              Get <span className="text-primary ">20 messages per day</span> — completely free.
              Plus, enjoy a <span className="text-accent ">7-day free trial</span> of our premium plans — no credit card required.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="w-full px-6 py-3 bg-primary text-primary-foreground font-display text-sm tracking-widest uppercase rounded hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)] transition-all"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="mt-2 w-full px-6 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? Sign in
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">
              Daily Limit Reached
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              You've used all <span className="text-primary ">20 free messages</span> for today.
              Upgrade to unlock <span className="text-accent ">unlimited access</span>, ground school lessons, oral exam prep, and more.
              Start with a <span className="text-accent ">7-day free trial</span> — no credit card required.
            </p>
            <a
              href="#pricing"
              onClick={onDismiss}
              className="block w-full px-6 py-3 bg-accent text-accent-foreground font-display text-sm tracking-widest uppercase rounded hover:shadow-[0_0_25px_hsl(var(--amber-instrument)/0.4)] transition-all"
            >
              View Plans
            </a>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Your free messages reset every 24 hours
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ChatGateModal;
