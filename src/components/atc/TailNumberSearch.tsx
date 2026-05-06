import { useState } from "react";
import { Search, Plane, Loader2, ExternalLink, Radio, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Flight = {
  ident: string | null;
  operator: string | null;
  origin: string | null;
  origin_name: string | null;
  destination: string | null;
  destination_name: string | null;
  scheduled_out: string | null;
  actual_out: string | null;
  actual_off: string | null;
  actual_on: string | null;
  actual_in: string | null;
  status: string | null;
  progress_percent: number | null;
};

type LookupResult = {
  ident: string;
  is_live: boolean;
  live_flight: {
    ident: string;
    origin: string | null;
    destination: string | null;
    progress_percent: number | null;
  } | null;
  aircraft: {
    ident: string;
    type: string | null;
    description: string | null;
    manufacturer?: string | null;
    model?: string | null;
    owner?: string | null;
    engine_count?: number | null;
    engine_type?: string | null;
  };
  photo: {
    url: string;
    thumbnail: string;
    photographer?: string;
    link?: string;
  } | null;
  recent_flights: Flight[];
};

const TailNumberSearch = () => {
  const [tail, setTail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  const lookup = async () => {
    const q = tail.trim().toUpperCase();
    if (q.length < 2) {
      toast.error("Enter at least 2 characters (e.g. N172SP, UAL123)");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(
        `${supabaseUrl}/functions/v1/aircraft-lookup?ident=${encodeURIComponent(q)}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || anon}`,
            apikey: anon,
          },
        }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Lookup failed");
      setResult(data);
      if (!data.aircraft?.type && data.recent_flights.length === 0 && !data.photo) {
        toast.message("No public records found for that identifier.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-primary shrink-0" />
        <h3 className="font-display text-sm tracking-wider uppercase text-foreground">
          Tail / Callsign Lookup
        </h3>
      </div>
      <div className="flex gap-2">
        <Input
          value={tail}
          onChange={(e) => setTail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="N172SP, UAL123, G-EUUU…"
          className="font-mono uppercase"
          maxLength={10}
        />
        <Button onClick={lookup} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          {/* Photo */}
          {result.photo ? (
            <div className="relative w-full aspect-video bg-muted">
              <img
                src={result.photo.url}
                alt={`${result.ident} — ${result.aircraft.description || "aircraft"}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {result.photo.photographer && result.photo.link && (
                <a
                  href={result.photo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 text-[10px] bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-muted-foreground hover:text-foreground"
                >
                  © {result.photo.photographer} · Planespotters.net
                </a>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground">
              <Plane className="w-12 h-12 opacity-30" />
            </div>
          )}

          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg text-foreground">{result.ident}</span>
                  {result.is_live ? (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />
                      LIVE
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Not airborne</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.aircraft.description || result.aircraft.type || "Aircraft type unknown"}
                </p>
              </div>
              {result.is_live && result.live_flight && (
                <div className="text-right text-xs">
                  <div className="font-mono text-foreground">
                    {result.live_flight.origin || "?"} → {result.live_flight.destination || "?"}
                  </div>
                  {result.live_flight.progress_percent != null && (
                    <div className="text-muted-foreground">{result.live_flight.progress_percent}% complete</div>
                  )}
                </div>
              )}
            </div>

            {(result.aircraft.manufacturer || result.aircraft.owner || result.aircraft.engine_count) && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {result.aircraft.manufacturer && (
                  <div>
                    <span className="text-muted-foreground">Manufacturer: </span>
                    <span className="text-foreground">{result.aircraft.manufacturer}</span>
                  </div>
                )}
                {result.aircraft.owner && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground">{result.aircraft.owner}</span>
                  </div>
                )}
                {result.aircraft.engine_count && (
                  <div>
                    <span className="text-muted-foreground">Engines: </span>
                    <span className="text-foreground">{result.aircraft.engine_count} {result.aircraft.engine_type || ""}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent flights */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                Recent Flights
              </h4>
            </div>
            {result.recent_flights.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No recent flight history available.</p>
            ) : (
              <div className="space-y-1.5">
                {result.recent_flights.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-foreground shrink-0">
                        {f.ident || result.ident}
                      </span>
                      <span className="font-mono text-muted-foreground truncate">
                        {f.origin || "???"} → {f.destination || "???"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(f.actual_off || f.scheduled_out)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 pb-3 text-[10px] text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Data: FlightAware AeroAPI{result.photo ? " · Photo: Planespotters.net" : ""}
          </div>
        </div>
      )}
    </div>
  );
};

export default TailNumberSearch;
