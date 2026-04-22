// Admin-controlled toggle that switches the macOS / Linux Bridge download
// buttons between direct asset URLs and the GitHub release page. Stored in
// localStorage so admins can flip it the moment the assets are published
// without needing a deploy.
export const BRIDGE_DIRECT_DOWNLOAD_KEY = "simpilot.bridge.macLinuxDirectDownload";

export const getBridgeDirectDownloadEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BRIDGE_DIRECT_DOWNLOAD_KEY) === "true";
  } catch {
    return false;
  }
};

export const setBridgeDirectDownloadEnabled = (enabled: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BRIDGE_DIRECT_DOWNLOAD_KEY, enabled ? "true" : "false");
    // Notify any open tabs/components in the same window.
    window.dispatchEvent(new CustomEvent("simpilot:bridge-download-mode-changed", { detail: enabled }));
  } catch {
    /* noop */
  }
};
