import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFlightTracker, Aircraft } from "@/hooks/useFlightTracker";
import { Loader2, RefreshCw, Plane, X, ArrowUp, ArrowDown, Minus, Compass, Gauge, Mountain, Flag, Radio, MapPin, ToggleLeft, ToggleRight, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { majorAirports, MajorAirport } from "@/data/majorAirports";
import { useAirportWeather } from "@/hooks/useAirportWeather";
import { useAirportWeatherBatch, FlightCategory } from "@/hooks/useAirportWeatherBatch";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const createAircraftIcon = (heading: number, onGround: boolean, selected: boolean) => {
  const color = selected ? "#f59e0b" : onGround ? "#6b7280" : "#06b6d4";
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: "aircraft-marker",
    html: `<div style="transform: rotate(${heading}deg); width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      <svg width="${size - 4}" height="${size - 4}" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1">
        <path d="M12 2L8 10H3L5 13H9L12 22L15 13H19L21 10H16L12 2Z"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const BoundsTracker = ({ onBoundsChange }: { onBoundsChange: (b: any) => void }) => {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
};

const FlyToLocation = ({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }, [lat, lng, zoom, map]);
  return null;
};

// Persists the current map center/zoom under a per-theme localStorage key,
// and restores the saved view whenever the active theme changes.
const ThemeViewPersister = ({
  themeKey,
  storageKey,
}: {
  themeKey: string;
  storageKey: (t: string) => string;
}) => {
  const map = useMap();
  const lastThemeRef = useRef(themeKey);

  // Save view on move/zoom end for the current theme.
  useMapEvents({
    moveend: () => {
      try {
        const c = map.getCenter();
        window.localStorage.setItem(
          storageKey(themeKey),
          JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }),
        );
      } catch { /* noop */ }
    },
    zoomend: () => {
      try {
        const c = map.getCenter();
        window.localStorage.setItem(
          storageKey(themeKey),
          JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }),
        );
      } catch { /* noop */ }
    },
  });

  // When the theme changes, restore that theme's saved view (if any).
  useEffect(() => {
    if (lastThemeRef.current === themeKey) return;
    lastThemeRef.current = themeKey;
    try {
      const raw = window.localStorage.getItem(storageKey(themeKey));
      if (!raw) return;
      const v = JSON.parse(raw) as { lat?: number; lng?: number; zoom?: number };
      if (
        typeof v.lat === "number" &&
        typeof v.lng === "number" &&
        typeof v.zoom === "number"
      ) {
        map.setView([v.lat, v.lng], v.zoom, { animate: true });
      }
    } catch { /* noop */ }
  }, [themeKey, map, storageKey]);

  return null;
};

// Track position history for selected aircraft
interface PositionRecord {
  lat: number;
  lng: number;
  alt: number;
  time: Date;
}

const verticalRateArrow = (vr: number) => {
  if (vr > 100) return <ArrowUp className="h-3 w-3 text-green-500" />;
  if (vr < -100) return <ArrowDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

const DetailRow = ({ icon: Icon, label, value, className }: { icon: any; label: string; value: string; className?: string }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs">{label}</span>
    </div>
    <span className={`text-xs font-medium ${className || "text-foreground"}`}>{value}</span>
  </div>
);

const weatherColors: Record<string, string> = {
  VFR: "#22c55e",
  MVFR: "#3b82f6",
  IFR: "#ef4444",
  LIFR: "#ec4899",
};

const createAirportIcon = (category?: FlightCategory) => {
  const color = (category && weatherColors[category]) || "#fbbf24";
  // Always render a strong glow + dark outline so the marker pops against the basemap.
  const glow = `filter: drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px rgba(0,0,0,0.9));`;
  return L.divIcon({
    className: "airport-marker",
    html: `<div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; ${glow}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}" stroke="rgba(0,0,0,0.85)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="6.5" />
        <circle cx="12" cy="12" r="2.2" fill="rgba(0,0,0,0.85)" stroke="none" />
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const FlightTrackerMap = () => {
  const [bounds, setBounds] = useState({ north: 50, south: 25, east: -65, west: -125 });
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<MajorAirport | null>(null);
  const [showAirports, setShowAirports] = useState(true);
  const [positionHistory, setPositionHistory] = useState<PositionRecord[]>([]);
  const selectedIcaoRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "airborne" | "ground">("all");
  const [altRange, setAltRange] = useState<[number, number]>([0, 60000]);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();
  const [historicalTrack, setHistoricalTrack] = useState<[number, number][]>([]);
  const traceAbortRef = useRef<AbortController | null>(null);

  type MapTheme = "voyager" | "light" | "dark";
  const [mapTheme, setMapTheme] = useState<MapTheme>(() => {
    if (typeof window === "undefined") return "voyager";
    const saved = window.localStorage.getItem("simpilot.mapTheme");
    return saved === "light" || saved === "dark" || saved === "voyager" ? saved : "voyager";
  });
  useEffect(() => {
    try { window.localStorage.setItem("simpilot.mapTheme", mapTheme); } catch { /* noop */ }
  }, [mapTheme]);
  const themeTiles: Record<MapTheme, { base: string; labels: string }> = {
    voyager: {
      base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
      labels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    },
    light: {
      base: "https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}{r}.png",
      labels: "https://{s}.basemaps.cartocdn.com/rastertiles/light_only_labels/{z}/{x}/{y}{r}.png",
    },
    dark: {
      base: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png",
      labels: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png",
    },
  };
  const themeLabel: Record<MapTheme, string> = { voyager: "Voyager", light: "Light", dark: "Dark" };

  // Per-theme saved center/zoom (so switching themes preserves the view).
  const themeViewKey = useCallback((t: string) => `simpilot.mapView.${t}`, []);
  const initialView = useMemo(() => {
    const fallback = { center: [39, -98] as [number, number], zoom: 5 };
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(themeViewKey(mapTheme));
      if (!raw) return fallback;
      const v = JSON.parse(raw) as { lat?: number; lng?: number; zoom?: number };
      if (typeof v.lat === "number" && typeof v.lng === "number" && typeof v.zoom === "number") {
        return { center: [v.lat, v.lng] as [number, number], zoom: v.zoom };
      }
    } catch { /* noop */ }
    return fallback;
    // Only compute on mount — runtime theme changes are handled by ThemeViewPersister.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type AttributionMode = "tiny" | "standard" | "hover";
  const [attributionMode, setAttributionMode] = useState<AttributionMode>(() => {
    if (typeof window === "undefined") return "tiny";
    const saved = window.localStorage.getItem("simpilot.mapAttributionMode");
    return saved === "standard" || saved === "hover" || saved === "tiny" ? saved : "tiny";
  });
  useEffect(() => {
    try { window.localStorage.setItem("simpilot.mapAttributionMode", attributionMode); } catch { /* noop */ }
  }, [attributionMode]);
  const cycleAttributionMode = () =>
    setAttributionMode(m => (m === "tiny" ? "standard" : m === "standard" ? "hover" : "tiny"));
  const attributionLabel: Record<AttributionMode, string> = {
    tiny: "Tiny",
    standard: "Standard",
    hover: "Hover",
  };

  const { metar, loading: weatherLoading, error: weatherError } = useAirportWeather(selectedAirport?.icao ?? null);
  const { categories: weatherCategories } = useAirportWeatherBatch();

  const { aircraft, loading, error, lastUpdated, refresh, dataSource, provider } = useFlightTracker(bounds);


  // Update selected aircraft data and track history
  useEffect(() => {
    if (!selectedIcaoRef.current) return;
    const updated = aircraft.find(a => a.icao24 === selectedIcaoRef.current);
    if (updated) {
      setSelectedAircraft(updated);
      setPositionHistory(prev => {
        const last = prev[prev.length - 1];
        if (last && last.lat === updated.latitude && last.lng === updated.longitude) return prev;
        return [...prev, { lat: updated.latitude, lng: updated.longitude, alt: updated.altitude, time: new Date() }].slice(-100);
      });
    }
  }, [aircraft]);

  const handleSelect = useCallback((ac: Aircraft) => {
    selectedIcaoRef.current = ac.icao24;
    setSelectedAircraft(ac);
    setSelectedAirport(null);
    setPositionHistory([{ lat: ac.latitude, lng: ac.longitude, alt: ac.altitude, time: new Date() }]);
    // Fetch the full historical trace so the polyline shows the entire flight,
    // not only points captured after the click.
    traceAbortRef.current?.abort();
    const controller = new AbortController();
    traceAbortRef.current = controller;
    setHistoricalTrack([]);
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/flight-tracker?action=trace&hex=${encodeURIComponent(ac.icao24)}`,
          { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey }, signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { points?: Array<{ lat: number; lon: number }> };
        const pts = (data.points ?? [])
          .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
          .map(p => [p.lat, p.lon] as [number, number]);
        if (!controller.signal.aborted) setHistoricalTrack(pts);
      } catch {
        /* aborted or offline — fall back to live-only trail */
      }
    })();
  }, []);

  const handleSelectAirport = useCallback((ap: MajorAirport) => {
    setSelectedAirport(ap);
    setSelectedAircraft(null);
    selectedIcaoRef.current = null;
    setPositionHistory([]);
  }, []);

  const handleClose = useCallback(() => {
    selectedIcaoRef.current = null;
    setSelectedAircraft(null);
    setSelectedAirport(null);
    setPositionHistory([]);
    setHistoricalTrack([]);
    traceAbortRef.current?.abort();
  }, []);

  const trailPositions = useMemo(
    () => positionHistory.map(p => [p.lat, p.lng] as [number, number]),
    [positionHistory]
  );

  // Combine the historical trace with live points captured since selection.
  const fullTrack = useMemo<[number, number][]>(() => {
    if (historicalTrack.length === 0) return trailPositions;
    const combined: [number, number][] = [...historicalTrack];
    for (const p of trailPositions) combined.push(p);
    return combined;
  }, [historicalTrack, trailPositions]);

  const filteredAircraft = useMemo(() => {
    let list = aircraft;
    if (statusFilter === "airborne") list = list.filter(ac => !ac.onGround);
    else if (statusFilter === "ground") list = list.filter(ac => ac.onGround);
    if (altRange[0] > 0 || altRange[1] < 60000) {
      list = list.filter(ac => {
        const altFeet = ac.altitude * 3.281;
        return altFeet >= altRange[0] && altFeet <= altRange[1];
      });
    }
    return list;
  }, [aircraft, statusFilter, altRange]);

  const markers = useMemo(() => filteredAircraft.map((ac) => (
    <Marker
      key={ac.icao24}
      position={[ac.latitude, ac.longitude]}
      icon={createAircraftIcon(ac.heading, ac.onGround, ac.icao24 === selectedIcaoRef.current)}
      eventHandlers={{ click: () => handleSelect(ac) }}
    />
  )), [filteredAircraft, handleSelect]);

  const altFt = selectedAircraft ? Math.round(selectedAircraft.altitude * 3.281) : 0;
  const spdKts = selectedAircraft ? Math.round(selectedAircraft.velocity * 1.944) : 0;
  const vsFpm = selectedAircraft ? Math.round(selectedAircraft.verticalRate * 196.85) : 0;

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return { aircraft: [], airports: [] };
    const q = searchQuery.toLowerCase();
    const matchedAircraft = aircraft.filter(ac =>
      (ac.callsign || "").toLowerCase().includes(q) ||
      (ac.icao24 || "").toLowerCase().includes(q) ||
      (ac.originCountry || "").toLowerCase().includes(q)
    ).slice(0, 5);
    const matchedAirports = majorAirports.filter(ap =>
      ap.icao.toLowerCase().includes(q) ||
      ap.iata.toLowerCase().includes(q) ||
      ap.name.toLowerCase().includes(q)
    ).slice(0, 5);
    return { aircraft: matchedAircraft, airports: matchedAirports };
  }, [searchQuery, aircraft]);

  const handleSearchSelectAircraft = useCallback((ac: Aircraft) => {
    handleSelect(ac);
    setFlyTo({ lat: ac.latitude, lng: ac.longitude, zoom: 9 });
    setSearchQuery("");
    setSearchFocused(false);
  }, [handleSelect]);

  const handleSearchSelectAirport = useCallback((ap: MajorAirport) => {
    handleSelectAirport(ap);
    setFlyTo({ lat: ap.lat, lng: ap.lng, zoom: 12 });
    setSearchQuery("");
    setSearchFocused(false);
  }, [handleSelectAirport]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = searchFocused && searchQuery.length >= 2 && (searchResults.aircraft.length > 0 || searchResults.airports.length > 0);

  return (
    <div data-attribution-mode={attributionMode} className="relative w-full h-full rounded-lg overflow-hidden border border-border flex">
      {/* Map */}
      <div className="flex-1 relative">
        {/* Search Bar */}
        <div ref={searchRef} className="absolute top-3 left-3 z-[1000] w-[200px] sm:w-[280px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search callsign, ICAO, airport..."
              className="w-full bg-background/90 backdrop-blur-sm border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchFocused(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          {showDropdown && (
            <div className="mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
              {searchResults.aircraft.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                    <Plane className="h-3 w-3 inline mr-1" />Aircraft
                  </div>
                  {searchResults.aircraft.map(ac => (
                    <button
                      key={ac.icao24}
                      onClick={() => handleSearchSelectAircraft(ac)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-medium text-foreground">{ac.callsign || ac.icao24.toUpperCase()}</div>
                        <div className="text-[10px] text-muted-foreground">{ac.originCountry} • {Math.round(ac.altitude * 3.281).toLocaleString()} ft</div>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{ac.icao24.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.airports.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                    <MapPin className="h-3 w-3 inline mr-1" />Airports
                  </div>
                  {searchResults.airports.map(ap => (
                    <button
                      key={ap.icao}
                      onClick={() => handleSearchSelectAirport(ap)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-medium text-foreground">{ap.icao} / {ap.iata}</div>
                        <div className="text-[10px] text-muted-foreground">{ap.name}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{ap.runways.length} rwy</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Toolbar */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1.5">
          {/* Top row: always visible compact controls */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => setShowAirports(v => !v)}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-2 sm:px-3 py-1.5 flex items-center gap-1 sm:gap-1.5 text-xs hover:border-primary/50 transition-colors"
              title="Toggle airport markers"
            >
              <MapPin className="h-3 w-3 text-purple-400" />
              <span className="font-medium hidden sm:inline">Airports</span>
              {showAirports ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg flex items-center text-xs overflow-hidden">
              {(["all", "airborne", "ground"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2 sm:px-2.5 py-1.5 capitalize transition-colors ${
                    statusFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f === "airborne" ? "✈ Air" : "⬇ Gnd"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`md:hidden bg-background/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 text-xs transition-colors ${showFilters ? "border-primary/50 text-primary" : "text-muted-foreground"}`}
              title="More filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-2 sm:px-3 py-1.5 flex items-center gap-1.5 text-xs">
              <Plane className="h-3 w-3 text-primary" />
              <span className="font-medium">{filteredAircraft.length}{(statusFilter !== "all" || altRange[0] > 0 || altRange[1] < 60000) ? `/${aircraft.length}` : ""}</span>
              {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <Button size="sm" variant="outline" onClick={refresh} className="h-7 bg-background/90 backdrop-blur-sm">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {/* Altitude filter - always visible on desktop, toggled on mobile */}
          <div className={`${showFilters ? "flex" : "hidden"} md:flex bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 items-center gap-2 text-xs`}>
            <Mountain className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex flex-col gap-1 min-w-[120px] sm:min-w-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">ALT</span>
                <span className="text-[10px] font-medium text-foreground">
                  {altRange[0] === 0 && altRange[1] === 60000 ? "All" : `${(altRange[0] / 1000).toFixed(0)}k–${(altRange[1] / 1000).toFixed(0)}k ft`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="range" min={0} max={60000} step={1000} value={altRange[0]}
                  onChange={(e) => { const v = Number(e.target.value); setAltRange(prev => [Math.min(v, prev[1] - 1000), prev[1]]); }}
                  className="w-full h-1 accent-primary cursor-pointer"
                />
                <input
                  type="range" min={0} max={60000} step={1000} value={altRange[1]}
                  onChange={(e) => { const v = Number(e.target.value); setAltRange(prev => [prev[0], Math.max(v, prev[0] + 1000)]); }}
                  className="w-full h-1 accent-primary cursor-pointer"
                />
              </div>
            </div>
            {(altRange[0] > 0 || altRange[1] < 60000) && (
              <button onClick={() => setAltRange([0, 60000])} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-destructive/95 backdrop-blur-sm text-destructive-foreground rounded-xl px-4 py-3 text-sm max-w-[360px] shadow-lg border border-destructive/50 flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-destructive-foreground/20 flex items-center justify-center">
              <Radio className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-xs mb-0.5">Flight Data Unavailable</p>
              <p className="text-[11px] opacity-90">{error}</p>
              <Button size="sm" variant="secondary" onClick={refresh} className="mt-2 h-6 text-[11px] px-3">
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading skeleton overlay */}
        {loading && aircraft.length === 0 && !error && (
          <div className="absolute inset-0 z-[999] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-3 bg-card/90 border border-border rounded-2xl p-6 shadow-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Loading Live Flights</p>
                <p className="text-xs text-muted-foreground mt-1">Fetching aircraft data from the network…</p>
              </div>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-2 w-10 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5">
          <div
            className="bg-background/90 backdrop-blur-sm border border-border rounded flex items-center text-[10px] overflow-hidden"
            title="Map basemap theme"
          >
            {(["voyager", "light", "dark"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setMapTheme(t)}
                aria-pressed={mapTheme === t}
                className={`px-2 py-1 transition-colors ${
                  mapTheme === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {themeLabel[t]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={cycleAttributionMode}
            title={`Map credits: ${attributionLabel[attributionMode]} — click to cycle (Tiny → Standard → Hover)`}
            aria-label={`Map attribution display: ${attributionLabel[attributionMode]}. Click to cycle.`}
            className="bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            Credits: {attributionLabel[attributionMode]}
          </button>
          {lastUpdated && (
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-[10px] text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Demo data indicator */}
        {dataSource === "demo" && !loading && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-lg px-4 py-2 text-xs font-medium shadow-lg border border-primary/50 flex items-center gap-2">
            <Plane className="h-3.5 w-3.5" />
            <span>Showing demo flights — live data temporarily unavailable</span>
          </div>
        )}

        {/* Premium provider badge */}
        {provider === "flightaware" && !loading && (
          <div className="absolute top-3 right-3 z-[1000] bg-accent/90 backdrop-blur-sm text-accent-foreground rounded-md px-2.5 py-1 text-[10px] font-display tracking-widest uppercase shadow-lg border border-accent/50 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
            </span>
            FlightAware Premium
          </div>
        )}

        {/* Weather Legend */}
        {showAirports && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Airport Weather</div>
            <div className="flex items-center gap-3">
              {[
                { cat: "VFR", color: "#22c55e" },
                { cat: "MVFR", color: "#3b82f6" },
                { cat: "IFR", color: "#ef4444" },
                { cat: "LIFR", color: "#ec4899" },
              ].map(({ cat, color }) => (
                <div key={cat} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-muted-foreground">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <MapContainer center={initialView.center} zoom={initialView.zoom} style={{ width: "100%", height: "100%" }} zoomControl={true}>
          <TileLayer
            key={`${mapTheme}-base`}
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url={themeTiles[mapTheme].base}
            crossOrigin
          />
          {/* Labels overlay (place names on top of aircraft tiles for legibility) */}
          <TileLayer
            key={`${mapTheme}-labels`}
            attribution=''
            url={themeTiles[mapTheme].labels}
          />
          <BoundsTracker onBoundsChange={setBounds} />
          {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}
          {markers}
          {showAirports && majorAirports.map(ap => (
            <Marker
              key={ap.icao}
              position={[ap.lat, ap.lng]}
              icon={createAirportIcon(weatherCategories[ap.icao] ?? undefined)}
              eventHandlers={{ click: () => handleSelectAirport(ap) }}
            >
              <Popup>
                <div className="text-sm font-bold">{ap.icao} / {ap.iata}</div>
                <div className="text-xs">{ap.name}</div>
              </Popup>
            </Marker>
          ))}
          {fullTrack.length > 1 && (
            <Polyline positions={fullTrack} pathOptions={{ color: "#f59e0b", weight: 2, opacity: 0.8 }} />
          )}
        </MapContainer>
      </div>

      {/* Airport Detail Panel */}
      {selectedAirport && (
        isMobile ? (
          <Drawer open={true} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="pb-0">
                <DrawerTitle className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg text-foreground">{selectedAirport.icao} / {selectedAirport.iata}</div>
                    <div className="text-xs text-muted-foreground font-normal">{selectedAirport.name}</div>
                  </div>
                </DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6">
                <AirportPanelContent airport={selectedAirport} metar={metar} weatherLoading={weatherLoading} weatherError={weatherError} />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <div className="w-[320px] bg-background border-l border-border flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg text-foreground leading-tight">{selectedAirport.icao} / {selectedAirport.iata}</div>
                <div className="text-xs text-muted-foreground">{selectedAirport.name}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AirportPanelContent airport={selectedAirport} metar={metar} weatherLoading={weatherLoading} weatherError={weatherError} />
            </div>
          </div>
        )
      )}

      {/* Aircraft Detail Panel */}
      {selectedAircraft && (
        isMobile ? (
          <Drawer open={true} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="pb-0">
                <DrawerTitle className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg text-foreground">{selectedAircraft.callsign || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground font-normal font-mono">{selectedAircraft.icao24.toUpperCase()}</div>
                  </div>
                </DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6">
                <AircraftPanelContent aircraft={selectedAircraft} altFt={altFt} spdKts={spdKts} vsFpm={vsFpm} positionHistory={positionHistory} />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <div className="w-[320px] bg-background border-l border-border flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg text-foreground leading-tight">{selectedAircraft.callsign || "Unknown"}</div>
                <div className="text-xs text-muted-foreground font-mono">{selectedAircraft.icao24.toUpperCase()}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AircraftPanelContent aircraft={selectedAircraft} altFt={altFt} spdKts={spdKts} vsFpm={vsFpm} positionHistory={positionHistory} />
            </div>
          </div>
        )
      )}
    </div>
  );
};

/* ─── Extracted Panel Content Components ─── */

const AirportPanelContent = ({ airport, metar, weatherLoading, weatherError }: {
  airport: MajorAirport;
  metar: any;
  weatherLoading: boolean;
  weatherError: string | null;
}) => (
  <>
    <div className="grid grid-cols-3 gap-2 py-3">
      <div className="bg-muted/50 rounded-lg p-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-0.5">ELEV</div>
        <div className="text-sm font-bold text-foreground">{airport.elevation.toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground">ft</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-0.5">RWY</div>
        <div className="text-sm font-bold text-foreground">{airport.runways.length}</div>
        <div className="text-[10px] text-muted-foreground">runways</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-0.5">TWR</div>
        <div className="text-sm font-bold text-foreground">{airport.tower}</div>
        <div className="text-[10px] text-muted-foreground">MHz</div>
      </div>
    </div>
    <div className="py-2">
      <div className="bg-muted/50 rounded-lg p-2 font-mono text-xs text-foreground space-y-0.5">
        <div>LAT: {airport.lat.toFixed(4)}°</div>
        <div>LON: {airport.lng.toFixed(4)}°</div>
      </div>
    </div>
    <div className="py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Current Weather (METAR)</div>
      {weatherLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Fetching METAR...
        </div>
      ) : weatherError ? (
        <div className="text-xs text-muted-foreground py-1">{weatherError}</div>
      ) : metar ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              metar.flightCategory === "VFR" ? "bg-green-500/15 text-green-500" :
              metar.flightCategory === "MVFR" ? "bg-blue-500/15 text-blue-500" :
              metar.flightCategory === "IFR" ? "bg-red-500/15 text-red-500" :
              "bg-pink-500/15 text-pink-500"
            }`}>
              {metar.flightCategory}
            </span>
            <span className="text-[10px] text-muted-foreground">Flight Category</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {metar.wind && <div className="bg-muted/50 rounded p-1.5"><div className="text-[9px] text-muted-foreground">WIND</div><div className="text-xs font-medium text-foreground">{metar.wind}</div></div>}
            {metar.visibility && <div className="bg-muted/50 rounded p-1.5"><div className="text-[9px] text-muted-foreground">VIS</div><div className="text-xs font-medium text-foreground">{metar.visibility}</div></div>}
            {metar.ceiling && <div className="bg-muted/50 rounded p-1.5"><div className="text-[9px] text-muted-foreground">CEILING</div><div className="text-xs font-medium text-foreground">{metar.ceiling}</div></div>}
            {metar.temperature && <div className="bg-muted/50 rounded p-1.5"><div className="text-[9px] text-muted-foreground">TEMP</div><div className="text-xs font-medium text-foreground">{metar.temperature}</div></div>}
            {metar.dewpoint && <div className="bg-muted/50 rounded p-1.5"><div className="text-[9px] text-muted-foreground">DEW PT</div><div className="text-xs font-medium text-foreground">{metar.dewpoint}</div></div>}
            {metar.altimeter && <div className="bg-muted/50 rounded p-1.5"><div className="text-[9px] text-muted-foreground">ALTIMETER</div><div className="text-xs font-medium text-foreground">{metar.altimeter}</div></div>}
          </div>
          <div className="bg-muted/30 rounded p-2 font-mono text-[10px] text-muted-foreground break-all leading-relaxed">{metar.raw}</div>
        </div>
      ) : null}
    </div>
    <div className="py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Runways</div>
      <div className="space-y-2">
        {airport.runways.map(rwy => (
          <div key={rwy.id} className="bg-muted/30 border border-border/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground font-mono">{rwy.id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{rwy.surface}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{rwy.length.toLocaleString()} ft</span>
              <span className="text-border">•</span>
              <span>{Math.round(rwy.length * 0.3048).toLocaleString()} m</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min((rwy.length / 16000) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

const AircraftPanelContent = ({ aircraft, altFt, spdKts, vsFpm, positionHistory }: {
  aircraft: Aircraft;
  altFt: number;
  spdKts: number;
  vsFpm: number;
  positionHistory: PositionRecord[];
}) => (
  <>
    <div className="py-2 flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
        aircraft.onGround ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${aircraft.onGround ? "bg-muted-foreground" : "bg-primary animate-pulse"}`} />
        {aircraft.onGround ? "On Ground" : "Airborne"}
      </span>
      <span className="text-[10px] text-muted-foreground">{aircraft.originCountry}</span>
    </div>
    <div className="grid grid-cols-3 gap-2 py-2">
      <div className="bg-muted/50 rounded-lg p-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-0.5">ALT</div>
        <div className="text-sm font-bold text-foreground">{altFt.toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground">ft</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-0.5">GS</div>
        <div className="text-sm font-bold text-foreground">{spdKts}</div>
        <div className="text-[10px] text-muted-foreground">kts</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-0.5">HDG</div>
        <div className="text-sm font-bold text-foreground">{Math.round(aircraft.heading)}°</div>
        <div className="text-[10px] text-muted-foreground">mag</div>
      </div>
    </div>
    <div className="py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Flight Details</div>
      <div className="space-y-0">
        <DetailRow icon={Mountain} label="Altitude" value={`${altFt.toLocaleString()} ft`} />
        <DetailRow icon={Gauge} label="Ground Speed" value={`${spdKts} kts`} />
        <DetailRow icon={Compass} label="Heading" value={`${Math.round(aircraft.heading)}°`} />
        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            {verticalRateArrow(vsFpm)}
            <span className="text-xs">Vertical Rate</span>
          </div>
          <span className={`text-xs font-medium ${vsFpm > 100 ? "text-green-500" : vsFpm < -100 ? "text-red-500" : "text-foreground"}`}>
            {vsFpm > 0 ? "+" : ""}{vsFpm} fpm
          </span>
        </div>
        <DetailRow icon={Flag} label="Country" value={aircraft.originCountry} />
        {aircraft.squawk && <DetailRow icon={Radio} label="Squawk" value={aircraft.squawk} />}
      </div>
      <div className="mt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Position</div>
        <div className="bg-muted/50 rounded-lg p-2 font-mono text-xs text-foreground space-y-0.5">
          <div>LAT: {aircraft.latitude.toFixed(4)}°</div>
          <div>LON: {aircraft.longitude.toFixed(4)}°</div>
        </div>
      </div>
      {positionHistory.length > 1 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Flight Path ({positionHistory.length} points)
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {[...positionHistory].reverse().slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{p.time.toLocaleTimeString()}</span>
                <span>{Math.round(p.alt * 3.281).toLocaleString()} ft</span>
                <span>{p.lat.toFixed(2)}, {p.lng.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </>
);

export default FlightTrackerMap;
