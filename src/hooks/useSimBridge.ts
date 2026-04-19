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
}

export type SimBridgeStatus = "disconnected" | "connecting" | "connected";

export const SIM_FLIGHT_STARTED_EVENT = "simpilot:flight-started";
export const SIM_FLIGHT_FINISHED_EVENT = "simpilot:flight-finished";

export interface SimFlightStartedDetail {
  at: number;
  source: SimSource | "unknown";
  lat?: number;
  lon?: number;
}
export interface SimFlightFinishedDetail {
  at: number;
  startedAt: number | null;
  durationMs: number | null;
  source: SimSource | "unknown";
  lat?: number;
  lon?: number;
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const flightActiveRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const sourceRef = useRef<SimSource>(source);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const handleFlightPhase = useCallback((gs: number | undefined) => {
    if (gs == null || Number.isNaN(gs)) return;

    if (!flightActiveRef.current && gs > TAKEOFF_GS_KT) {
      flightActiveRef.current = true;
      startedAtRef.current = Date.now();
      setIsFlightActive(true);
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      window.dispatchEvent(
        new CustomEvent<SimFlightStartedDetail>(SIM_FLIGHT_STARTED_EVENT, {
          detail: { at: startedAtRef.current, source: sourceRef.current },
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
            window.dispatchEvent(
              new CustomEvent<SimFlightFinishedDetail>(SIM_FLIGHT_FINISHED_EVENT, {
                detail: {
                  at: finishedAt,
                  startedAt,
                  durationMs: startedAt ? finishedAt - startedAt : null,
                  source: sourceRef.current,
                },
              }),
            );
            flightActiveRef.current = false;
            startedAtRef.current = null;
            stopTimerRef.current = null;
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
                return;
              }
              if (raw.type === "auth-error") {
                setStatus("disconnected");
                return;
              }
            }

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
            };
            setTelemetry(t);
            setLastUpdate(Date.now());
            handleFlightPhase(t.ground_speed ?? t.spd);
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
  }, [enabled, cleanup, handleFlightPhase]);

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

  return {
    status,
    telemetry,
    lastUpdate,
    isFlightActive,
    isConnected: status === "connected",
  };
}
