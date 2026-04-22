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

const RELEASE_SOURCES = [
  { owner: "simpilot-ai", repo: "bridge" },
  { owner: "Sesarch", repo: "SimPilot-ai" },
] as const;

// Versioned cache key — bumping PINNED_BRIDGE_VERSION invalidates old caches
// automatically so users always pull the new pinned release on next visit.
const RELEASE_CACHE_KEY = `simpilot:bridge-release-cache:v2:${PINNED_TAG}`;
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

type ReleaseSource = (typeof RELEASE_SOURCES)[number];

// --- Resolver diagnostics ---------------------------------------------------
// Per-attempt log of every URL the resolver tried, with HTTP status / error,
// so the bridge setup page can render a precise on-page diagnostics panel
// when discovery fails or falls back to the hard-pinned URL.
export type ReleaseAttempt = {
  kind: "tag-api" | "latest-api" | "direct-asset-yml" | "hard-fallback";
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
};

/** Timestamped attempt record for the persistent request log. */
export type ReleaseAttemptLogEntry = ReleaseAttempt & {
  /** Unix ms when the attempt completed. */
  at: number;
  /** Pinned tag the resolver was targeting at the time of the attempt. */
  tag: string;
};

let lastResolverAttempts: ReleaseAttempt[] = [];
let lastResolverUsedFallback = false;

// Rolling history of every resolver attempt across the session, capped so it
// can't grow unbounded. Surfaced via the on-page "Request log" panel.
const REQUEST_LOG_MAX = 50;
const requestLog: ReleaseAttemptLogEntry[] = [];

function recordAttempt(attempt: ReleaseAttempt): void {
  lastResolverAttempts.push(attempt);
  requestLog.push({ ...attempt, at: Date.now(), tag: PINNED_TAG });
  if (requestLog.length > REQUEST_LOG_MAX) {
    requestLog.splice(0, requestLog.length - REQUEST_LOG_MAX);
  }
}

export function getLastResolverDiagnostics(): {
  attempts: ReleaseAttempt[];
  usedHardFallback: boolean;
} {
  return { attempts: lastResolverAttempts, usedHardFallback: lastResolverUsedFallback };
}

/** Full rolling request log (newest last). */
export function getResolverRequestLog(): ReleaseAttemptLogEntry[] {
  return requestLog.slice();
}

export function clearResolverRequestLog(): void {
  requestLog.length = 0;
}

// Hard fallback source — used to synthesize a pinned release when every
// upstream discovery path fails (GitHub API rate-limited, ad-blocker, etc.).
// The button stays clickable and points at the canonical v1.0.0 asset.
const HARD_FALLBACK_SOURCE: ReleaseSource = { owner: "simpilot-ai", repo: "bridge" };

/**
 * Synthesizes a pinned-release record from the explicit v1.0.0 asset URL.
 * No network calls — guaranteed to succeed so the download button is never
 * dead. Checksum is null (verification is skipped) but the URL is still a
 * trusted GitHub release asset, so `validateResolvedRelease` will accept it.
 */
function buildHardFallbackRelease(): ResolvedBridgeRelease {
  const installerName = `SimPilotBridge-Setup-${PINNED_BRIDGE_VERSION}.exe`;
  return {
    tagName: PINNED_TAG,
    publishedAt: null,
    htmlUrl: `https://github.com/${HARD_FALLBACK_SOURCE.owner}/${HARD_FALLBACK_SOURCE.repo}/releases/tag/${PINNED_TAG}`,
    installer: {
      name: installerName,
      downloadUrl: buildReleaseAssetUrl(HARD_FALLBACK_SOURCE, installerName),
      sizeBytes: 0,
    },
    sha512: null,
  };
}

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

/**
 * Fully clears any cached release metadata + diagnostics + in-flight
 * resolution promise. Used by the Retry button so the next resolve call
 * starts from a completely clean slate (no stale "no installer" entry, no
 * leftover hard-fallback flag, no piggy-backing on a pending request).
 */
export function clearBridgeReleaseCache(): void {
  try {
    localStorage.removeItem(RELEASE_CACHE_KEY);
  } catch {
    /* private mode — non-fatal */
  }
  lastResolverAttempts = [];
  lastResolverUsedFallback = false;
  inFlightResolve = null;
}

let inFlightResolve: Promise<ResolvedBridgeRelease | null> | null = null;

function writeCache(release: ResolvedBridgeRelease | null) {
  try {
    if (!release) {
      localStorage.removeItem(RELEASE_CACHE_KEY);
      return;
    }
    localStorage.setItem(
      RELEASE_CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), release } satisfies ReleaseCacheEntry),
    );
  } catch {
    /* private mode / quota — non-fatal */
  }
}

