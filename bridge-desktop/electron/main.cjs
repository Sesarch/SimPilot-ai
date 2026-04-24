/**
 * SimPilot Bridge Desktop — Electron main process
 * ----------------------------------------------------------------------------
 * - Hosts a small dark-themed control window (renderer/index.html).
 * - Lives in the system tray. Closing the window minimizes to tray.
 * - Spawns the bridge sidecar (../bridge-core/index.js) as a child process
 *   when the user clicks "Start", and forwards stdout/stderr to the renderer.
 * - Connects its OWN authenticated WebSocket client to ws://127.0.0.1:8080
 *   so we can preview the live telemetry frames inside the desktop UI.
 *
 * Why CommonJS (.cjs)?
 *   Lovable templates often ship "type": "module" in package.json. Using .cjs
 *   guarantees __dirname/__filename are defined inside the Electron main
 *   process regardless of the parent template.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const WebSocket = require("ws");
const updater = require("./updater.cjs");

// Single instance — clicking the tray on a second launch focuses the window
// and forwards any deep-link argv (simpilot://...) to the running process.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// Register simpilot:// protocol so the web app can hand off pairing tokens.
// On Windows/Linux this only takes effect for the running session unless the
// installer also writes the HKCR keys (it does — see SimPilotBridge.iss).
if (!app.isDefaultProtocolClient("simpilot")) {
  try { app.setAsDefaultProtocolClient("simpilot"); } catch { /* noop */ }
}

// CLI flags from the installer / shortcuts.
//   --hidden      → start minimized to tray (used by the autostart entry)
const startHidden = process.argv.includes("--hidden");

let mainWindow = null;
let tray = null;
let bridgeProc = null;
let previewWs = null;
let isQuitting = false;
let lastStatus = "stopped"; // stopped | starting | running | error
let pairingToken = "";


// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 720,
    minWidth: 460,
    minHeight: 600,
    backgroundColor: "#070b14",
    title: "SimPilot Bridge",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true,
    },
  });

  // Resolve renderer/index.html robustly. In a packaged build the files live
  // inside app.asar (or app/) under resources/. We try a few likely spots so
  // the window never stays blank just because of a path mismatch.
  const candidates = [
    path.join(__dirname, "..", "renderer", "index.html"),
    path.join(app.getAppPath(), "renderer", "index.html"),
    path.join(process.resourcesPath || "", "app", "renderer", "index.html"),
    path.join(process.resourcesPath || "", "app.asar", "renderer", "index.html"),
  ];
  const indexPath = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || candidates[0];
  console.log("[main] loading renderer from:", indexPath);
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error("[main] loadFile failed:", err);
    mainWindow.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          `<body style="background:#070b14;color:#e6edf3;font-family:sans-serif;padding:24px">
             <h2>SimPilot Bridge — failed to load UI</h2>
             <pre>${String(err && err.message)}</pre>
             <pre>Tried:\n${candidates.join("\n")}</pre>
           </body>`
        )
    );
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[main] did-fail-load ${code} ${desc} ${url}`);
  });

  mainWindow.once("ready-to-show", () => {
    // Honor --hidden from the installer's autostart entry.
    if (!startHidden) mainWindow.show();
  });

  // Close → minimize to tray instead of quitting.
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ---------------------------------------------------------------------------
// Deep-link handling — simpilot://pair?token=...
// ---------------------------------------------------------------------------
function handleDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return;
  if (!rawUrl.toLowerCase().startsWith("simpilot:")) return;
  let url;
  try { url = new URL(rawUrl); } catch { return; }
  if (url.host === "pair" || url.pathname.replace(/^\/+/, "") === "pair") {
    const token = url.searchParams.get("token");
    if (token) {
      pairingToken = token.trim();
      pushLog("[desktop] pairing token received via deep-link.");
      mainWindow?.webContents.send("bridge:token-set", { ok: true, source: "deep-link" });
      if (bridgeProc) connectPreview();
      else startBridge();
      showWindow();
    }
  }
}

// argv on second-instance / first launch may contain the simpilot:// URL.
function extractDeepLink(argv) {
  return argv.find((a) => typeof a === "string" && a.toLowerCase().startsWith("simpilot:"));
}


// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
function buildTrayIcon() {
  const iconPath = path.join(__dirname, "..", "assets", "tray.png");
  if (fs.existsSync(iconPath)) return nativeImage.createFromPath(iconPath);
  // Fallback: a tiny transparent png so Electron doesn't crash on missing icon.
  return nativeImage.createEmpty();
}

function createTray() {
  tray = new Tray(buildTrayIcon());
  tray.setToolTip("SimPilot Bridge");
  refreshTrayMenu();
  tray.on("click", () => toggleWindow());
}

function refreshTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: `Status: ${lastStatus.toUpperCase()}`, enabled: false },
    { type: "separator" },
    { label: "Show window", click: () => showWindow() },
    {
      label: bridgeProc ? "Stop bridge" : "Start bridge",
      click: () => (bridgeProc ? stopBridge() : startBridge()),
    },
    { type: "separator" },
    {
      label: "Check for updates…",
      click: () => {
        showWindow();
        mainWindow?.webContents.send("ui:navigate", { tab: "updates" });
        try { updater.checkForUpdate({ silent: false }); } catch (err) { pushLog(`[updater] ${err.message}`); }
      },
    },
    { type: "separator" },
    { label: "Quit SimPilot Bridge", click: () => quitApp() },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`SimPilot Bridge — ${lastStatus}`);
}

function showWindow() {
  if (!mainWindow) createWindow();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function toggleWindow() {
  if (!mainWindow) return showWindow();
  if (mainWindow.isVisible()) mainWindow.hide();
  else showWindow();
}

function quitApp() {
  isQuitting = true;
  stopBridge();
  app.quit();
}

// ---------------------------------------------------------------------------
// Bridge child process
// ---------------------------------------------------------------------------
function bridgeEntryPath() {
  // The bridge core ships alongside this app under ../bridge-core/.
  // When packaged, electron-packager copies the whole project directory, so
  // __dirname is .../resources/app/electron at runtime.
  return path.join(__dirname, "..", "bridge-core", "index.js");
}

function pushLog(line) {
  mainWindow?.webContents.send("bridge:log", String(line).trimEnd());
}

function pushStatus(status, extra = {}) {
  lastStatus = status;
  refreshTrayMenu();
  mainWindow?.webContents.send("bridge:status", { status, ...extra });
}

function startBridge() {
  if (bridgeProc) return;
  pushStatus("starting");
  pushLog("[desktop] launching bridge sidecar…");

  const entry = bridgeEntryPath();
  if (!fs.existsSync(entry)) {
    pushStatus("error", { message: `Bridge entry not found: ${entry}` });
    pushLog(`[desktop] ERROR: ${entry} missing`);
    return;
  }

  // Use Electron's bundled Node by setting ELECTRON_RUN_AS_NODE.
  bridgeProc = spawn(process.execPath, [entry], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  bridgeProc.stdout.on("data", (buf) => buf.toString().split("\n").filter(Boolean).forEach(pushLog));
  bridgeProc.stderr.on("data", (buf) => buf.toString().split("\n").filter(Boolean).forEach(pushLog));

  bridgeProc.on("spawn", () => {
    pushStatus("running");
    // Give the WS server a beat, then connect our preview client.
    setTimeout(connectPreview, 600);
  });

  bridgeProc.on("error", (err) => {
    pushStatus("error", { message: err.message });
    pushLog(`[desktop] spawn error: ${err.message}`);
    bridgeProc = null;
  });

  bridgeProc.on("exit", (code, signal) => {
    pushLog(`[desktop] bridge exited (code=${code} signal=${signal ?? "-"})`);
    bridgeProc = null;
    closePreview();
    pushStatus("stopped");
  });
}

function stopBridge() {
  closePreview();
  if (!bridgeProc) {
    pushStatus("stopped");
    return;
  }
  pushLog("[desktop] stopping bridge…");
  try {
    bridgeProc.kill("SIGTERM");
  } catch (err) {
    pushLog(`[desktop] kill error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Preview WebSocket — desktop UI consumes telemetry just like a browser tab
