import { useState, useMemo } from "react";
import { Search, Plane, Loader2, ExternalLink, Radio, Building2, Clock, PlaneTakeoff, PlaneLanding, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Flight = {
  ident: string | null;
  operator: string | null;
  registration: string | null;
  aircraft_type: string | null;
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
  duration_min: number | null;
  phase: "completed" | "in_air" | "scheduled";
};

type LookupResult = {
  ident: string;
  ident_kind: "tail" | "callsign" | "unknown";
  resolved_registration: string | null;
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

const formatDateHeader = (iso: string | null) => {
  if (!iso) return "Unknown date";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
};

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

const formatDuration = (min: number | null) => {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

const phaseBadge = (phase: Flight["phase"]) => {
  if (phase === "in_air") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/40 text-[10px] gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Airborne
      </Badge>
    );
  }
  if (phase === "completed") {
    return <Badge variant="secondary" className="text-[10px]">Completed</Badge>;
  }
  return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Scheduled</Badge>;
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
        toast.message("No public records found for that identifier.", {
          description: "It may be privacy-redacted, inactive in the last 14 days, or not a valid tail/callsign.",
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Group flights by phase, then by date within each phase
  const grouped = useMemo(() => {
    if (!result) return null;
    const inAir = result.recent_flights.filter((f) => f.phase === "in_air");
    const upcoming = result.recent_flights
      .filter((f) => f.phase === "scheduled")
      .sort((a, b) => new Date(a.scheduled_out || 0).getTime() - new Date(b.scheduled_out || 0).getTime());
    const completed = result.recent_flights
      .filter((f) => f.phase === "completed")
      .sort((a, b) => new Date(b.actual_off || 0).getTime() - new Date(a.actual_off || 0).getTime());

    const byDate = (rows: Flight[], key: (f: Flight) => string | null) => {
      const map = new Map<string, Flight[]>();
      for (const f of rows) {
        const d = formatDateHeader(key(f));
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(f);
      }
      return [...map.entries()];
    };

    return {
      inAir,
      upcoming: byDate(upcoming, (f) => f.scheduled_out),
      completed: byDate(completed, (f) => f.actual_off),
    };
  }, [result]);

  const renderFlightRow = (f: Flight, i: number) => {
    const dep = f.actual_off || f.scheduled_out;
    const arr = f.actual_on || null;
    const dur = formatDuration(f.duration_min);
    return (
      <div
        key={i}
        className="flex items-center gap-3 py-2 px-2.5 rounded-md hover:bg-muted/30 transition-colors"
      >
        <div className="shrink-0">{phaseBadge(f.phase)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-foreground inline-flex items-center gap-1">
              <PlaneTakeoff className="w-3 h-3 text-muted-foreground" />
              {f.origin || "???"}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono text-foreground inline-flex items-center gap-1">
              <PlaneLanding className="w-3 h-3 text-muted-foreground" />
              {f.destination || "???"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            {f.ident && (
              <span className="font-mono px-1.5 py-0.5 rounded bg-muted/40">{f.ident}</span>
            )}
            {f.aircraft_type && <span>{f.aircraft_type}</span>}
            {f.registration && f.registration !== result?.ident && (
              <span className="font-mono">· {f.registration}</span>
            )}
          </div>
        </div>

        <div className="text-right text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center justify-end gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(dep)}{arr ? ` – ${formatTime(arr)}` : ""}</span>
          </div>
          {dur && <div className="text-[10px] mt-0.5">{dur}</div>}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, rows: [string, Flight[]][]) => {
    if (!rows.length) return null;
    return (
      <div className="mt-3 first:mt-0">
        <h5 className="font-display text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1.5 px-1">
          {title}
        </h5>
        <div className="space-y-2">
          {rows.map(([date, items]) => (
            <div key={date} className="rounded-md border border-border/50 bg-background/30">
              <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-border/40 text-[10px] text-muted-foreground">
                <CalendarDays className="w-3 h-3" />
                {date}
              </div>
              <div className="py-1">{items.map(renderFlightRow)}</div>
            </div>
          ))}
        </div>
      </div>
    );
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
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-lg text-foreground">{result.ident}</span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {result.ident_kind === "callsign" ? "Callsign" : result.ident_kind === "tail" ? "Tail #" : "Identifier"}
                  </Badge>
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
                  {result.resolved_registration && result.resolved_registration !== result.ident && (
                    <> · Reg <span className="font-mono">{result.resolved_registration}</span></>
                  )}
                </p>
                {result.ident_kind === "callsign" && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
                    This is a flight number — rows below show the same route over recent days, often operated by different aircraft.
                  </p>
                )}
              </div>
              {result.is_live && result.live_flight && (
                <div className="text-right text-xs shrink-0">
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
                Flight History (last 14 days)
              </h4>
            </div>
            {result.recent_flights.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No recent flight history available. The aircraft may be privacy-redacted or inactive.
              </p>
            ) : (
              <>
                {grouped?.inAir.length ? (
                  <div className="mt-1">
                    <h5 className="font-display text-[10px] uppercase tracking-widest text-red-400 mb-1.5 px-1">
                      In the Air Now
                    </h5>
                    <div className="rounded-md border border-red-500/30 bg-red-500/5 py-1">
                      {grouped.inAir.map(renderFlightRow)}
                    </div>
                  </div>
                ) : null}
                {grouped && renderSection("Upcoming", grouped.upcoming)}
                {grouped && renderSection("Completed", grouped.completed)}
              </>
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
