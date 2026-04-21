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

// --- Pinned version ---------------------------------------------------------
// Bump this constant when cutting a new public release. The downloader will
// always look for this exact tag first; if the upstream returns 404 (e.g. the
// tag hasn't been published yet) it transparently falls back to /latest so
// the button never goes dead.
export const PINNED_BRIDGE_VERSION = "1.0.0";
const PINNED_TAG = `v${PINNED_BRIDGE_VERSION}`;

const RELEASE_API_BY_TAG = `https://api.github.com/repos/simpilot-ai/bridge/releases/tags/${PINNED_TAG}`;
const RELEASE_API_LATEST = "https://api.github.com/repos/simpilot-ai/bridge/releases/latest";

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
 * End-to-end: resolve → fetch → verify SHA-512 → save. Fires user-facing
 * toasts at each milestone. Never throws — surfaces errors via toast.
 */
export async function downloadAndVerifyInstaller(): Promise<void> {
  try {
    toast({
      title: "Preparing your download…",
      description: `Fetching SimPilot Bridge v${PINNED_BRIDGE_VERSION}`,
    });
    const release = await resolveBridgeRelease();
    if (!release?.installer) {
      toast({
        title: "Installer not available yet",
        description: "The release is still being prepared — please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    const { downloadUrl, name } = release.installer;
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);
    const buf = await fileRes.arrayBuffer();

    // Verify SHA-512 if the release published a checksum.
    if (release.sha512) {
      toast({
        title: "Verifying integrity…",
        description: "Checking SHA-512 checksum.",
      });
      const digest = await crypto.subtle.digest("SHA-512", buf);
      const computedHex = bufferToHex(digest);
      if (!checksumMatches(computedHex, release.sha512, digest)) {
        toast({
          title: "Checksum mismatch — download blocked",
          description:
            "The installer didn't match the published checksum. The file may be corrupted or tampered. Please retry.",
          variant: "destructive",
        });
        return;
      }
    }

    saveBlobAs(new Blob([buf], { type: "application/octet-stream" }), name);
    toast({
      title: "Download started!",
      description: release.sha512
        ? "Verified ✓ — run the installer to begin your flight."
        : "Run the installer to begin your flight.",
    });
  } catch (err) {
    toast({
      title: "Download failed",
      description: (err as Error).message || "Please try again in a moment.",
      variant: "destructive",
    });
  }
}