// ---------------------------------------------------------------------------
function connectPreview() {
  if (!pairingToken) {
    pushLog("[desktop] no pairing token set — paste your SimPilot session token to preview telemetry.");
    return;
  }
  closePreview();

  try {
    previewWs = new WebSocket("ws://127.0.0.1:8080", {
      headers: { Origin: "http://localhost:0" },
    });
  } catch (err) {
    pushLog(`[desktop] preview ws error: ${err.message}`);
    return;
  }

  previewWs.on("open", () => {
    try {
      previewWs.send(JSON.stringify({ type: "auth", token: pairingToken }));
    } catch (err) {
      pushLog(`[desktop] preview auth send failed: ${err.message}`);
    }
  });

  previewWs.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg?.type === "auth-ok") {
      pushLog("[desktop] preview authenticated — telemetry preview live.");
      mainWindow?.webContents.send("bridge:preview-auth", { ok: true });
      return;
    }
    if (msg?.type === "auth-error") {
      pushLog(`[desktop] preview auth rejected: ${msg.reason}`);
      mainWindow?.webContents.send("bridge:preview-auth", { ok: false, reason: msg.reason });
      return;
    }
    // Telemetry frame
    mainWindow?.webContents.send("bridge:telemetry", msg);
  });

  previewWs.on("close", () => {
    mainWindow?.webContents.send("bridge:preview-auth", { ok: false, reason: "closed" });
  });

  previewWs.on("error", (err) => {
    pushLog(`[desktop] preview ws error: ${err.message}`);
  });
}

function closePreview() {
  try { previewWs?.close(); } catch { /* noop */ }
  previewWs = null;
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
ipcMain.handle("bridge:start", () => { startBridge(); return true; });
ipcMain.handle("bridge:stop", () => { stopBridge(); return true; });
ipcMain.handle("bridge:set-token", (_evt, token) => {
  pairingToken = String(token || "").trim();
  if (bridgeProc) connectPreview();
  return true;
});
ipcMain.handle("bridge:set-source", (_evt, source) => {
  if (!previewWs || previewWs.readyState !== WebSocket.OPEN) return false;
  try {
    previewWs.send(JSON.stringify({ type: "setSource", source }));
    return true;
  } catch { return false; }
});
ipcMain.handle("bridge:open-external", (_evt, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) shell.openExternal(url);
  return true;
});
ipcMain.handle("bridge:get-status", () => ({ status: lastStatus, hasToken: !!pairingToken }));
ipcMain.handle("app:get-version", () => app.getVersion());

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
app.on("second-instance", (_evt, argv) => {
  const link = extractDeepLink(argv);
  if (link) handleDeepLink(link);
  showWindow();
});

// macOS deep-link delivery
app.on("open-url", (evt, url) => {
  evt.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  // Handle deep-link if the app was launched directly via simpilot://...
  const link = extractDeepLink(process.argv);
  if (link) handleDeepLink(link);
  // Kick off the auto-updater (first check 30s after launch, then every 6h).
  try { updater.start(mainWindow); } catch (err) { pushLog(`[updater] start failed: ${err.message}`); }
});

ipcMain.handle("updater:check-now", () => updater.checkForUpdate({ silent: false }));

app.on("window-all-closed", (e) => {
  // Stay alive in tray; do not quit on window close.
  e.preventDefault?.();
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBridge();
});

