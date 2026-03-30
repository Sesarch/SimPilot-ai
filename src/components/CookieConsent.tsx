import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CONSENT_EXPIRY_DAYS = 180; // 6 months – GDPR standard

const isConsentValid = (): boolean => {
  try {
    const raw = localStorage.getItem("cookie-consent-timestamp");
    if (!raw) return false;
    const timestamp = Number(raw);
    if (isNaN(timestamp)) return false;
    const daysSince = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    return daysSince < CONSENT_EXPIRY_DAYS;
  } catch {
    return false;
  }
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent || !isConsentValid()) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (value: string) => {
    localStorage.setItem("cookie-consent", value);
    localStorage.setItem("cookie-consent-timestamp", String(Date.now()));
    setVisible(false);
  };

  const accept = () => saveConsent("accepted");
  const decline = () => saveConsent("declined");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-card border border-border rounded-xl p-5 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <p className="text-sm text-foreground font-medium">We use cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use cookies to improve your experience, analyze traffic, and personalize content. Read our{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{" "}
                for more details. You can also manage your{" "}
                <Link to="/cookie-preferences" className="text-primary hover:underline">
                  cookie preferences
                </Link>
                .
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={accept} className="text-xs">
                  Accept All
                </Button>
                <Button size="sm" variant="outline" onClick={decline} className="text-xs">
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
