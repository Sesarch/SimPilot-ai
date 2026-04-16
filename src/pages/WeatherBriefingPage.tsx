import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useWeatherBriefing, WeatherData } from "@/hooks/useWeatherBriefing";
import { Cloud, ArrowLeft, Search, Loader2, MapPin, Plus, X, Plane } from "lucide-react";
import { TrainingChat } from "@/components/TrainingChat";
import SEOHead from "@/components/SEOHead";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import FeatureDisabledPage from "@/components/FeatureDisabledPage";

const WeatherBriefingPage = () => {
  const { settings } = useSiteSettings();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { data, loading, error, fetchWeather } = useWeatherBriefing();
  const [stationInput, setStationInput] = useState("");
  const [routeStations, setRouteStations] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (!settings.weather_enabled) return <FeatureDisabledPage feature="Weather Briefing" />;

  const addStation = () => {
    const id = stationInput.trim().toUpperCase();
    if (id && /^[A-Z0-9]{3,4}$/.test(id) && !routeStations.includes(id)) {
      setRouteStations((prev) => [...prev, id]);
      setStationInput("");
    }
  };

  const removeStation = (id: string) => {
    setRouteStations((prev) => prev.filter((s) => s !== id));
    if (showAnalysis) setShowAnalysis(false);
  };

  const handleFetch = async () => {
    if (routeStations.length === 0) return;
    setShowAnalysis(false);
    await fetchWeather(routeStations);
  };

  const weatherSummary = useMemo(() => {
    if (!data) return "";
    const parts: string[] = [];
    for (const [id, wx] of Object.entries(data.stations)) {
      parts.push(`--- ${id} ---`);
      if (wx.metar) parts.push(`METAR: ${wx.metar}`);
      if (wx.taf) parts.push(`TAF: ${wx.taf}`);
      parts.push("");
    }
    return parts.join("\n");
  }, [data]);

  const analysisPrompt = useMemo(() => {
    if (!weatherSummary) return "";
    const route = routeStations.join(" → ");
    return `I'm planning a VFR flight along this route: ${route}. Here is the current weather data I just pulled:\n\n${weatherSummary}\n\nPlease analyze this weather for my flight. For each station:\n1. Decode the METAR in plain English (winds, visibility, ceiling, altimeter, remarks)\n2. Decode the TAF and highlight any significant changes\n3. Identify any hazards (low ceilings, gusty winds, convection, icing, IFR/MVFR conditions)\n\nThen give me an overall route weather assessment:\n- Is this a VFR go or no-go? Why?\n- Any alternates I should consider?\n- Best time window for departure based on the TAFs?\n- Any PIREPs or AIRMETs I should look for?\n\nUse plain English but include the raw data for reference. Be thorough like a CFI giving a pre-flight weather brief.`;
  }, [weatherSummary, routeStations]);

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
        title="Weather Briefing — SimPilot.AI Flight Planning"
        description="Get live METAR and TAF weather data with AI-powered analysis for your flight route. Practice weather briefings with your CFI-AI instructor."
        keywords="aviation weather briefing, METAR decoder, TAF analysis, flight planning weather, VFR weather minimums, aviation weather AI"
        canonical="/weather-briefing"
        ogImage="/og-ground-school.jpg"
      />

      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
                SIM<span className="text-accent">PILOT</span>.AI
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">
              Weather Briefing
            </span>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Station Input */}
        <div className="border-b border-border bg-secondary/30 px-6 py-4 shrink-0">
          <div className="container mx-auto max-w-3xl">
            <h1 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Route Weather Briefing
            </h1>
            <p className="text-xs text-muted-foreground mb-4">
              Enter airport identifiers along your route to fetch live METAR/TAF data, then get an AI-powered weather analysis.
            </p>

            {/* Station chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {routeStations.map((id, i) => (
                <div key={id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-display font-semibold tracking-wider">
                    <MapPin className="w-3 h-3" />
                    {id}
                    <button onClick={() => removeStation(id)} className="ml-1 hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              ))}
              {routeStations.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No stations added yet</span>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={stationInput}
                onChange={(e) => setStationInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addStation(); }
                }}
                placeholder="e.g. KJFK, KORD"
                maxLength={4}
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 font-mono uppercase placeholder:text-muted-foreground placeholder:normal-case placeholder:font-sans"
              />
              <button
                onClick={addStation}
                disabled={!stationInput.trim()}
                className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleFetch}
                disabled={routeStations.length === 0 || loading}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Fetch
              </button>
            </div>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>
        </div>

        {/* Results */}
        {data && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="container mx-auto max-w-3xl px-6 py-4">
              <div className="text-xs text-muted-foreground mb-4">
                Fetched at {new Date(data.fetched_at).toLocaleTimeString()}
              </div>

              {/* Raw weather cards */}
              <div className="space-y-3 mb-6">
                {Object.entries(data.stations).map(([id, wx]) => (
                  <div key={id} className="bg-gradient-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">{id}</h3>
                    </div>
                    {wx.metar && (
                      <div className="mb-2">
                        <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">METAR</span>
                        <pre className="text-xs text-foreground font-mono bg-secondary/50 rounded-lg p-3 mt-1 whitespace-pre-wrap break-all">
                          {wx.metar}
                        </pre>
                      </div>
                    )}
                    {wx.taf && (
                      <div>
                        <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">TAF</span>
                        <pre className="text-xs text-foreground font-mono bg-secondary/50 rounded-lg p-3 mt-1 whitespace-pre-wrap break-all">
                          {wx.taf}
                        </pre>
                      </div>
                    )}
                    {!wx.metar && !wx.taf && (
                      <p className="text-xs text-muted-foreground italic">No weather data available for this station</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Analyze button */}
              {!showAnalysis && (
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-xl hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all mb-6"
                >
                  <Cloud className="w-4 h-4" />
                  Analyze Weather with AI
                </button>
              )}

              {/* AI Analysis Chat */}
              {showAnalysis && (
                <div className="mb-6">
                  <div className="border border-border rounded-xl overflow-hidden" style={{ height: "500px" }}>
                    <TrainingChat
                      mode="ground_school"
                      placeholder="Ask follow-up questions about the weather..."
                      welcomeMessage="Analyzing your route weather data..."
                      initialPrompt={analysisPrompt}
                      topicId={`weather-${routeStations.join("-")}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <Cloud className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                Plan Your Weather Brief
              </h2>
              <p className="text-sm text-muted-foreground">
                Add airport identifiers along your route above, then fetch live METAR and TAF data. 
                The AI will help you analyze conditions and make go/no-go decisions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherBriefingPage;
