/**
 * X-Plane 12 UDP adapter (stub)
 * ----------------------------------------------------------------------------
 * Listens on UDP :49003 for X-Plane "Data Output" packets. The user must
 * enable the relevant data refs in X-Plane > Settings > Data Output:
 *   - Index 3   Speeds          (IAS @ index 6 of payload row)
 *   - Index 17  Pitch/Roll/Hdg  (mag heading @ index 4)
 *   - Index 20  Lat/Lon/Alt     (alt MSL ft @ index 4)
 *   - Index 116 COM1/COM2 freq  (com1 mhz @ index 1, com2 mhz @ index 2)
 *
 * X-Plane sends a 5-byte header ("DATA*") then repeating 36-byte rows:
 *   [int32 index][float32 v0..v7]
 *
 * This stub parses headers + the index field so we can wire up the rest of
 * the value extraction in a follow-up commit.
 */

import dgram from "node:dgram";

const PORT = 49003;
const ROW_SIZE = 36; // 4 (index) + 8 floats * 4

const ROW_INDEX = {
  SPEEDS: 3,
  ATTITUDE: 17,
  POSITION: 20,
  COM_FREQ: 116,
};

export function createXPlaneAdapter({ onTelemetry }) {
  const socket = dgram.createSocket("udp4");
  let stopped = false;

  // rolling state assembled from multiple data rows
  const state = {
    alt: 0,
    hdg: 0,
    spd: 0,
    ground_speed: 0,
    on_ground: false,
    com1: "---.---",
    com2: undefined,
    isSimRunning: false,
  };

  let lastEmit = 0;
  function maybeEmit() {
    const now = Date.now();
    if (now - lastEmit < 100) return; // ~10 Hz cap
    lastEmit = now;
    onTelemetry({ ...state });
  }

  function parsePacket(buf) {
    if (buf.length < 5) return;
    const tag = buf.toString("ascii", 0, 4); // "DATA"
    if (tag !== "DATA") return;

    state.isSimRunning = true;

    // rows start at offset 5
    for (let off = 5; off + ROW_SIZE <= buf.length; off += ROW_SIZE) {
      const idx = buf.readInt32LE(off);
      const f = (n) => buf.readFloatLE(off + 4 + n * 4);

      switch (idx) {
        case ROW_INDEX.SPEEDS:
          // f(0)=KIAS, f(1)=KEAS, f(2)=KTAS, f(3)=KTGS
          state.spd = f(0);
          state.ground_speed = f(3);
          break;
        case ROW_INDEX.ATTITUDE:
          // f(0)=pitch, f(1)=roll, f(2)=true hdg, f(3)=mag hdg
          state.hdg = f(3);
          break;
        case ROW_INDEX.POSITION:
          // f(0)=lat, f(1)=lon, f(2)=alt msl ft, f(3)=alt agl ft
          state.alt = f(2);
          state.on_ground = f(3) < 5;
          break;
        case ROW_INDEX.COM_FREQ:
          // f(0)=com1 mhz, f(1)=com2 mhz (X-Plane reports as e.g. 118.300)
          state.com1 = f(0).toFixed(3);
          state.com2 = f(1).toFixed(3);
          break;
        default:
          break;
      }
    }

    maybeEmit();
  }

  return {
    start() {
      return new Promise((resolve, reject) => {
        socket.on("error", (err) => {
          console.error("[xplane] socket error:", err.message);
          reject(err);
        });
        socket.on("message", (msg) => {
          if (stopped) return;
          try { parsePacket(msg); } catch (e) {
            console.warn("[xplane] parse failed:", e.message);
          }
        });
        socket.bind(PORT, "0.0.0.0", () => {
          console.log(`[xplane] listening for X-Plane UDP on :${PORT}`);
          // initial idle frame so UI knows adapter is alive
          onTelemetry({ ...state });
          resolve();
        });
      });
    },
    async stop() {
      stopped = true;
      await new Promise((res) => socket.close(res));
    },
  };
}
