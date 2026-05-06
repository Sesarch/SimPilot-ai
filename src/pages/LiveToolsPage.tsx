import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import FlightTrackerMap from "@/components/FlightTrackerMap";
import FlightTrackerErrorBoundary from "@/components/FlightTrackerErrorBoundary";
import ATCTrainer from "@/components/ATCTrainer";
import FlightAwareTestButton from "@/components/FlightAwareTestButton";
import FlightProviderStatusPanel from "@/components/FlightProviderStatusPanel";

import { Radar, Radio, Cloud, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const tabs = [
  { id: "tracker", label: "Live Flight Tracker", icon: Radar },
  { id: "atc", label: "ATC Trainer", icon: Radio },
] as const;

const liveToolsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Live Sky — SimPilot.AI",
  description: "Real-time flight tracking on an interactive map and AI-powered ATC radio communication training.",
  url: "https://simpilot.ai/live-tools",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Real-time global flight tracking",
    "Interactive map with aircraft positions",
    "Live METAR weather at major airports",
    "AI-powered ATC communication trainer",
    "Altitude and callsign filtering",
  ],
  isPartOf: { "@type": "WebSite", name: "SimPilot.AI", url: "https://simpilot.ai" },
};

import { useSiteSettings } from "@/hooks/useSiteSettings";
import FeatureDisabledPage from "@/components/FeatureDisabledPage";

const LiveToolsPage = () => {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const initialTab: "tracker" | "atc" =
    new URLSearchParams(location.search).get("tab") === "atc" ||
    location.hash === "#atc" ||
    location.pathname.includes("atc")
      ? "atc"
      : "tracker";
  const [activeTab, setActiveTab] = useState<"tracker" | "atc">(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("tab");
    if (t === "atc" || t === "tracker") setActiveTab(t);
    else if (location.hash === "#atc") setActiveTab("atc");
    else if (location.hash === "#tracker") setActiveTab("tracker");
  }, [location.search, location.hash]);

  if (!settings.live_tools_enabled) return <FeatureDisabledPage feature="Live Sky Tools" />;

  return (
    <>
      <SEOHead
        title="Live Sky — Flight Tracker & ATC Trainer"
        description="Live Sky — real-time flight tracking on an interactive map and AI-powered ATC radio communication training. Track flights worldwide and practice ATC radio skills."
        keywords="live flight tracker, ATC trainer, real-time flight tracking, ATC radio practice, aviation map, aircraft tracking, flight radar, air traffic control simulation, pilot radio training"
        canonical="/live-tools"
        ogImage="/og-live-sky.jpg"
        noIndex
        jsonLd={liveToolsJsonLd}
      />
      <div className="min-h-full bg-background">
        <main className="pb-8 sm:pb-16 pt-4 sm:pt-6">
          <div className="container mx-auto px-3 sm:px-6">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                  ATC Suite
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl text-foreground tracking-wider">
                    LIVE <span className="text-accent">SKY</span>
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                    Real-time global traffic and AI ATC radio drills.
                  </p>
                </div>
                {activeTab === "tracker" && <FlightAwareTestButton />}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 sm:mb-6 border-b border-border">
              {tabs.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-display tracking-wider uppercase transition-all ${
                      active
                        ? "text-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--hud-green))] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--hud-green))]" />
                    </span>
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id === "tracker" ? "Tracker" : "ATC"}</span>
                    {active && (
                      <span
                        className="absolute -bottom-px left-0 right-0 h-0.5 bg-accent"
                        style={{ boxShadow: "0 0 8px hsl(var(--amber-instrument))" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Weather Briefing CTA — links to dedicated page */}
            <Link
              to="/weather-briefing"
              className="group mb-4 sm:mb-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 hover:bg-card/70 hover:border-accent/60 transition-all px-3 sm:px-4 py-2.5 sm:py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md bg-accent/15 text-accent shrink-0">
                  <Cloud className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-xs sm:text-sm uppercase tracking-wider text-foreground">
                    Real-World Weather Briefing
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                    Pull live METAR &amp; TAF for any airport, then get an AI CFI brief.
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
            </Link>

            {/* Content */}
            {activeTab === "tracker" ? (
              <FlightTrackerErrorBoundary>
                <div className="mb-3">
                  <FlightProviderStatusPanel />
                </div>
                <div className="h-[calc(100vh-300px)] sm:h-[600px] md:h-[700px] rounded-lg overflow-hidden border border-border">
                  <FlightTrackerMap />
                </div>
              </FlightTrackerErrorBoundary>
            ) : (
              <ATCTrainer />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default LiveToolsPage;
