import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFlightTracker, Aircraft } from "@/hooks/useFlightTracker";
import { Loader2, RefreshCw, Plane, X, ArrowUp, ArrowDown, Minus, Compass, Gauge, Mountain, Flag, Radio, MapPin, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { majorAirports, MajorAirport } from "@/data/majorAirports";

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

const createAirportIcon = () => {
  return L.divIcon({
    className: "airport-marker",
    html: `<div style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20M2 12h20M6 6l12 12M18 6L6 18"/>
      </svg>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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

  const { aircraft, loading, error, lastUpdated, refresh } = useFlightTracker(bounds);

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
  }, []);

  const trailPositions = useMemo(
    () => positionHistory.map(p => [p.lat, p.lng] as [number, number]),
    [positionHistory]
  );

  const markers = useMemo(() => aircraft.map((ac) => (
    <Marker
      key={ac.icao24}
      position={[ac.latitude, ac.longitude]}
      icon={createAircraftIcon(ac.heading, ac.onGround, ac.icao24 === selectedIcaoRef.current)}
      eventHandlers={{ click: () => handleSelect(ac) }}
    />
  )), [aircraft, handleSelect]);

  const altFt = selectedAircraft ? Math.round(selectedAircraft.altitude * 3.281) : 0;
  const spdKts = selectedAircraft ? Math.round(selectedAircraft.velocity * 1.944) : 0;
  const vsFpm = selectedAircraft ? Math.round(selectedAircraft.verticalRate * 196.85) : 0;

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return { aircraft: [], airports: [] };
    const q = searchQuery.toLowerCase();
    const matchedAircraft = aircraft.filter(ac =>
      ac.callsign.toLowerCase().includes(q) ||
      ac.icao24.toLowerCase().includes(q) ||
      ac.originCountry.toLowerCase().includes(q)
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
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border flex">
      {/* Map */}
      <div className="flex-1 relative">
        {/* Search Bar */}
        <div ref={searchRef} className="absolute top-3 left-3 z-[1000] w-[280px]">
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
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          <button
            onClick={() => setShowAirports(v => !v)}
            className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs hover:border-primary/50 transition-colors"
            title="Toggle airport markers"
          >
            <MapPin className="h-3 w-3 text-purple-400" />
            <span className="font-medium">Airports</span>
            {showAirports ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
            <Plane className="h-3 w-3 text-primary" />
            <span className="font-medium">{aircraft.length} aircraft</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </div>
          <Button size="sm" variant="outline" onClick={refresh} className="h-7 bg-background/90 backdrop-blur-sm">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {error && (
          <div className="absolute top-3 left-3 z-[1000] bg-destructive/90 text-destructive-foreground rounded-lg px-3 py-1.5 text-xs max-w-[300px]">
            {error}
          </div>
        )}

        {lastUpdated && (
          <div className="absolute bottom-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-[10px] text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
      )}

      {/* Airport Sidebar Panel */}
      {selectedAirport && (
        <div className="w-[320px] bg-background border-l border-border flex flex-col overflow-hidden shrink-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div>
              <div className="font-bold text-lg text-foreground leading-tight">
                {selectedAirport.icao} / {selectedAirport.iata}
              </div>
              <div className="text-xs text-muted-foreground">{selectedAirport.name}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="px-4 grid grid-cols-3 gap-2 py-3">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">ELEV</div>
              <div className="text-sm font-bold text-foreground">{selectedAirport.elevation.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">ft</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">RWY</div>
              <div className="text-sm font-bold text-foreground">{selectedAirport.runways.length}</div>
              <div className="text-[10px] text-muted-foreground">runways</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">TWR</div>
              <div className="text-sm font-bold text-foreground">{selectedAirport.tower}</div>
              <div className="text-[10px] text-muted-foreground">MHz</div>
            </div>
          </div>

          {/* Position */}
          <div className="px-4 py-2">
            <div className="bg-muted/50 rounded-lg p-2 font-mono text-xs text-foreground space-y-0.5">
              <div>LAT: {selectedAirport.lat.toFixed(4)}°</div>
              <div>LON: {selectedAirport.lng.toFixed(4)}°</div>
            </div>
          </div>

          {/* Runways */}
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Runways</div>
            <div className="space-y-2">
              {selectedAirport.runways.map(rwy => (
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
                  {/* Visual runway bar */}
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.min((rwy.length / 16000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        <MapContainer center={[39, -98]} zoom={5} style={{ width: "100%", height: "100%" }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <BoundsTracker onBoundsChange={setBounds} />
          {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}
          {markers}
          {showAirports && majorAirports.map(ap => (
            <Marker
              key={ap.icao}
              position={[ap.lat, ap.lng]}
              icon={createAirportIcon()}
              eventHandlers={{ click: () => handleSelectAirport(ap) }}
            >
              <Popup>
                <div className="text-sm font-bold">{ap.icao} / {ap.iata}</div>
                <div className="text-xs">{ap.name}</div>
              </Popup>
            </Marker>
          ))}
          {trailPositions.length > 1 && (
            <Polyline positions={trailPositions} pathOptions={{ color: "#f59e0b", weight: 2, opacity: 0.7, dashArray: "6 4" }} />
          )}
        </MapContainer>
      </div>

      {/* Sidebar Panel */}
      {selectedAircraft && (
        <div className="w-[320px] bg-background border-l border-border flex flex-col overflow-hidden shrink-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div>
              <div className="font-bold text-lg text-foreground leading-tight">
                {selectedAircraft.callsign || "Unknown"}
              </div>
              <div className="text-xs text-muted-foreground font-mono">{selectedAircraft.icao24.toUpperCase()}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Badge */}
          <div className="px-4 py-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              selectedAircraft.onGround
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${selectedAircraft.onGround ? "bg-muted-foreground" : "bg-primary animate-pulse"}`} />
              {selectedAircraft.onGround ? "On Ground" : "Airborne"}
            </span>
            <span className="text-[10px] text-muted-foreground">{selectedAircraft.originCountry}</span>
          </div>

          {/* Quick Stats */}
          <div className="px-4 grid grid-cols-3 gap-2 py-2">
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
              <div className="text-sm font-bold text-foreground">{Math.round(selectedAircraft.heading)}°</div>
              <div className="text-[10px] text-muted-foreground">mag</div>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Flight Details</div>
            <div className="space-y-0">
              <DetailRow icon={Mountain} label="Altitude" value={`${altFt.toLocaleString()} ft`} />
              <DetailRow icon={Gauge} label="Ground Speed" value={`${spdKts} kts`} />
              <DetailRow icon={Compass} label="Heading" value={`${Math.round(selectedAircraft.heading)}°`} />
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {verticalRateArrow(vsFpm)}
                  <span className="text-xs">Vertical Rate</span>
                </div>
                <span className={`text-xs font-medium ${vsFpm > 100 ? "text-green-500" : vsFpm < -100 ? "text-red-500" : "text-foreground"}`}>
                  {vsFpm > 0 ? "+" : ""}{vsFpm} fpm
                </span>
              </div>
              <DetailRow icon={Flag} label="Country" value={selectedAircraft.originCountry} />
              {selectedAircraft.squawk && (
                <DetailRow icon={Radio} label="Squawk" value={selectedAircraft.squawk} />
              )}
            </div>

            {/* Position */}
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Position</div>
              <div className="bg-muted/50 rounded-lg p-2 font-mono text-xs text-foreground space-y-0.5">
                <div>LAT: {selectedAircraft.latitude.toFixed(4)}°</div>
                <div>LON: {selectedAircraft.longitude.toFixed(4)}°</div>
              </div>
            </div>

            {/* Trail Info */}
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
        </div>
      )}
    </div>
  );
};

export default FlightTrackerMap;
