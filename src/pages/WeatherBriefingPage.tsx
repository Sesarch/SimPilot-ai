import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWeatherBriefing } from "@/hooks/useWeatherBriefing";
import { Cloud, ArrowLeft, Search, Loader2, MapPin, Plane, AlertTriangle, Wind } from "lucide-react";
import Logo from "@/components/Logo";
import { TrainingChat } from "@/components/TrainingChat";
import SEOHead from "@/components/SEOHead";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import FeatureDisabledPage from "@/components/FeatureDisabledPage";

const WeatherBriefingPage = () => {
  const { settings } = useSiteSettings();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, fetchBriefing } = useWeatherBriefing();
  const [departure, setDeparture] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);

  const briefingPayload = useMemo(() => {
    if (!data) return "";
    const parts: string[] = [];
    parts.push(`DEPARTURE: ${data.departure}`);
    if (data.practiceArea) parts.push(`PRACTICE AREA: ${data.practiceArea}`);
    parts.push(`LOCAL RADIUS: ${data.radius_nm} NM`);
    parts.push("");
    parts.push(`METAR: ${data.metar ?? "(not available)"}`);
    parts.push(`TAF: ${data.taf ?? "(not available)"}`);
    parts.push("");
    parts.push(`SIGMETs (${data.sigmets.length}):`);
    parts.push(data.sigmets.length ? data.sigmets.join("\n---\n") : "(none active in region)");
    parts.push("");
    parts.push(`AIRMETs (${data.airmets.length}):`);
    parts.push(data.airmets.length ? data.airmets.join("\n---\n") : "(none active in region)");
    parts.push("");
    parts.push(`PIREPs within ${data.radius_nm} NM (${data.pireps.length}):`);
    parts.push(data.pireps.length ? data.pireps.join("\n") : "(no recent reports)");
    return parts.join("\n");
  }, [data]);

  const analysisPrompt = useMemo(() => {
    if (!briefingPayload) return "";
    return `You are a Senior CFI delivering a LOCAL pre-flight weather briefing to a student pilot. This is NOT a cross-country brief — analyze ONLY the departure airport and the surrounding ${data?.radius_nm ?? 25} NM practice area. Do NOT explain what a METAR is. Do NOT teach theory. Use a direct, pilot-to-pilot tone.

LIVE DATA (aviationweather.gov):
${briefingPayload}

Produce the briefing in EXACTLY this structure:

**1. Flight Category:** VFR / MVFR / IFR — state which one and quote the ceiling and visibility you used to decide.

**2. Visibility & Clouds:** Current values vs. VFR minimums (3 SM / 1,000 ft for Class E below 10,000; 5 SM / 1,000 ft for Class B/C/D depending on airspace).

**3. Wind Analysis:** Surface wind (direction/speed/gust). Compute the crosswind component for the most likely active runway at ${data?.departure ?? "the field"} and call out gust factor.

**4. Primary Hazards:** Specifically address Turbulence, Icing, Convective activity (from SIGMETs/AIRMETs), and any low-level wind shear. If none are active, say "No active hazards in the region."

**5. Pilot Reports (PIREPs):** Summarize the most recent PIREPs in plain language (e.g. "Skyhawk reported light chop at 3,000 ft 12 NM east"). If none, say "No recent PIREPs within ${data?.radius_nm ?? 25} NM."

**6. Airspace & TFRs:** Class of airspace at ${data?.departure ?? "the field"} and any TFRs you can infer from the data (note if a TFR check on a separate source is required).

**7. CFI Recommendation (Go / No-Go):** One short paragraph — should a student pilot proceed with a local flight${data?.practiceArea ? ` to the ${data.practiceArea} practice area` : ""} right now? Be decisive: "GO", "GO with caveats", or "NO-GO", and state the single most important reason.`;
  }, [briefingPayload, data]);

  if (!settings.weather_enabled) return <FeatureDisabledPage feature="Weather Briefing" />;

  const handleFetch = async () => {
    const id = departure.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(id)) return;
    setShowAnalysis(false);
    await fetchBriefing(id, practiceArea.trim() || undefined);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Cloud className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Pre-Flight Weather Briefing — SimPilot.AI Go/No-Go"
        description="Localized pre-flight weather briefing: live METAR, TAF, SIGMETs, AIRMETs and PIREPs within 25 NM with an AI CFI Go/No-Go recommendation."
        keywords="pre-flight weather briefing, go no-go, METAR, TAF, SIGMET, AIRMET, PIREP, VFR minimums, crosswind component, student pilot weather"
        canonical="/weather-briefing"
        ogImage="/og-ground-school.jpg"
        noIndex
      />

      <nav className="border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" title="SimPilot.AI — AI-Powered Pilot Training Home" className="flex items-center">
              <Logo height={28} />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">
              Pre-Flight Briefing
            </span>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Departure Input */}
        <div className="border-b border-border bg-secondary/30 px-6 py-4 shrink-0">
          <div className="container mx-auto max-w-3xl">
            <h1 className="font-display text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Local Pre-Flight Briefing
            </h1>
            <p className="text-xs text-muted-foreground mb-4">
              Departure airport + 25 NM practice-area radius. Live METAR/TAF, SIGMETs, AIRMETs, PIREPs and an AI CFI Go/No-Go call.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <div>
                <label className="text-[10px] font-display tracking-wider text-muted-foreground uppercase block mb-1">
                  Departure (ICAO)
                </label>
                <input
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetch(); } }}
                  placeholder="e.g. KMYF"
                  maxLength={4}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 font-mono uppercase placeholder:text-muted-foreground placeholder:normal-case placeholder:font-sans"
                />
              </div>
              <div>
                <label className="text-[10px] font-display tracking-wider text-muted-foreground uppercase block mb-1">
                  Practice Area (optional)
                </label>
                <input
                  value={practiceArea}
                  onChange={(e) => setPracticeArea(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetch(); } }}
                  placeholder="e.g. East Practice Area"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleFetch}
                  disabled={!departure.trim() || loading}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Brief
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>
        </div>

        {/* Results */}
        {data && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="container mx-auto max-w-3xl px-6 py-4">
              <div className="text-xs text-muted-foreground mb-4">
                Fetched {new Date(data.fetched_at).toLocaleTimeString()} · {data.departure}
                {data.practiceArea ? ` · ${data.practiceArea}` : ""} · {data.radius_nm} NM radius
              </div>

              {/* Departure card */}
              <div className="bg-gradient-card rounded-xl border border-border p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground">{data.departure}</h3>
                </div>
                {data.metar && (
                  <div className="mb-2">
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">METAR</span>
                    <pre className="text-xs text-foreground font-mono bg-secondary/50 rounded-lg p-3 mt-1 whitespace-pre-wrap break-all">
                      {data.metar}
                    </pre>
                  </div>
                )}
                {data.taf && (
                  <div>
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">TAF</span>
                    <pre className="text-xs text-foreground font-mono bg-secondary/50 rounded-lg p-3 mt-1 whitespace-pre-wrap break-all">
                      {data.taf}
                    </pre>
                  </div>
                )}
                {!data.metar && !data.taf && (
                  <p className="text-xs text-muted-foreground italic">No weather data available for this station</p>
                )}
              </div>

              {/* Hazards summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-gradient-card rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">SIGMETs</span>
                  </div>
                  <p className="text-xs text-foreground">{data.sigmets.length} active</p>
                </div>
                <div className="bg-gradient-card rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">AIRMETs</span>
                  </div>
                  <p className="text-xs text-foreground">{data.airmets.length} active</p>
                </div>
                <div className="bg-gradient-card rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">PIREPs ({data.radius_nm} NM)</span>
                  </div>
                  <p className="text-xs text-foreground">{data.pireps.length} recent</p>
                </div>
              </div>

              {!showAnalysis && (
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-xl hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all mb-6"
                >
                  <Cloud className="w-4 h-4" />
                  Run CFI Go / No-Go Brief
                </button>
              )}

              {showAnalysis && (
                <div className="mb-6">
                  <div className="border border-border rounded-xl overflow-hidden" style={{ height: "560px" }}>
                    <TrainingChat
                      mode="ground_school"
                      placeholder="Ask follow-up questions about today's conditions..."
                      welcomeMessage="Generating your local pre-flight briefing..."
                      initialPrompt={analysisPrompt}
                      topicId={`preflight-${data.departure}-${data.practiceArea ?? "local"}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <Cloud className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                Ready for your pre-flight brief
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your departure airport (and optional practice area). The CFI-AI will pull live METAR, TAF, SIGMETs, AIRMETs and PIREPs within 25 NM, then give you a Go / No-Go call.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherBriefingPage;
