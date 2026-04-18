/**
 * MSFS 2024 / 2020 SimConnect adapter
 * ----------------------------------------------------------------------------
 * Uses msfs-simconnect-api-wrapper to poll a small set of SimVars at ~4 Hz
 * and emit normalized telemetry frames matching the SimPilot contract.
 */

import { MSFS_API } from "msfs-simconnect-api-wrapper";

const POLL_HZ = 4;
const POLL_MS = Math.round(1000 / POLL_HZ);
const RECONNECT_MS = 5000;

const SIMVARS = [
  "PLANE_ALTITUDE",                    // ft
  "PLANE_HEADING_DEGREES_MAGNETIC",    // rad
  "AIRSPEED_INDICATED",                // kt
  "GROUND_VELOCITY",                   // kt
  "SIM_ON_GROUND",                     // bool
  "COM_ACTIVE_FREQUENCY:1",            // Hz
  "COM_ACTIVE_FREQUENCY:2",            // Hz
  "TRANSPONDER_CODE:1",                // BCD16
];

function radToDeg(rad) {
  return ((rad * 180) / Math.PI + 360) % 360;
}

function hzToFreqString(hz) {
  if (!hz) return undefined;
  const mhz = hz / 1_000_000;
  return mhz.toFixed(3);
}

function bcdToSquawk(bcd) {
  if (bcd == null) return undefined;
  return bcd.toString(16).padStart(4, "0");
}

export function createMsfsAdapter({ onTelemetry }) {
  const api = new MSFS_API();
  let pollTimer = null;
  let reconnectTimer = null;
  let stopped = false;

  async function poll() {
    try {
      const v = await api.get(...SIMVARS);
      onTelemetry({
        alt: Number(v.PLANE_ALTITUDE) || 0,
        hdg: radToDeg(Number(v.PLANE_HEADING_DEGREES_MAGNETIC) || 0),
        spd: Number(v.AIRSPEED_INDICATED) || 0,
        ground_speed: Number(v.GROUND_VELOCITY) || 0,
        on_ground: Boolean(v.SIM_ON_GROUND),
        com1: hzToFreqString(v["COM_ACTIVE_FREQUENCY:1"]) ?? "---.---",
        com2: hzToFreqString(v["COM_ACTIVE_FREQUENCY:2"]),
        squawk: bcdToSquawk(v["TRANSPONDER_CODE:1"]),
        isSimRunning: true,
      });
    } catch (err) {
      console.warn("[msfs] poll failed:", err.message);
    }
  }

  function scheduleReconnect() {
    if (stopped) return;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_MS);
  }

  function connect() {
    if (stopped) return;
    api.connect({
      autoReconnect: true,
      retries: Infinity,
      retryInterval: 5,
      onConnect: () => {
        console.log("[msfs] connected to SimConnect");
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(poll, POLL_MS);
      },
      onRetry: (_retries, interval) => {
        console.log(`[msfs] retry in ${interval}s`);
      },
      onException: (e) => {
        console.warn("[msfs] SimConnect exception:", e);
      },
    }).catch((err) => {
      console.warn("[msfs] connect failed:", err.message);
      onTelemetry({
        alt: 0, hdg: 0, spd: 0, com1: "---.---",
        isSimRunning: false,
      });
      scheduleReconnect();
    });
  }

  return {
    start() {
      stopped = false;
      connect();
    },
    async stop() {
      stopped = true;
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      try { await api.disconnect?.(); } catch {}
    },
  };
}
