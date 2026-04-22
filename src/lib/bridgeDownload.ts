/**
 * Shared SimPilot Bridge installer resolver + downloader.
 *
 * Used by both /flight-deck/bridge (full setup page) and the homepage Hero
 * CTA so behavior stays identical:
 *   1. Resolve the pinned release (v1.0.0) — fall back to "latest" if the
 *      pinned tag isn't published yet.
 *   2. Fetch the .exe as a blob.
 *   3. Verify SHA-512 against the checksum published in `latest.yml`.
 *   4. Trigger a same-tab browser save (no new tab, no upstream host UI).
 *
 * All upstream API hosts are intentionally abstracted away from the user —
 * surface only "the release server" / "verifying" copy in toasts.
 */
import { toast } from "@/hooks/use-toast";
import { trackBridgeDownloadEvent } from "@/lib/bridgeDownloadAnalytics";

// --- Pinned version ---------------------------------------------------------
// Bump this constant when cutting a new public release. The downloader will
// always look for this exact tag first; if the upstream returns 404 (e.g. the
// tag hasn't been published yet) it transparently falls back to /latest so
// the button never goes dead.
export const PINNED_BRIDGE_VERSION = "1.0.0";
const PINNED_TAG = `v${PINNED_BRIDGE_VERSION}`;

const RELEASE_API_BY_TAG = `https://api.github.com/repos/Sesarch/SimPilot-ai/releases/tags/${PINNED_TAG}`;
const RELEASE_API_LATEST = "https://api.github.com/repos/Sesarch/SimPilot-ai/releases/latest";

// Versioned cache key — bumping PINNED_BRIDGE_VERSION invalidates old caches
// automatically so users always pull the new pinned release on next visit.
const RELEASE_CACHE_KEY = `simpilot:bridge-release-cache:v1:${PINNED_TAG}`;
const RELEASE_CACHE_TTL_MS = 10 * 60 * 1000;

export type ResolvedBridgeRelease = {
  tagName: string;
  publishedAt: string | null;
  htmlUrl: string;
  installer: {
    name: string;
    downloadUrl: string;
    sizeBytes: number;
  } | null;
  sha512: string | null;
};

type ReleaseCacheEntry = { cachedAt: number; release: ResolvedBridgeRelease | null };

