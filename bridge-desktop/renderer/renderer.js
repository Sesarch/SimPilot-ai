/**
 * Renderer — wires the UI to the IPC bridge exposed by preload.cjs.
 * Pure DOM, no framework, so the packaged binary stays small.
 */

const $ = (id) => document.getElementById(id);

const els = {
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
};

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
  // Cap log size
  while (els.log.childNodes.length > 500) els.log.removeChild(els.log.firstChild);
  els.log.scrollTop = els.log.scrollHeight;
}

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
})();
