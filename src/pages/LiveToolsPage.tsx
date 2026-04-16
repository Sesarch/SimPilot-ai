import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FlightTrackerMap from "@/components/FlightTrackerMap";
import FlightTrackerErrorBoundary from "@/components/FlightTrackerErrorBoundary";
import ATCTrainer from "@/components/ATCTrainer";
import { Radar, Radio } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"tracker" | "atc">("tracker");

  if (!settings.live_tools_enabled) return <FeatureDisabledPage feature="Live Sky Tools" />;

  return (
    <>
      <SEOHead
        title="Live Sky — Flight Tracker & ATC Trainer"
        description="Live Sky — real-time flight tracking on an interactive map and AI-powered ATC radio communication training. Track flights worldwide and practice ATC radio skills."
        keywords="live flight tracker, ATC trainer, real-time flight tracking, ATC radio practice, aviation map, aircraft tracking, flight radar, air traffic control simulation, pilot radio training"
        canonical="/live-tools"
        ogImage="/og-live-sky.jpg"
        jsonLd={liveToolsJsonLd}
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 sm:pt-24 pb-8 sm:pb-16">
          <div className="container mx-auto px-3 sm:px-6">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-1 sm:mb-2">
                Live <span className="text-primary">Sky</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
                Watch the skies in real time — track flights worldwide and sharpen your ATC radio skills with AI.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-4 sm:mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400/40 animate-pulse" />
                    <span className={`relative inline-flex rounded-full h-3 w-3 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)] ${activeTab === tab.id ? "bg-green-300" : "bg-green-500"}`} />
                  </span>
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === "tracker" ? "Tracker" : "ATC"}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === "tracker" ? (
              <FlightTrackerErrorBoundary>
                <div className="h-[calc(100vh-200px)] sm:h-[600px] md:h-[700px]">
                  <FlightTrackerMap />
                </div>
              </FlightTrackerErrorBoundary>
            ) : (
              <ATCTrainer />
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default LiveToolsPage;
