import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CONSENT_EXPIRY_DAYS = 180; // 6 months – GDPR standard

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const hasValidConsent = (): boolean => {
  // Primary: check browser cookie (survives localStorage clears)
  if (getCookie("cookie-consent")) return true;
  // Fallback: check localStorage with timestamp
  try {
    const consent = localStorage.getItem("cookie-consent");
    const raw = localStorage.getItem("cookie-consent-timestamp");
    if (!consent || !raw) return false;
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
    if (hasValidConsent()) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (value: string) => {
    // Set browser cookie as primary (survives localStorage clears)
    setCookie("cookie-consent", value, CONSENT_EXPIRY_DAYS);
    // Also set localStorage as fallback
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
              <p className="text-sm text-foreground ">We use cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use cookies to improve your experience, analyze traffic, and personalize content. Read our{" "}
                <Link to="/privacy" title="Read the SimPilot.AI Privacy Policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{" "}
                for more details. You can also manage your{" "}
                <Link to="/cookie-preferences" title="Manage your SimPilot.AI cookie preferences" className="text-primary hover:underline">
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
