import { useEffect, useRef, useState, useCallback } from "react";

export type SimMode = "msfs2024" | "xplane12";

export interface SimTelemetry {
  altitude: number;      // ft MSL
  heading: number;       // degrees magnetic
  speed: number;         // knots IAS
  com1_freq?: string;    // "118.300"
  com2_freq?: string;
  squawk?: string;
  on_ground?: boolean;
}

export type SimStatus = "disconnected" | "connecting" | "connected" | "error";

const STORAGE_KEY = "simpilot_sim_mode";
const PORT = 8080;

const PATHS: Record<SimMode, string> = {
  msfs2024: "/msfs",
  xplane12: "/xplane",
};

interface UseSimTelemetryOptions {
  enabled?: boolean;
  host?: string;
}

export function useSimTelemetry({ enabled = false, host = "localhost" }: UseSimTelemetryOptions = {}) {
  const [mode, setModeState] = useState<SimMode>(() => {
    if (typeof window === "undefined") return "msfs2024";
    return (localStorage.getItem(STORAGE_KEY) as SimMode) || "msfs2024";
  });
  const [status, setStatus] = useState<SimStatus>("disconnected");
  const [telemetry, setTelemetry] = useState<SimTelemetry | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const setMode = useCallback((next: SimMode) => {
    setModeState(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
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
      const url = `ws://${host}:${PORT}${PATHS[mode]}`;
      setStatus("connecting");
      setError(null);

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setStatus("connected");
          setError(null);
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const raw = JSON.parse(event.data);
            const t: SimTelemetry = {
              altitude: Number(raw.altitude ?? raw.Altitude ?? 0),
              heading: Number(raw.heading ?? raw.Heading ?? 0),
              speed: Number(raw.speed ?? raw.Speed ?? raw.airspeed ?? 0),
              com1_freq: raw.Com1_Freq ?? raw.com1_freq ?? raw.com1 ?? undefined,
              com2_freq: raw.Com2_Freq ?? raw.com2_freq ?? raw.com2 ?? undefined,
              squawk: raw.squawk ?? raw.Squawk ?? undefined,
              on_ground: raw.on_ground ?? raw.OnGround ?? undefined,
            };
            setTelemetry(t);
            setLastUpdate(Date.now());
          } catch {
            // ignore malformed frame
          }
        };

        ws.onerror = () => {
          if (cancelled) return;
          setError("Connection failed");
        };

        ws.onclose = () => {
          if (cancelled) return;
          setStatus("disconnected");
          // attempt reconnect with backoff
          reconnectTimerRef.current = window.setTimeout(connect, 5000);
        };
      } catch (e) {
        setStatus("error");
        setError((e as Error).message);
        reconnectTimerRef.current = window.setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, mode, host, cleanup]);

  return { mode, setMode, status, telemetry, lastUpdate, error };
}
