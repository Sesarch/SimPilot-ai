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

// Single instance — clicking the tray on a second launch focuses the window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

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
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Close → minimize to tray instead of quitting.
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
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

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
app.on("second-instance", () => showWindow());

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on("window-all-closed", (e) => {
  // Stay alive in tray; do not quit on window close.
  e.preventDefault?.();
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBridge();
});
