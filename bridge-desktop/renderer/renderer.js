/**
 * Renderer — wires the UI to the IPC bridge exposed by preload.cjs.
 * Pure DOM, no framework, so the packaged binary stays small.
 */

const $ = (id) => document.getElementById(id);

const els = {
  brandVersion: $("brand-version"),
  statusDot: document.querySelector(".status-pill__dot"),
  statusLabel: $("status-label"),
  previewHint: $("preview-hint"),
  alt: $("t-alt"),
  hdg: $("t-hdg"),
  spd: $("t-spd"),
  com1: $("t-com1"),
  btnStart: $("btn-start"),
  btnStop: $("btn-stop"),
  srcSelect: $("src-select"),
  tokenInput: $("token-input"),
  btnSaveToken: $("btn-save-token"),
  tokenStatus: $("token-status"),
  log: $("log"),
  btnClearLog: $("btn-clear-log"),
  openHelp: $("open-help"),
  // Updates tab
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".tab-panel"),
  tabUpdatesBadge: $("tab-updates-badge"),
  updStatePill: $("upd-state-pill"),
  updCurrent: $("upd-current"),
  updRemote: $("upd-remote"),
  updMessage: $("upd-message"),
  updProgress: $("upd-progress"),
  updProgressFill: $("upd-progress-fill"),
  updProgressLabel: $("upd-progress-label"),
  btnCheckUpdates: $("btn-check-updates"),
  btnOpenReleases: $("btn-open-releases"),
};

// ---------------- Tab nav ----------------
function activateTab(name) {
  els.tabs.forEach((t) => t.classList.toggle("tab--active", t.dataset.tab === name));
  els.panels.forEach((p) => p.classList.toggle("tab-panel--active", p.dataset.panel === name));
  if (name === "updates") {
    els.tabUpdatesBadge.hidden = true;
  }
}
els.tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));

// ---------------- Status ----------------
function setStatus(status, message) {
  els.statusDot.dataset.status = status;
  els.statusLabel.textContent = status.toUpperCase();
  const running = status === "running";
  els.btnStart.disabled = running || status === "starting";
  els.btnStop.disabled = !running;
  if (message) appendLog(`[status] ${message}`);
}

// ---------------- Telemetry ----------------
function fmt(n, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return "---";
  return Number(n).toFixed(digits);
}
function pad3(n) {
  if (n == null || Number.isNaN(Number(n))) return "---";
  const v = Math.round(Number(n));
  return String(v).padStart(3, "0") + "°";
}

function paintTelemetry(frame) {
  if (!frame || typeof frame !== "object") return;
  els.alt.textContent = fmt(frame.alt);
  els.hdg.textContent = pad3(frame.hdg);
  els.spd.textContent = fmt(frame.spd);
  els.com1.textContent = frame.com1 || "---.---";
  els.previewHint.textContent = `Last frame · ${new Date().toLocaleTimeString()}`;
}

// ---------------- Logs ----------------
function appendLog(line, kind) {
  const span = document.createElement("span");
  span.className = "log__line" + (kind ? ` log__line--${kind}` : "");
  span.textContent = line + "\n";
  els.log.appendChild(span);
  while (els.log.childNodes.length > 500) els.log.removeChild(els.log.firstChild);
  els.log.scrollTop = els.log.scrollHeight;
}

// ---------------- Updater ----------------
function setUpdState(label, kind) {
  els.updStatePill.textContent = label.toUpperCase();
  els.updStatePill.dataset.kind = kind || "";
}

function setUpdMessage(msg, kind) {
  els.updMessage.textContent = msg;
  els.updMessage.classList.toggle("text-error", kind === "error");
  els.updMessage.classList.toggle("text-ok", kind === "ok");
}

els.btnCheckUpdates.addEventListener("click", async () => {
  els.btnCheckUpdates.disabled = true;
  setUpdState("Checking", "checking");
  setUpdMessage("Contacting the update server…");
  try {
    await window.simpilot.checkForUpdates();
  } catch (err) {
    setUpdState("Error", "error");
    setUpdMessage(err.message || "Update check failed.", "error");
  } finally {
    setTimeout(() => { els.btnCheckUpdates.disabled = false; }, 1500);
  }
});

els.btnOpenReleases.addEventListener("click", () =>
  window.simpilot.openExternal("https://github.com/simpilot-ai/bridge/releases")
);

window.simpilot.onUpdaterStatus((payload) => {
  if (!payload) return;
  if (payload.upToDate) {
    setUpdState("Up to date", "ok");
    els.updRemote.textContent = payload.remote || "—";
    setUpdMessage(`You're running the latest version (${payload.current}).`, "ok");
    els.updProgress.hidden = true;
    return;
  }
  if (payload.updateAvailable) {
    setUpdState("Update available", "warn");
    els.updRemote.textContent = payload.remote;
    setUpdMessage(`Version ${payload.remote} is available — downloading…`);
    els.updProgress.hidden = false;
    els.tabUpdatesBadge.hidden = false;
    return;
  }
  if (payload.downloaded) {
    setUpdState("Ready to install", "ok");
    setUpdMessage(`Version ${payload.version} downloaded. Confirm the prompt to install and restart.`, "ok");
    els.updProgress.hidden = true;
    els.tabUpdatesBadge.hidden = false;
    return;
  }
  if (payload.error) {
    setUpdState("Error", "error");
    setUpdMessage(payload.error, "error");
    els.updProgress.hidden = true;
  }
});

window.simpilot.onUpdaterProgress(({ percent }) => {
  els.updProgress.hidden = false;
  els.updProgressFill.style.width = `${percent}%`;
  els.updProgressLabel.textContent = `${percent}%`;
});

window.simpilot.onNavigate(({ tab }) => { if (tab) activateTab(tab); });

// ---------------- Wire up ----------------
els.btnStart.addEventListener("click", () => window.simpilot.start());
els.btnStop.addEventListener("click", () => window.simpilot.stop());
els.btnClearLog.addEventListener("click", () => { els.log.textContent = ""; });

els.srcSelect.addEventListener("change", async () => {
  const ok = await window.simpilot.setSource(els.srcSelect.value);
  appendLog(`[ui] sim source → ${els.srcSelect.value} ${ok ? "(sent)" : "(queued, start bridge first)"}`);
});

els.btnSaveToken.addEventListener("click", async () => {
  const token = els.tokenInput.value.trim();
  if (!token) {
    els.tokenStatus.textContent = "Token cannot be empty.";
    return;
  }
  await window.simpilot.setToken(token);
  els.tokenStatus.textContent = `Saved · ${token.slice(0, 12)}…`;
  appendLog("[ui] pairing token saved");
});

els.openHelp.addEventListener("click", (e) => {
  e.preventDefault();
  window.simpilot.openExternal("https://simpilot.ai/flight-deck/bridge");
});

window.simpilot.onStatus(({ status, message }) => setStatus(status, message));
window.simpilot.onLog((line) => appendLog(line));
window.simpilot.onTelemetry((frame) => paintTelemetry(frame));
window.simpilot.onPreviewAuth(({ ok, reason }) => {
  els.previewHint.textContent = ok
    ? "Authenticated · streaming"
    : `Preview offline${reason ? ` (${reason})` : ""}`;
});

// Boot
(async () => {
  const s = await window.simpilot.getStatus();
  setStatus(s.status);
  if (!s.hasToken) els.tokenStatus.textContent = "No token saved yet.";
  try {
    const v = await window.simpilot.getVersion();
    els.brandVersion.textContent = v;
    els.updCurrent.textContent = v;
  } catch { /* noop */ }
})();
