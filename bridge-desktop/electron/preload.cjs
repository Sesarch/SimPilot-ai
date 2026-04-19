/**
 * Preload — narrow IPC surface for the renderer.
 * Exposes only what the UI needs, never the full Node API.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("simpilot", {
  start: () => ipcRenderer.invoke("bridge:start"),
  stop: () => ipcRenderer.invoke("bridge:stop"),
  setToken: (token) => ipcRenderer.invoke("bridge:set-token", token),
  setSource: (source) => ipcRenderer.invoke("bridge:set-source", source),
  openExternal: (url) => ipcRenderer.invoke("bridge:open-external", url),
  getStatus: () => ipcRenderer.invoke("bridge:get-status"),

  onStatus: (fn) => {
    const h = (_e, payload) => fn(payload);
    ipcRenderer.on("bridge:status", h);
    return () => ipcRenderer.removeListener("bridge:status", h);
  },
  onLog: (fn) => {
    const h = (_e, line) => fn(line);
    ipcRenderer.on("bridge:log", h);
    return () => ipcRenderer.removeListener("bridge:log", h);
  },
  onTelemetry: (fn) => {
    const h = (_e, frame) => fn(frame);
    ipcRenderer.on("bridge:telemetry", h);
    return () => ipcRenderer.removeListener("bridge:telemetry", h);
  },
  onPreviewAuth: (fn) => {
    const h = (_e, payload) => fn(payload);
    ipcRenderer.on("bridge:preview-auth", h);
    return () => ipcRenderer.removeListener("bridge:preview-auth", h);
  },
});
