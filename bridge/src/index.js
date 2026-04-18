#!/usr/bin/env node
/**
 * SimPilot Bridge - entry point
 * ----------------------------------------------------------------------------
 * Boots a local WebSocket server on 127.0.0.1:8080 and pipes telemetry from
 * either MSFS 2024 (SimConnect) or X-Plane 12 (UDP) into connected browsers.
 */

import { WebSocketServer } from "ws";
import { createMsfsAdapter } from "./adapters/msfs.js";
import { createXPlaneAdapter } from "./adapters/xplane.js";

const PORT = 8080;
const HOST = "127.0.0.1";
const ALLOWED_ORIGINS = [
  /^https:\/\/simpilot\.ai$/,
  /^https:\/\/.*\.lovable\.app$/,
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
    if (client.readyState === 1) {
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
  console.log(`[bridge] client connected from ${req.socket.remoteAddress}`);

  // send the latest known frame immediately so the UI doesn't sit blank
  if (lastFrame) {
    try { ws.send(JSON.stringify(lastFrame)); } catch {}
  }

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "setSource" && (msg.source === "msfs2024" || msg.source === "xplane12")) {
        if (msg.source !== activeSource) {
          await startAdapter(msg.source);
        }
      }
    } catch {
      // ignore malformed control frame
    }
  });

  ws.on("close", () => {
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
