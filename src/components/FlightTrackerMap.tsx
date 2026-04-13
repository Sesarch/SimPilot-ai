import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFlightTracker, Aircraft } from "@/hooks/useFlightTracker";
import { Loader2, RefreshCw, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

// Aircraft icon using SVG
const createAircraftIcon = (heading: number, onGround: boolean) => {
  const color = onGround ? "#6b7280" : "#06b6d4";
  return L.divIcon({
    className: "aircraft-marker",
    html: `<div style="transform: rotate(${heading}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1">
        <path d="M12 2L8 10H3L5 13H9L12 22L15 13H19L21 10H16L12 2Z"/>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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

const FlightTrackerMap = () => {
  const [bounds, setBounds] = useState({
    north: 50, south: 25, east: -65, west: -125,
  });

  const { aircraft, loading, error, lastUpdated, refresh } = useFlightTracker(bounds);

  const markers = useMemo(() => aircraft.map((ac) => (
    <Marker
      key={ac.icao24}
      position={[ac.latitude, ac.longitude]}
      icon={createAircraftIcon(ac.heading, ac.onGround)}
    >
      <Popup>
        <div className="text-sm space-y-1 min-w-[200px]">
          <div className="font-bold text-base">{ac.callsign || "Unknown"}</div>
          <div className="text-xs text-muted-foreground">{ac.icao24.toUpperCase()}</div>
          <hr className="my-1" />
          <div><strong>Country:</strong> {ac.originCountry}</div>
          <div><strong>Altitude:</strong> {Math.round(ac.altitude * 3.281).toLocaleString()} ft</div>
          <div><strong>Speed:</strong> {Math.round(ac.velocity * 1.944)} kts</div>
          <div><strong>Heading:</strong> {Math.round(ac.heading)}°</div>
          <div><strong>V/S:</strong> {Math.round(ac.verticalRate * 196.85)} fpm</div>
          <div><strong>Status:</strong> {ac.onGround ? "On Ground" : "Airborne"}</div>
          {ac.squawk && <div><strong>Squawk:</strong> {ac.squawk}</div>}
        </div>
      </Popup>
    </Marker>
  )), [aircraft]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      {/* Status bar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
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

      <MapContainer
        center={[39, -98]}
        zoom={5}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <BoundsTracker onBoundsChange={setBounds} />
        {markers}
      </MapContainer>
    </div>
  );
};

export default FlightTrackerMap;
