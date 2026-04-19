# SimPilot Bridge — Desktop wrapper

A tray-icon Electron app that hosts the [SimPilot Bridge](../bridge) sidecar
behind a modern dark UI. Lets pilots:

- Start / stop the local telemetry sidecar with one click
- Paste their SimPilot session JWT (pairing token) once and forget it
- Preview live ALT / HDG / IAS / COM1 frames inside the desktop window
- Switch between **MSFS 2024 (SimConnect)** and **X-Plane 12 (UDP)**
- Minimize to system tray; quit cleanly via tray menu

## Architecture

```
┌────────────────────────┐
│  Electron main (.cjs)  │ ──spawn──▶ bridge-core/index.js (your sidecar)
│  - Tray icon + menu    │              │
│  - Spawns sidecar      │              ▼
│  - Hosts a preview ws  │ ◀── ws://127.0.0.1:8080 (auth-gated)
│    client (jwt auth)   │
└──────────┬─────────────┘
           │ IPC (preload.cjs)
           ▼
┌────────────────────────┐
│  Renderer (no deps)    │  modern dark UI (HTML/CSS/JS)
└────────────────────────┘
```

The desktop app does **not** replace the bridge — it embeds it. The same
WebSocket on `127.0.0.1:8080` is what the SimPilot Flight Deck in your
browser already listens to, so both can run simultaneously.

## Files

```
bridge-desktop/
├── package.json                 # electron + ws + jose
├── electron/
│   ├── main.cjs                 # main process, tray, child spawn, preview ws
│   └── preload.cjs              # narrow IPC surface (contextBridge)
├── renderer/
│   ├── index.html               # UI markup
│   ├── styles.css               # cockpit-inspired dark theme
│   └── renderer.js              # DOM wiring (no framework)
├── bridge-core/                 # COPY of bridge/src here before packaging
│   ├── index.js
│   ├── auth.js
│   └── adapters/{msfs,xplane}.js
├── assets/
│   └── tray.png                 # 22×22 tray icon (drop your own)
└── README.md
```

> Before packaging, copy the bridge source so it ships inside the app:
> ```bash
> cp -r ../bridge/src ./bridge-core
> ```

## Dev

```bash
cd bridge-desktop
npm install
cp -r ../bridge/src ./bridge-core
npm start
```

## Package

```bash
# Linux x64
npm run package:linux
# Windows x64 (cross-builds from Linux)
npm run package:win
# macOS x64
npm run package:mac
```

Output: `release/SimPilotBridge-<platform>-x64/`.

## Pairing token

Get your session JWT from the SimPilot.AI app:

1. Sign in at https://simpilot.ai
2. Visit `/flight-deck/bridge`
3. Open browser DevTools → Application → Local Storage → copy the `access_token`
   from the supabase auth entry
4. Paste it into the desktop app's **Pairing token** field

The token only authenticates the desktop app's own preview WebSocket — the
bridge already authenticates every browser tab the same way.
