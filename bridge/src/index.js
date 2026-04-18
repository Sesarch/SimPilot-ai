#!/usr/bin/env node
/**
 * SimPilot Bridge - entry point
 * ----------------------------------------------------------------------------
 * Boots a local WebSocket server on 127.0.0.1:8080 and pipes telemetry from
 * either MSFS 2024 (SimConnect) or X-Plane 12 (UDP) into the connected
 * browser tab.
 *
 * Auth model
 * ----------
 * Although the server only listens on the loopback interface, ANY local
 * process (including malicious browser extensions or other apps on the same
 * machine) could otherwise connect. To prevent that, every WebSocket
 * connection MUST present a valid Supabase JWT for the logged-in pilot:
 *
 *   1. Browser opens ws://127.0.0.1:8080
 *   2. Within AUTH_GRACE_MS, browser sends:  {"type":"auth","token":"<jwt>"}
 *   3. Bridge verifies the JWT signature against the Supabase JWKS and
 *      checks issuer + audience + expiry.
 *   4. On success, the bridge sends {"type":"auth-ok","sub":...} and starts
 *      streaming telemetry. On failure or timeout, it closes with code 4401.
 */

import { WebSocketServer } from "ws";
import { createMsfsAdapter } from "./adapters/msfs.js";
import { createXPlaneAdapter } from "./adapters/xplane.js";
import { verifyAccessToken } from "./auth.js";

const PORT = 8080;
const HOST = "127.0.0.1";
const AUTH_GRACE_MS = 2000;

const ALLOWED_ORIGINS = [
  /^https:\/\/simpilot\.ai$/,
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^http:\/\/localhost:\d+$/,
];

function isOriginAllowed(origin) {
  if (!origin) return true; // some browsers omit origin for ws://localhost
  return ALLOWED_ORIGINS.some((re) => re.test(origin));
}

const wss = new WebSocketServer({
  host: HOST,
  port: PORT,
  verifyClient: ({ origin }, cb) => {
    if (isOriginAllowed(origin)) return cb(true);
    console.warn(`[bridge] rejected origin: ${origin}`);
    return cb(false, 403, "Forbidden origin");
  },
});

console.log(`[bridge] SimPilot Bridge listening on ws://${HOST}:${PORT}`);

let activeSource = "msfs2024";
let adapter = null;
let lastFrame = null;

function broadcast(frame) {
  lastFrame = frame;
  const payload = JSON.stringify(frame);
  for (const client of wss.clients) {
    if (client.readyState === 1 && client.simpilotAuthed === true) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn("[bridge] send failed:", err.message);
      }
    }
  }
}

async function startAdapter(source) {
  if (adapter) {
    try {
      await adapter.stop();
    } catch (e) {
      console.warn("[bridge] adapter stop error:", e.message);
    }
    adapter = null;
  }

  activeSource = source;
  console.log(`[bridge] starting adapter: ${source}`);

  if (source === "xplane12") {
    adapter = createXPlaneAdapter({ onTelemetry: broadcast });
  } else {
    adapter = createMsfsAdapter({ onTelemetry: broadcast });
  }

  try {
    await adapter.start();
  } catch (err) {
    console.error(`[bridge] adapter ${source} failed to start:`, err.message);
    broadcast({
      alt: 0, hdg: 0, spd: 0, com1: "---.---",
      isSimRunning: false,
      error: `Failed to start ${source}: ${err.message}`,
    });
  }
}

wss.on("connection", (ws, req) => {
  const remote = req.socket.remoteAddress;
  console.log(`[bridge] client connected from ${remote} — awaiting auth`);

  ws.simpilotAuthed = false;

  // Hard timeout: if we don't receive a valid auth frame in time, drop the
  // connection. Code 4401 is a custom application-level "Unauthorized".
  const authTimer = setTimeout(() => {
    if (!ws.simpilotAuthed) {
      console.warn(`[bridge] auth timeout from ${remote}`);
      try {
        ws.send(JSON.stringify({ type: "auth-error", reason: "timeout" }));
      } catch {}
      ws.close(4401, "auth timeout");
    }
  }, AUTH_GRACE_MS);

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }

    // ---- AUTH HANDSHAKE -----------------------------------------------
    if (!ws.simpilotAuthed) {
      if (msg.type !== "auth" || typeof msg.token !== "string") {
        try {
          ws.send(JSON.stringify({ type: "auth-error", reason: "expected auth frame" }));
        } catch {}
        ws.close(4401, "expected auth frame");
        return;
      }
      try {
        const claims = await verifyAccessToken(msg.token);
        ws.simpilotAuthed = true;
        ws.simpilotUser = claims.sub;
        clearTimeout(authTimer);
        console.log(`[bridge] auth ok — user ${claims.sub}${claims.email ? ` (${claims.email})` : ""}`);
        try {
          ws.send(JSON.stringify({ type: "auth-ok", sub: claims.sub }));
        } catch {}
        // Push the latest known frame so the UI doesn't sit blank.
        if (lastFrame) {
          try { ws.send(JSON.stringify(lastFrame)); } catch {}
        }
      } catch (err) {
        console.warn(`[bridge] auth failed: ${err.message}`);
        try {
          ws.send(JSON.stringify({ type: "auth-error", reason: "invalid token" }));
        } catch {}
        ws.close(4401, "invalid token");
      }
      return;
    }

    // ---- AUTHED CONTROL FRAMES ----------------------------------------
    if (msg.type === "setSource" && (msg.source === "msfs2024" || msg.source === "xplane12")) {
      if (msg.source !== activeSource) {
        await startAdapter(msg.source);
      }
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimer);
    console.log("[bridge] client disconnected");
  });
});

// boot default adapter
startAdapter(activeSource);

// graceful shutdown
const shutdown = async () => {
  console.log("[bridge] shutting down...");
  try { await adapter?.stop(); } catch {}
  wss.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
