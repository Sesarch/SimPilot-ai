import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useSimBridge
 * --------------------------------------------------------------------------
 * Connects to the local SimPilot Bridge sidecar (Node.js app the user installs
 * on their PC) over WebSocket at ws://localhost:8080. The bridge translates
 * MSFS 2024 SimConnect data and X-Plane 12 UDP into a normalized JSON
 * contract:
 *
 *   { alt:number, hdg:number, spd:number, com1:string,
 *     com2?:string, squawk?:string, on_ground?:boolean,
 *     ground_speed?:number, isSimRunning?:boolean }
 *
 * The hook also detects flight phase transitions:
 *   - "flight-started"  when ground_speed crosses above 30 kt
 *   - "flight-finished" when ground_speed stays at 0 for > 10 seconds
 *
 * These fire as CustomEvents on `window` so the auto-log + Flight Deck panels
 * can react without prop-drilling.
 */

export type SimSource = "msfs2024" | "xplane12";

export interface SimBridgeTelemetry {
  alt: number;          // ft MSL
  hdg: number;          // deg magnetic
  spd: number;          // kt IAS
  com1: string;         // "118.300"
  com2?: string;
  squawk?: string;
  on_ground?: boolean;
  ground_speed?: number; // kt
  isSimRunning?: boolean;
  lat?: number;          // deg
  lon?: number;          // deg
  aircraft_title?: string;
  pmdg?: {
    variant: string;
    mcp_altitude: number;
    mcp_heading: number;
    mcp_ias: number;
    flaps_handle_index: number;
    flaps_handle_percent: number;
    autopilot_master: boolean;
    autothrottle_active: boolean;
  };
}

export type SimBridgeStatus = "disconnected" | "connecting" | "connected";

export const SIM_FLIGHT_STARTED_EVENT = "simpilot:flight-started";
export const SIM_FLIGHT_FINISHED_EVENT = "simpilot:flight-finished";

/**
 * PTT (Push-To-Talk) events emitted by the SimPilot Bridge desktop helper.
 * The bridge captures a system-wide hotkey (so it works while MSFS/X-Plane is
 * focused) and forwards both edges of the key press over the WebSocket as:
 *
 *   { type: "ptt", phase: "down", key: "Space", t: 1735012345678 }
 *   { type: "ptt", phase: "up",   key: "Space", t: 1735012346001 }
 *
 * We re-broadcast them on `window` so the radio/Comm UI can implement
 * "Release-to-Transmit": start capturing audio on `down`, stop + send on `up`.
 */
export const PTT_DOWN_EVENT = "simpilot:ptt-down";
export const PTT_UP_EVENT = "simpilot:ptt-up";

export interface PttEventDetail {
  /** Bridge-reported timestamp (ms since epoch). Falls back to Date.now() if absent. */
  t: number;
  /** OS-level key the bridge captured, e.g. "Space", "ControlLeft". May be undefined for legacy bridges. */
  key?: string;
  /** Source of the event so the UI can show "Bridge hotkey" vs "in-tab key". */
  source: "bridge" | "browser";
}

export interface PmdgEvent {
  /** ms since epoch */
  t: number;
  /** seconds since flight start (filled in by useAutoLogbook when finalizing) */
  t_rel?: number;
  /** human label, e.g. "A/P engaged", "Flaps 5", "MCP ALT → 10000" */
  label: string;
  /** machine kind so the AI/UI can group */
  kind: "ap" | "at" | "flaps" | "mcp_alt" | "mcp_hdg" | "mcp_ias";
  /** snapshot of flight state at the moment of the event */
  alt?: number;
  spd?: number;
  ground_speed?: number;
  on_ground?: boolean;
  /** event-specific value */
  value?: number | string | boolean;
}

export interface SimFlightStartedDetail {
  at: number;
  source: SimSource | "unknown";
  lat?: number;
  lon?: number;
  aircraft_title?: string;
  pmdg_variant?: string;
}
export interface SimFlightFinishedDetail {
  at: number;
  startedAt: number | null;
  durationMs: number | null;
  source: SimSource | "unknown";
  lat?: number;
  lon?: number;
  aircraft_title?: string;
  pmdg_variant?: string;
  pmdg_events?: PmdgEvent[];
}

const BRIDGE_URL = "ws://localhost:8080";
const RECONNECT_MS = 5000;
const TAKEOFF_GS_KT = 30;
const STOP_DWELL_MS = 10_000;

interface UseSimBridgeOptions {
  enabled?: boolean;
  source?: SimSource;
}

