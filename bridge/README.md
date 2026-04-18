# SimPilot Bridge

Local sidecar app that streams flight simulator telemetry from your PC to the
[SimPilot.AI](https://simpilot.ai) Flight Deck running in your browser.

Supports:
- ✈️ **Microsoft Flight Simulator 2024** (and 2020) via SimConnect
- ✈️ **X-Plane 12** via UDP data output

## How it works

```
 ┌──────────────┐        ┌──────────────────┐        ┌──────────────────┐
 │ MSFS 2024 /  │───────▶│  SimPilot Bridge │───────▶│  Browser         │
 │ X-Plane 12   │        │  (this app)      │   WS   │  (Flight Deck)   │
 └──────────────┘        │  ws://:8080      │        └──────────────────┘
                         └──────────────────┘
```

The bridge runs locally on `ws://localhost:8080` and broadcasts a normalized
JSON telemetry frame to any connected browser tab.

## Install (end users)

Download the latest `SimPilotBridge.exe` from the releases page and run it.
Leave it open while you fly. The Flight Deck will detect it automatically.

## Develop

```bash
cd bridge
npm install
npm run dev
```

Then open `https://simpilot.ai/dashboard` and toggle the sim listener on.

## Build the Windows installer

```bash
npm run build:win
# → dist/SimPilotBridge.exe
```

## Telemetry contract

Every frame the bridge sends matches the contract consumed by `useSimBridge`:

```ts
{
  alt: number;          // ft MSL
  hdg: number;          // deg magnetic
  spd: number;          // kt IAS
  com1: string;         // "118.300"
  com2?: string;
  squawk?: string;
  on_ground?: boolean;
  ground_speed?: number;
  isSimRunning?: boolean;
}
```

## Security

- Binds to `127.0.0.1` only — never exposed on the network.
- Origin allowlist: `https://simpilot.ai`, `https://*.lovable.app`,
  `https://*.lovableproject.com`, and `http://localhost:*` for development.
- **JWT auth required.** Every connection must send
  `{"type":"auth","token":"<supabase-access-token>"}` as its first frame
  within 2 seconds. The bridge verifies the token signature against the
  Supabase JWKS (issuer + audience + expiry) before streaming any telemetry.
  Unauthenticated sockets are closed with code `4401`.

### Configuration

Override the Supabase project the bridge trusts via env vars:

```bash
SIMPILOT_SUPABASE_URL=https://your-project.supabase.co npm start
# or just the project ref:
SIMPILOT_PROJECT_REF=your-project-ref npm start
```

Defaults to the production SimPilot.AI project.
