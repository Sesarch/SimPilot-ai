/**
 * MSFS 2024 / 2020 SimConnect adapter
 * ----------------------------------------------------------------------------
 * Uses msfs-simconnect-api-wrapper to poll a small set of SimVars at ~4 Hz
 * and emit normalized telemetry frames matching the SimPilot contract.
 *
 * PMDG support
 * ------------
 * If the active aircraft's ATC_MODEL / TITLE matches a PMDG airframe (737,
 * 777, 747), we widen the polled SimVar set to include MCP/FCU automation
 * state and flap handle position. The user must enable broadcast in the
 * PMDG .ini for these to be meaningful — see BridgeSetupPage for the guide.
 *
 *   [SDK]
 *   EnableDataBroadcast=1
 */

import { MSFS_API } from "msfs-simconnect-api-wrapper";

const POLL_HZ = 4;
const POLL_MS = Math.round(1000 / POLL_HZ);
const RECONNECT_MS = 5000;
const AIRCRAFT_RECHECK_MS = 5000;

const BASE_SIMVARS = [
  "PLANE_ALTITUDE",                    // ft
  "PLANE_LATITUDE",                    // rad
  "PLANE_LONGITUDE",                   // rad
  "PLANE_HEADING_DEGREES_MAGNETIC",    // rad
  "AIRSPEED_INDICATED",                // kt
  "GROUND_VELOCITY",                   // kt
  "SIM_ON_GROUND",                     // bool
  "COM_ACTIVE_FREQUENCY:1",            // Hz
  "COM_ACTIVE_FREQUENCY:2",            // Hz
  "TRANSPONDER_CODE:1",                // BCD16
];

// Aircraft identity vars — polled less often, used to detect PMDG.
const AIRCRAFT_VARS = ["ATC_MODEL", "TITLE"];

// PMDG-specific SimVars. These are the standard MSFS variables PMDG mirrors
// when EnableDataBroadcast=1 is set in the aircraft .ini. They will read
// zero on non-PMDG airframes, so we only request them once we've confirmed
// PMDG to keep the polling payload small.
const PMDG_SIMVARS = [
  "AUTOPILOT_ALTITUDE_LOCK_VAR:3",     // MCP / FCU selected altitude (ft)
  "AUTOPILOT_HEADING_LOCK_DIR",        // MCP heading bug (deg)
  "AUTOPILOT_AIRSPEED_HOLD_VAR",       // MCP IAS (kt)
  "FLAPS_HANDLE_INDEX",                // detent index (0..N)
  "FLAPS_HANDLE_PERCENT",              // 0..1
  "AUTOPILOT_MASTER",                  // bool
  "AUTOTHROTTLE_ACTIVE",               // bool
];

const PMDG_TITLE_RE = /\bPMDG\b|\b(737|777|747)\b/i;

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

function detectPmdgVariant(title, atcModel) {
  const hay = `${title || ""} ${atcModel || ""}`.toLowerCase();
  if (!/pmdg/.test(hay)) return null;
  if (/737/.test(hay)) return "PMDG 737";
  if (/777/.test(hay)) return "PMDG 777";
  if (/747/.test(hay)) return "PMDG 747";
  return "PMDG";
}

export function createMsfsAdapter({ onTelemetry }) {
  const api = new MSFS_API();
  let pollTimer = null;
  let aircraftTimer = null;
  let reconnectTimer = null;
  let stopped = false;
  let pmdgVariant = null;     // e.g. "PMDG 737" or null
  let lastTitle = null;

  async function checkAircraft() {
    try {
      const v = await api.get(...AIRCRAFT_VARS);
      const title = String(v.TITLE || "");
      const atcModel = String(v.ATC_MODEL || "");
      if (title === lastTitle) return;
      lastTitle = title;
      const variant = detectPmdgVariant(title, atcModel);
      if (variant !== pmdgVariant) {
        pmdgVariant = variant;
        console.log(
          variant
            ? `[msfs] PMDG aircraft detected: ${variant} ("${title}") — enabling advanced SimVars`
            : `[msfs] non-PMDG aircraft ("${title}") — base SimVars only`,
        );
      }
    } catch (err) {
      // Aircraft probe is best-effort; ignore transient failures.
    }
  }

  async function poll() {
    try {
      const vars = pmdgVariant ? [...BASE_SIMVARS, ...PMDG_SIMVARS] : BASE_SIMVARS;
      const v = await api.get(...vars);
      const lat = (Number(v.PLANE_LATITUDE) || 0) * (180 / Math.PI);
      const lon = (Number(v.PLANE_LONGITUDE) || 0) * (180 / Math.PI);

      const frame = {
        alt: Number(v.PLANE_ALTITUDE) || 0,
        lat,
        lon,
        hdg: radToDeg(Number(v.PLANE_HEADING_DEGREES_MAGNETIC) || 0),
        spd: Number(v.AIRSPEED_INDICATED) || 0,
        ground_speed: Number(v.GROUND_VELOCITY) || 0,
        on_ground: Boolean(v.SIM_ON_GROUND),
        com1: hzToFreqString(v["COM_ACTIVE_FREQUENCY:1"]) ?? "---.---",
        com2: hzToFreqString(v["COM_ACTIVE_FREQUENCY:2"]),
        squawk: bcdToSquawk(v["TRANSPONDER_CODE:1"]),
        isSimRunning: true,
        aircraft_title: lastTitle || undefined,
      };

      if (pmdgVariant) {
        frame.pmdg = {
          variant: pmdgVariant,
          mcp_altitude: Number(v["AUTOPILOT_ALTITUDE_LOCK_VAR:3"]) || 0,
          mcp_heading: Number(v.AUTOPILOT_HEADING_LOCK_DIR) || 0,
          mcp_ias: Number(v.AUTOPILOT_AIRSPEED_HOLD_VAR) || 0,
          flaps_handle_index: Number(v.FLAPS_HANDLE_INDEX) || 0,
          flaps_handle_percent: Number(v.FLAPS_HANDLE_PERCENT) || 0,
          autopilot_master: Boolean(v.AUTOPILOT_MASTER),
          autothrottle_active: Boolean(v.AUTOTHROTTLE_ACTIVE),
        };
      }

      onTelemetry(frame);
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
        if (aircraftTimer) clearInterval(aircraftTimer);
        // Probe aircraft immediately, then again every few seconds in case
        // the user swaps airframes mid-session.
        checkAircraft();
        aircraftTimer = setInterval(checkAircraft, AIRCRAFT_RECHECK_MS);
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
      if (aircraftTimer) { clearInterval(aircraftTimer); aircraftTimer = null; }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      try { await api.disconnect?.(); } catch {}
    },
  };
}