async function fetchReleaseFromApi(
  url: string,
  kind: "tag-api" | "latest-api",
): Promise<ResolvedBridgeRelease | null> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  } catch (err) {
    lastResolverAttempts.push({ kind, url, status: null, ok: false, error: (err as Error).message });
    throw err;
  }
  lastResolverAttempts.push({ kind, url, status: res.status, ok: res.ok });
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

function buildReleaseApiUrl(source: ReleaseSource, kind: "tag" | "latest"): string {
  const base = `https://api.github.com/repos/${source.owner}/${source.repo}/releases`;
  return kind === "tag" ? `${base}/tags/${PINNED_TAG}` : `${base}/latest`;
}

function buildReleaseAssetUrl(source: ReleaseSource, filename: string): string {
  return `https://github.com/${source.owner}/${source.repo}/releases/download/${PINNED_TAG}/${filename}`;
}

async function fetchReleaseFromDirectAssets(source: ReleaseSource): Promise<ResolvedBridgeRelease | null> {
  const installerName = `SimPilotBridge-Setup-${PINNED_BRIDGE_VERSION}.exe`;
  const installerUrl = buildReleaseAssetUrl(source, installerName);
  const ymlUrl = buildReleaseAssetUrl(source, "latest.yml");

  try {
    let ymlRes: Response;
    try {
      ymlRes = await fetch(ymlUrl, { cache: "no-store" });
    } catch (err) {
      lastResolverAttempts.push({
        kind: "direct-asset-yml",
        url: ymlUrl,
        status: null,
        ok: false,
        error: (err as Error).message,
      });
      return null;
    }
    lastResolverAttempts.push({
      kind: "direct-asset-yml",
      url: ymlUrl,
      status: ymlRes.status,
      ok: ymlRes.ok,
    });
    if (!ymlRes.ok) return null;

    const yml = await ymlRes.text();
    const shaMatch = yml.match(/^sha512:\s*(\S+)/m);
    const versionMatch = yml.match(/^version:\s*(\S+)/m);
    const sizeMatch = yml.match(/^\s+size:\s*(\d+)/m);
    const releaseDateMatch = yml.match(/^releaseDate:\s*['"]?([^'"\n]+)['"]?/m);

    const version = versionMatch?.[1]?.trim();
    if (version !== PINNED_BRIDGE_VERSION) return null;

    return {
      tagName: PINNED_TAG,
      publishedAt: releaseDateMatch?.[1] ?? null,
      htmlUrl: `https://github.com/${source.owner}/${source.repo}/releases/tag/${PINNED_TAG}`,
      installer: {
        name: installerName,
        downloadUrl: installerUrl,
        sizeBytes: Number(sizeMatch?.[1] ?? 0),
      },
      sha512: shaMatch?.[1] ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the pinned release (v1.0.0) with a transparent fallback to the
 * latest published release. Cached in localStorage for 10 minutes.
 */
export async function resolveBridgeRelease(
  options: { forceRefresh?: boolean } = {},
): Promise<ResolvedBridgeRelease | null> {
  if (options.forceRefresh) {
    // Caller explicitly wants a clean slate — wipe cache + diagnostics + any
    // pending in-flight resolution so we don't piggy-back on a stale request.
    clearBridgeReleaseCache();
  } else {
    const cached = readCache();
    if (cached) return cached.release;
    // Dedupe concurrent callers (Hero CTA + setup page mounting at once).
    if (inFlightResolve) return inFlightResolve;
  }

  const run = (async (): Promise<ResolvedBridgeRelease | null> => {
    lastResolverAttempts = [];
    lastResolverUsedFallback = false;

    for (const source of RELEASE_SOURCES) {
      let resolved: ResolvedBridgeRelease | null = null;
      try {
        resolved = await fetchReleaseFromApi(buildReleaseApiUrl(source, "tag"), "tag-api");
        if (!resolved) {
          resolved = await fetchReleaseFromApi(buildReleaseApiUrl(source, "latest"), "latest-api");
        }
      } catch {
        resolved = null;
      }
      if (!resolved) {
        resolved = await fetchReleaseFromDirectAssets(source);
      }
      if (resolved) {
        writeCache(resolved);
        return resolved;
      }
    }

    const fallback = buildHardFallbackRelease();
    lastResolverUsedFallback = true;
    lastResolverAttempts.push({
      kind: "hard-fallback",
      url: fallback.installer!.downloadUrl,
      status: null,
      ok: true,
    });
    writeCache(fallback);
    return fallback;
  })();

  inFlightResolve = run;
  try {
    return await run;
  } finally {
    if (inFlightResolve === run) inFlightResolve = null;
  }
}

/**
 * Runtime guard: ensures the resolved release is the pinned v1.0.0 build and
 * that its installer asset is a valid direct GitHub release download URL
 * matching the expected `SimPilotBridge-Setup-<version>.exe` filename. Any
 * mismatch (missing asset, wrong tag, non-GitHub host) surfaces a clear,
 * user-facing error instead of silently downloading the wrong file.
 */
export type ReleaseValidation =
  | { ok: true }
  | { ok: false; title: string; message: string };

export function validateResolvedRelease(
  release: ResolvedBridgeRelease | null,
): ReleaseValidation {
  if (!release) {
    return {
      ok: false,
      title: "Installer not available yet",
      message: "The release server didn't return a published build. Please try again in a moment.",
    };
  }
  if (!release.installer) {
    return {
      ok: false,
      title: "Installer asset missing",
      message: `Release ${release.tagName} is published but the SimPilotBridge installer asset is missing. Please try again shortly.`,
    };
  }
  if (release.tagName !== PINNED_TAG) {
    return {
      ok: false,
      title: "Unexpected release version",
      message: `Expected SimPilot Bridge ${PINNED_TAG} but the server returned ${release.tagName}. Refresh the page and try again.`,
    };
  }
  const { downloadUrl, name } = release.installer;
  const expectedName = `SimPilotBridge-Setup-${PINNED_BRIDGE_VERSION}.exe`;
  if (name !== expectedName) {
    return {
      ok: false,
      title: "Installer asset mismatch",
      message: `Expected "${expectedName}" but received "${name}". Please report this if it persists.`,
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(downloadUrl);
  } catch {
    return {
      ok: false,
      title: "Invalid installer URL",
      message: "The release server returned a malformed download URL. Please try again shortly.",
    };
  }
  const isGithubAsset =
    (parsed.hostname === "github.com" || parsed.hostname === "objects.githubusercontent.com") &&
    parsed.protocol === "https:";
  if (!isGithubAsset) {
    return {
      ok: false,
      title: "Untrusted download source",
      message: "The installer URL didn't resolve to an official GitHub release asset. Download blocked for safety.",
    };
  }
  return { ok: true };
}

/**
 * Preflight HEAD request against the pinned installer URL. Confirms the
 * asset is publicly reachable (no auth wall, no 404, no network block) before
 * we start streaming the full download. Falls back to a tiny ranged GET if
 * the host rejects HEAD on release assets.
 */
export type PreflightResult =
  | { ok: true; status: number }
  | { ok: false; title: string; message: string; status: number | null };

export async function preflightInstallerUrl(url: string): Promise<PreflightResult> {
  const probe = async (method: "HEAD" | "GET"): Promise<Response | { error: string }> => {
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        ...(method === "GET" ? { headers: { Range: "bytes=0-0" } } : {}),
      });
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  let res = await probe("HEAD");
  if ("error" in res) {
    return {
      ok: false,
      title: "Can't reach the release server",
      message: `Network error while checking the installer URL: ${res.error}. Check your connection or any ad-blocker, then retry.`,
      status: null,
    };
  }
  if (res.status === 405 || res.status === 403) {
    const retry = await probe("GET");
    if ("error" in retry) {
      return {
        ok: false,
        title: "Can't reach the release server",
        message: `Network error while checking the installer URL: ${retry.error}. Check your connection or any ad-blocker, then retry.`,
        status: null,
      };
    }
    res = retry;
  }

  if (res.status === 404) {
    return {
      ok: false,
      title: "Installer not published yet",
      message: `The pinned SimPilot Bridge ${PINNED_TAG} installer isn't publicly reachable at the expected URL (404). Please try again shortly.`,
      status: 404,
    };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      title: "Installer not publicly reachable",
      message: `The release server returned ${res.status} for the pinned installer URL. The asset may be private or rate-limited. Please try again shortly.`,
      status: res.status,
    };
  }
  if (!res.ok && res.status !== 206) {
    return {
      ok: false,
      title: "Release server unavailable",
      message: `The release server returned HTTP ${res.status} for the pinned installer URL. Please try again in a moment.`,
      status: res.status,
    };
  }
  return { ok: true, status: res.status };
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
    if (validation.ok !== true) {
      emit({ phase: "error", percent: 0, message: validation.message });
      toast({
        title: validation.title,
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    const { downloadUrl, name, sizeBytes } = release!.installer!;

    // Preflight: confirm the pinned installer URL is publicly reachable
    // before we kick off the full download. Blocks with a clear message if
    // GitHub returns 404 / 403 / network-blocked, so the user isn't left
    // staring at a stalled progress bar.
    emit({ phase: "resolving", percent: 8, message: "Checking installer availability…" });
    const preflight = await preflightInstallerUrl(downloadUrl);
    if (preflight.ok !== true) {
      emit({ phase: "error", percent: 0, message: preflight.message });
      toast({
        title: preflight.title,
        description: preflight.message,
        variant: "destructive",
      });
      return;
    }

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
