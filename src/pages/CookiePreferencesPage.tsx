import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Cookie } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CookiePrefs {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const defaultPrefs: CookiePrefs = {
  essential: true,
  analytics: false,
  marketing: false,
  personalization: false,
};

const categories = [
  {
    key: "essential" as const,
    label: "Essential Cookies",
    description: "Required for the website to function. These cannot be disabled.",
    locked: true,
  },
  {
    key: "analytics" as const,
    label: "Analytics Cookies",
    description: "Help us understand how visitors interact with our website by collecting anonymous usage data.",
    locked: false,
  },
  {
    key: "marketing" as const,
    label: "Marketing Cookies",
    description: "Used to deliver relevant advertisements and track campaign performance across platforms.",
    locked: false,
  },
  {
    key: "personalization" as const,
    label: "Personalization Cookies",
    description: "Allow us to remember your preferences and tailor content to your interests.",
    locked: false,
  },
];

const CookiePreferencesPage = () => {
  const [prefs, setPrefs] = useState<CookiePrefs>(() => {
    try {
      const stored = localStorage.getItem("cookie-preferences");
      return stored ? JSON.parse(stored) : { ...defaultPrefs, analytics: true, marketing: true, personalization: true };
    } catch {
      return defaultPrefs;
    }
  });

  const toggle = (key: keyof CookiePrefs) => {
    if (key === "essential") return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = () => {
    localStorage.setItem("cookie-preferences", JSON.stringify(prefs));
    localStorage.setItem("cookie-consent", "custom");
    toast.success("Cookie preferences saved");
  };

  const acceptAll = () => {
    const all: CookiePrefs = { essential: true, analytics: true, marketing: true, personalization: true };
    setPrefs(all);
    localStorage.setItem("cookie-preferences", JSON.stringify(all));
    localStorage.setItem("cookie-consent", "accepted");
    toast.success("All cookies accepted");
  };

  const declineAll = () => {
    setPrefs(defaultPrefs);
    localStorage.setItem("cookie-preferences", JSON.stringify(defaultPrefs));
    localStorage.setItem("cookie-consent", "declined");
    toast.success("Optional cookies declined");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Cookie className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Cookie Preferences</h1>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. You
          can customize your preferences below. For more information, please read our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="space-y-4 mb-8">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-card"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
              </div>
              <Switch
                checked={prefs[cat.key]}
                onCheckedChange={() => toggle(cat.key)}
                disabled={cat.locked}
                className="shrink-0 mt-0.5"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={save}>Save Preferences</Button>
          <Button variant="outline" onClick={acceptAll}>
            Accept All
          </Button>
          <Button variant="outline" onClick={declineAll}>
            Decline Optional
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookiePreferencesPage;