function readCache(): ReleaseCacheEntry | null {
  try {
    const raw = localStorage.getItem(RELEASE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReleaseCacheEntry;
    if (!parsed || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > RELEASE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(release: ResolvedBridgeRelease | null) {
  try {
    localStorage.setItem(
      RELEASE_CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), release } satisfies ReleaseCacheEntry),
    );
  } catch {
    /* private mode / quota — non-fatal */
  }
}

async function fetchReleaseFromApi(url: string): Promise<ResolvedBridgeRelease | null> {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Release server returned ${res.status}`);
  const data = (await res.json()) as {
    tag_name: string;
    published_at: string | null;
    html_url: string;
    assets: Array<{ name: string; browser_download_url: string; size: number }>;
  };
  const installerAsset =
    data.assets.find((a) => /SimPilotBridge-Setup-.*\.exe$/i.test(a.name)) ?? null;
  const ymlAsset = data.assets.find((a) => a.name === "latest.yml");
  let sha512: string | null = null;
  if (ymlAsset) {
    try {
      const yml = await fetch(ymlAsset.browser_download_url).then((r) => r.text());
      const match = yml.match(/^sha512:\s*(\S+)/m);
      if (match) sha512 = match[1];
    } catch {
      /* non-fatal — checksum just won't be verifiable inline */
    }
  }
  return {
    tagName: data.tag_name,
    publishedAt: data.published_at,
    htmlUrl: data.html_url,
    installer: installerAsset
      ? {
          name: installerAsset.name,
          downloadUrl: installerAsset.browser_download_url,
          sizeBytes: installerAsset.size,
        }
      : null,
    sha512,
  };
}

/**
 * Resolves the pinned release (v1.0.0) with a transparent fallback to the
 * latest published release. Cached in localStorage for 10 minutes.
 */
export async function resolveBridgeRelease(
  options: { forceRefresh?: boolean } = {},
): Promise<ResolvedBridgeRelease | null> {
  if (!options.forceRefresh) {
    const cached = readCache();
    if (cached) return cached.release;
  }
  let resolved = await fetchReleaseFromApi(RELEASE_API_BY_TAG);
  if (!resolved) {
    // Pinned tag not published yet — fall back to "latest" so the button
    // still serves whatever is currently the freshest signed build.
    resolved = await fetchReleaseFromApi(RELEASE_API_LATEST);
  }
  writeCache(resolved);
  return resolved;
}

/**
 * Hex-encodes an ArrayBuffer (used for SHA-512 comparison).
 */
function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Normalizes a SHA-512 string for comparison. The Inno-Setup workflow emits
 * base64; older releases used hex. We compute the hex digest of the file and
 * compare against both encodings of the published checksum.
 */
function checksumMatches(
  computedHex: string,
  expected: string,
  computedBuf: ArrayBuffer,
): boolean {
  const expectedTrimmed = expected.trim();
  if (computedHex.toLowerCase() === expectedTrimmed.toLowerCase()) return true;
  // base64 path — convert computed digest to base64 and compare.
  try {
    let binary = "";
    const bytes = new Uint8Array(computedBuf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const computedB64 = btoa(binary);
    return computedB64 === expectedTrimmed;
  } catch {
    return false;
  }
}

/**
 * Saves a Blob to disk via a transient anchor — keeps the user on the page,
 * never opens a new tab, and never reveals the upstream host.
 */
function saveBlobAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the browser has time to start the save.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Phased progress states surfaced to the UI so users can see exactly what's
 * happening during the verified download. Kept stable so callers can map each
 * phase to a label / progress percentage.
 */
export type DownloadPhase =
  | "idle"
  | "resolving"
  | "downloading"
  | "verifying"
  | "saving"
  | "done"
  | "error";

export type DownloadProgress = {
  phase: DownloadPhase;
  /** 0–100 — overall progress across all phases. */
  percent: number;
  /** Short human-readable status line. */
  message: string;
  /** Bytes received so far (downloading phase only). */
  receivedBytes?: number;
  /** Total bytes when Content-Length is known. */
  totalBytes?: number;
};

type DownloadOptions = {
  onProgress?: (p: DownloadProgress) => void;
};

/**
 * Streams a fetch Response into an ArrayBuffer while reporting byte-level
 * progress. Falls back to a single-shot arrayBuffer() if the body isn't
 * streamable (older browsers / opaque responses).
 */
async function readWithProgress(
  res: Response,
  onChunk: (received: number, total: number | null) => void,
): Promise<ArrayBuffer> {
  const total = Number(res.headers.get("Content-Length")) || null;
  if (!res.body || typeof res.body.getReader !== "function") {
    const buf = await res.arrayBuffer();
    onChunk(buf.byteLength, total);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      onChunk(received, total);
    }
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

/**
 * End-to-end: resolve → fetch → verify SHA-512 → save. Fires user-facing
 * toasts at each milestone AND emits granular progress via `onProgress` so
 * the calling UI can render a verification progress bar. Never throws —
 * surfaces errors via toast + `phase: "error"`.
 *
 * The helper always serves the file from the resolved direct asset URL via
 * fetch + Blob save, so the user never leaves the SimPilot domain — no new
 * tab, no upstream host UI, no redirect.
 */
export async function downloadAndVerifyInstaller(
  options: DownloadOptions = {},
): Promise<void> {
  const startedAt = Date.now();
  let lastTrackedPhase: DownloadPhase | null = null;
  const emit = (p: DownloadProgress) => {
    options.onProgress?.(p);
    // Fire one analytics event per phase transition (plus every terminal
    // state) so we can track funnel drop-off without flooding the data layer
    // with per-chunk download progress.
    const isTerminal = p.phase === "done" || p.phase === "error";
    if (p.phase !== lastTrackedPhase || isTerminal) {
      lastTrackedPhase = p.phase;
      trackBridgeDownloadEvent({
        phase: p.phase,
        version: PINNED_TAG,
        percent: p.percent,
        message: p.message,
        receivedBytes: p.receivedBytes,
        totalBytes: p.totalBytes,
        durationMs: Date.now() - startedAt,
      });
    }
  };
  try {
    emit({ phase: "resolving", percent: 5, message: `Resolving SimPilot Bridge v${PINNED_BRIDGE_VERSION}…` });
    toast({
      title: "Preparing your download…",
      description: `Fetching SimPilot Bridge v${PINNED_BRIDGE_VERSION}`,
    });
    const release = await resolveBridgeRelease();
    const validation = validateResolvedRelease(release);
    if (!validation.ok) {
      emit({ phase: "error", percent: 0, message: validation.message });
      toast({
        title: validation.title,
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    const { downloadUrl, name, sizeBytes } = release!.installer!;

    emit({
      phase: "downloading",
      percent: 10,
      message: "Downloading installer…",
      receivedBytes: 0,
      totalBytes: sizeBytes,
    });
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);

    const buf = await readWithProgress(fileRes, (received, total) => {
      const knownTotal = total ?? sizeBytes ?? 0;
      // Map download phase to 10–70% of the overall progress bar.
      const ratio = knownTotal > 0 ? Math.min(received / knownTotal, 1) : 0;
      emit({
        phase: "downloading",
        percent: 10 + Math.round(ratio * 60),
        message: knownTotal
          ? `Downloading installer… ${(received / 1_048_576).toFixed(1)} / ${(knownTotal / 1_048_576).toFixed(1)} MB`
          : `Downloading installer… ${(received / 1_048_576).toFixed(1)} MB`,
        receivedBytes: received,
        totalBytes: knownTotal || undefined,
      });
    });

    // Verify SHA-512 if the release published a checksum.
    if (release.sha512) {
      emit({ phase: "verifying", percent: 75, message: "Verifying SHA-512 checksum…" });
      toast({
        title: "Verifying integrity…",
        description: "Checking SHA-512 checksum.",
      });
      const digest = await crypto.subtle.digest("SHA-512", buf);
      const computedHex = bufferToHex(digest);
      if (!checksumMatches(computedHex, release.sha512, digest)) {
        emit({
          phase: "error",
          percent: 0,
          message: "Checksum mismatch — download blocked.",
        });
        toast({
          title: "Checksum mismatch — download blocked",
          description:
            "The installer didn't match the published checksum. The file may be corrupted or tampered. Please retry.",
          variant: "destructive",
        });
        return;
      }
      emit({ phase: "verifying", percent: 90, message: "Checksum verified ✓" });
    }

    emit({ phase: "saving", percent: 95, message: "Saving installer to your downloads…" });
    saveBlobAs(new Blob([buf], { type: "application/octet-stream" }), name);
    emit({
      phase: "done",
      percent: 100,
      message: release.sha512
        ? "Download started — verified ✓"
        : "Download started.",
    });
    toast({
      title: "Download started!",
      description: release.sha512
        ? "Verified ✓ — run the installer to begin your flight."
        : "Run the installer to begin your flight.",
    });
  } catch (err) {
    emit({
      phase: "error",
      percent: 0,
      message: (err as Error).message || "Download failed.",
    });
    toast({
      title: "Download failed",
      description: (err as Error).message || "Please try again in a moment.",
      variant: "destructive",
    });
  }
}
