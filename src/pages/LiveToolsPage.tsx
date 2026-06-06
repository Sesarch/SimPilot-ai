import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import FlightTrackerMap from "@/components/FlightTrackerMap";
import FlightTrackerErrorBoundary from "@/components/FlightTrackerErrorBoundary";
import { Radar, Cloud, ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import FeatureDisabledPage from "@/components/FeatureDisabledPage";

const liveToolsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Live Sky — SimPilot.AI",
  description: "Real-time flight tracking on an interactive map.",
  url: "https://simpilot.ai/live-tools",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Real-time global flight tracking",
    "Interactive map with aircraft positions",
    "Live METAR weather at major airports",
    "Altitude and callsign filtering",
  ],
  isPartOf: { "@type": "WebSite", name: "SimPilot.AI", url: "https://simpilot.ai" },
};

const LiveToolsPage = () => {
  const { settings } = useSiteSettings();
  const location = useLocation();

  // Legacy ?tab=atc deep links → redirect to new ATC Training route
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "atc" || location.hash === "#atc") {
      window.location.replace("/atc");
    }
  }, [location.search, location.hash]);

  if (!settings.live_tools_enabled) return <FeatureDisabledPage feature="Live Sky Tools" />;

  return (
    <>
      <SEOHead
        title="Live Sky — Flight Tracker"
        description="Real-time flight tracking on an interactive map. Track flights worldwide and view live METAR weather."
        keywords="live flight tracker, real-time flight tracking, aviation map, aircraft tracking, flight radar"
        canonical="/live-tools"
        ogImage="/og-live-sky.jpg"
        noIndex
        jsonLd={liveToolsJsonLd}
      />
      <div className="min-h-full bg-background">
        <main className="pb-8 sm:pb-16 pt-4 sm:pt-6">
          <div className="container mx-auto px-3 sm:px-6">
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
                    Real-time global traffic.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Radar className="h-3.5 w-3.5 text-accent" />
                  <span className="font-display text-[10px] tracking-wider uppercase text-accent">
                    Live Tracker
                  </span>
                </div>
              </div>
            </div>

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

            <FlightTrackerErrorBoundary>
              <div className="h-[calc(100vh-300px)] sm:h-[600px] md:h-[700px] rounded-lg overflow-hidden border border-border">
                <FlightTrackerMap />
              </div>
            </FlightTrackerErrorBoundary>
          </div>
        </main>
      </div>
    </>
  );
};

export default LiveToolsPage;