export function useSimBridge({ enabled = false, source = "msfs2024" }: UseSimBridgeOptions = {}) {
  const [status, setStatus] = useState<SimBridgeStatus>("disconnected");
  const [telemetry, setTelemetry] = useState<SimBridgeTelemetry | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [isFlightActive, setIsFlightActive] = useState(false);
  // Bridge self-reports its version in the auth-ok handshake (>=1.0.1).
  // Older bridges return null; the UI treats null as "version unknown" and
  // hides the update-available badge in that case.
  const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const flightActiveRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const sourceRef = useRef<SimSource>(source);
  const lastPosRef = useRef<{ lat?: number; lon?: number }>({});
  // PMDG event timeline + last-known PMDG snapshot for change detection
  const pmdgEventsRef = useRef<PmdgEvent[]>([]);
  const lastPmdgRef = useRef<SimBridgeTelemetry["pmdg"] | null>(null);
  const aircraftTitleRef = useRef<string | undefined>(undefined);
  const pmdgVariantRef = useRef<string | undefined>(undefined);
  const lastTelemetryRef = useRef<SimBridgeTelemetry | null>(null);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const recordPmdgEvent = useCallback(
    (evt: Omit<PmdgEvent, "t" | "alt" | "spd" | "ground_speed" | "on_ground">) => {
      if (!flightActiveRef.current) return;
      const t = lastTelemetryRef.current;
      pmdgEventsRef.current.push({
        t: Date.now(),
        alt: t?.alt,
        spd: t?.spd,
        ground_speed: t?.ground_speed,
        on_ground: t?.on_ground,
        ...evt,
      });
      if (pmdgEventsRef.current.length > 500) {
        pmdgEventsRef.current.splice(0, pmdgEventsRef.current.length - 500);
      }
    },
    [],
  );

  const detectPmdgChanges = useCallback(
    (next: SimBridgeTelemetry["pmdg"] | undefined) => {
      if (!next) {
        lastPmdgRef.current = null;
        return;
      }
      const prev = lastPmdgRef.current;
      lastPmdgRef.current = next;
      if (!prev) return;
      if (prev.autopilot_master !== next.autopilot_master) {
        recordPmdgEvent({
          kind: "ap",
          label: `A/P ${next.autopilot_master ? "engaged" : "disengaged"}`,
          value: next.autopilot_master,
        });
      }
      if (prev.autothrottle_active !== next.autothrottle_active) {
        recordPmdgEvent({
          kind: "at",
          label: `A/T ${next.autothrottle_active ? "engaged" : "disengaged"}`,
          value: next.autothrottle_active,
        });
      }
      if (prev.flaps_handle_index !== next.flaps_handle_index) {
        recordPmdgEvent({
          kind: "flaps",
          label: `Flaps ${next.flaps_handle_index}`,
          value: next.flaps_handle_index,
        });
      }
      if (Math.abs((prev.mcp_altitude || 0) - (next.mcp_altitude || 0)) >= 100) {
        recordPmdgEvent({
          kind: "mcp_alt",
          label: `MCP ALT → ${Math.round(next.mcp_altitude)}`,
          value: Math.round(next.mcp_altitude),
        });
      }
    },
    [recordPmdgEvent],
  );

  const handleFlightPhase = useCallback((gs: number | undefined) => {
    if (gs == null || Number.isNaN(gs)) return;

    if (!flightActiveRef.current && gs > TAKEOFF_GS_KT) {
      flightActiveRef.current = true;
      startedAtRef.current = Date.now();
      pmdgEventsRef.current = [];
      lastPmdgRef.current = null;
      setIsFlightActive(true);
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      window.dispatchEvent(
        new CustomEvent<SimFlightStartedDetail>(SIM_FLIGHT_STARTED_EVENT, {
          detail: {
            at: startedAtRef.current,
            source: sourceRef.current,
            lat: lastPosRef.current.lat,
            lon: lastPosRef.current.lon,
            aircraft_title: aircraftTitleRef.current,
            pmdg_variant: pmdgVariantRef.current,
          },
        }),
      );
      return;
    }

    if (flightActiveRef.current) {
      if (gs <= 0.5) {
        if (stopTimerRef.current == null) {
          stopTimerRef.current = window.setTimeout(() => {
            const finishedAt = Date.now();
            const startedAt = startedAtRef.current;
            const eventsWithRel: PmdgEvent[] = pmdgEventsRef.current.map((e) => ({
              ...e,
              t_rel: startedAt ? Math.max(0, Math.round((e.t - startedAt) / 1000)) : undefined,
            }));
            window.dispatchEvent(
              new CustomEvent<SimFlightFinishedDetail>(SIM_FLIGHT_FINISHED_EVENT, {
                detail: {
                  at: finishedAt,
                  startedAt,
                  durationMs: startedAt ? finishedAt - startedAt : null,
                  source: sourceRef.current,
                  lat: lastPosRef.current.lat,
                  lon: lastPosRef.current.lon,
                  aircraft_title: aircraftTitleRef.current,
                  pmdg_variant: pmdgVariantRef.current,
                  pmdg_events: eventsWithRel.length ? eventsWithRel : undefined,
                },
              }),
            );
            flightActiveRef.current = false;
            startedAtRef.current = null;
            stopTimerRef.current = null;
            pmdgEventsRef.current = [];
            lastPmdgRef.current = null;
            setIsFlightActive(false);
          }, STOP_DWELL_MS);
        }
      } else if (stopTimerRef.current != null) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setStatus("disconnected");
      setTelemetry(null);
      setBridgeVersion(null);
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");

      try {
        const ws = new WebSocket(BRIDGE_URL);
        wsRef.current = ws;

        ws.onopen = async () => {
          if (cancelled) return;
          // Bridge requires {type:"auth",token} as the FIRST frame within 2s.
          // We fetch the current Supabase access token and send it before
          // anything else; the bridge will reply with auth-ok or close 4401.
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) {
              setStatus("disconnected");
              try { ws.close(4401, "no session"); } catch {}
              return;
            }
            ws.send(JSON.stringify({ type: "auth", token }));
            // setSource is queued; bridge ignores it until auth-ok, but it's
            // safe to send because our message handler holds it in the buffer.
            ws.send(JSON.stringify({ type: "setSource", source: sourceRef.current }));
          } catch {
            try { ws.close(); } catch {}
          }
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const raw = JSON.parse(event.data);

            // Bridge control frames
            if (raw && typeof raw.type === "string") {
              if (raw.type === "auth-ok") {
                setStatus("connected");
                if (typeof raw.bridge_version === "string") {
                  setBridgeVersion(raw.bridge_version);
                }
                return;
              }
              if (raw.type === "auth-error") {
                setStatus("disconnected");
                return;
              }
              // PTT key edge from the desktop bridge's global hotkey capture.
              // Bridge sends both phases so the radio UI can implement
              // Release-to-Transmit while MSFS has OS focus.
              if (raw.type === "ptt" && (raw.phase === "down" || raw.phase === "up")) {
                const detail: PttEventDetail = {
                  t: typeof raw.t === "number" ? raw.t : Date.now(),
                  key: typeof raw.key === "string" ? raw.key : undefined,
                  source: "bridge",
                };
                window.dispatchEvent(
                  new CustomEvent<PttEventDetail>(
                    raw.phase === "down" ? PTT_DOWN_EVENT : PTT_UP_EVENT,
                    { detail },
                  ),
                );
                return;
              }
            }

            const lat =
              raw.lat != null ? Number(raw.lat) : raw.latitude != null ? Number(raw.latitude) : undefined;
            const lon =
              raw.lon != null ? Number(raw.lon) : raw.longitude != null ? Number(raw.longitude) : undefined;
            const t: SimBridgeTelemetry = {
              alt: Number(raw.alt ?? raw.altitude ?? raw.Altitude ?? 0),
              hdg: Number(raw.hdg ?? raw.heading ?? raw.Heading ?? 0),
              spd: Number(raw.spd ?? raw.speed ?? raw.airspeed ?? 0),
              com1: String(raw.com1 ?? raw.com1_freq ?? raw.Com1_Freq ?? "---.---"),
              com2: raw.com2 ?? raw.com2_freq ?? raw.Com2_Freq ?? undefined,
              squawk: raw.squawk ?? raw.Squawk ?? undefined,
              on_ground: raw.on_ground ?? raw.OnGround ?? undefined,
              ground_speed:
                raw.ground_speed != null
                  ? Number(raw.ground_speed)
                  : raw.gs != null
                    ? Number(raw.gs)
                    : undefined,
              isSimRunning: raw.isSimRunning ?? raw.sim_running ?? undefined,
              lat,
              lon,
              aircraft_title: raw.aircraft_title ?? undefined,
              pmdg: raw.pmdg ?? undefined,
            };
            if (lat != null && !Number.isNaN(lat) && lon != null && !Number.isNaN(lon)) {
              lastPosRef.current = { lat, lon };
            }
            if (t.aircraft_title) aircraftTitleRef.current = t.aircraft_title;
            if (t.pmdg?.variant) pmdgVariantRef.current = t.pmdg.variant;
            lastTelemetryRef.current = t;
            setTelemetry(t);
            setLastUpdate(Date.now());
            handleFlightPhase(t.ground_speed ?? t.spd);
            detectPmdgChanges(t.pmdg);
          } catch {
            // ignore malformed frame
          }
        };

        ws.onerror = () => {
          // close handler will manage reconnect
        };

        ws.onclose = () => {
          if (cancelled) return;
          setStatus("disconnected");
          setBridgeVersion(null);
          reconnectRef.current = window.setTimeout(connect, RECONNECT_MS);
        };
      } catch {
        setStatus("disconnected");
        reconnectRef.current = window.setTimeout(connect, RECONNECT_MS);
      }
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, cleanup, handleFlightPhase, detectPmdgChanges]);

  // Push source changes to an already-open bridge.
  useEffect(() => {
    if (status === "connected" && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "setSource", source }));
      } catch {
        // ignore
      }
    }
  }, [source, status]);

  /**
   * Tell the bridge which OS key to bind for the global PTT hotkey.
   * Pass an empty string to unbind. The bridge will start emitting
   * { type:"ptt", phase:"down"|"up", key } frames once bound.
   */
  const setPttHotkey = useCallback((key: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify({ type: "setPttHotkey", key }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    status,
    telemetry,
    lastUpdate,
    isFlightActive,
    isConnected: status === "connected",
    bridgeVersion,
    setPttHotkey,
  };
}
