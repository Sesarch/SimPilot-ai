// SimPilot Bridge — Asset Download Proxy
// ---------------------------------------------------------------------------
// The /flight-deck/bridge page calls this function to download the Windows /
// macOS / Linux installers. The release assets live in a private GitHub
// repository, so a direct browser link returns 404. This function uses a
// server-side GITHUB_TOKEN to fetch the asset and streams the bytes back to
// the browser as a normal file download.
//
// Query params:
//   ?platform=windows|macos|linux
//   ?version=1.0.0   (optional, defaults to PINNED_BRIDGE_VERSION)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-type, content-disposition, accept-ranges",
};

const DEFAULT_VERSION = "1.0.1";
const REPO_OWNER = Deno.env.get("BRIDGE_RELEASE_OWNER") ?? "Sesarch";
const REPO_NAME = Deno.env.get("BRIDGE_RELEASE_REPO") ?? "SimPilot-ai";

function releaseTagCandidates(version: string): string[] {
  return [`v${version}`, `bridge-v${version}`];
}

function filenameCandidatesFor(platform: string, version: string): string[] {
  switch (platform) {
    case "windows":
      // electron-builder default output uses spaces; keep the legacy hyphenated
      // name as a fallback in case an older release is still pinned.
      return [
        `SimPilot.Bridge.Setup.${version}.exe`,
        `SimPilot Bridge Setup ${version}.exe`,
        `SimPilotBridge-Setup-${version}.exe`,
      ];
    case "macos":
      return [`SimPilotBridge-${version}-mac-universal.zip`];
    case "linux":
      return [`SimPilotBridge-${version}-linux-x64.tar.gz`];
    default:
      return [];
  }
}

function filenameFor(platform: string, version: string): string | null {
  return filenameCandidatesFor(platform, version)[0] ?? null;
}

function normalizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isLikelyPlatformAsset(name: string, platform: string, version: string): boolean {
  const lower = name.toLowerCase();
  const normalized = normalizeFilename(name);
  const normalizedVersion = version.replace(/[^a-z0-9]+/g, "").toLowerCase();

  switch (platform) {
    case "windows":
      return lower.endsWith(".exe") && normalized.includes("simpilotbridge") && normalized.includes(`setup${normalizedVersion}`);
    case "macos":
      return lower.endsWith(".zip") && normalized.includes("simpilotbridge") && normalized.includes(normalizedVersion) && normalized.includes("mac");
    case "linux":
      return lower.endsWith(".tar.gz") && normalized.includes("simpilotbridge") && normalized.includes(normalizedVersion) && normalized.includes("linux");
    default:
      return false;
  }
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function findAsset(
  token: string,
  platform: string,
  version: string,
  filenames: string[],
): Promise<{ id: number; size: number; name: string } | null> {
  for (const tag of releaseTagCandidates(version)) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "simpilot-bridge-download-proxy",
      },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      assets: Array<{ id: number; name: string; size: number }>;
    };
    for (const fn of filenames) {
      const match = data.assets.find((a) => a.name === fn);
      if (match) return { id: match.id, size: match.size, name: match.name };
    }

    const normalizedCandidates = filenames.map(normalizeFilename);
    const normalizedMatch = data.assets.find((a) => normalizedCandidates.includes(normalizeFilename(a.name)));
    if (normalizedMatch) {
      return { id: normalizedMatch.id, size: normalizedMatch.size, name: normalizedMatch.name };
    }

    const fuzzyMatch = data.assets.find((a) => isLikelyPlatformAsset(a.name, platform, version));
    if (fuzzyMatch) {
      return { id: fuzzyMatch.id, size: fuzzyMatch.size, name: fuzzyMatch.name };
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    return jsonError(500, "GITHUB_TOKEN is not configured for the bridge-download function.");
  }

  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") ?? "").toLowerCase();
  const version = url.searchParams.get("version") ?? DEFAULT_VERSION;
  const checkMode = url.searchParams.get("check") === "1";

  // Availability probe: returns { windows: bool, macos: bool, linux: bool }
  // for the requested version without streaming any bytes.
  if (checkMode) {
    try {
      const platforms = ["windows", "macos", "linux"] as const;
      const results = await Promise.all(
        platforms.map(async (p) => {
          const fns = filenameCandidatesFor(p, version);
          if (fns.length === 0) return [p, false] as const;
          const a = await findAsset(token, p, version, fns);
          return [p, a !== null] as const;
        }),
      );
      const body: Record<string, unknown> = { version };
      for (const [p, ok] of results) body[p] = ok;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return jsonError(502, `Failed to query GitHub release: ${(err as Error).message}`);
    }
  }

  const candidates = filenameCandidatesFor(platform, version);
  if (candidates.length === 0) {
    return jsonError(400, "Invalid platform. Use windows, macos, or linux.");
  }

  let asset: { id: number; size: number; name: string } | null = null;
  try {
    asset = await findAsset(token, platform, version, candidates);
  } catch (err) {
    return jsonError(502, `Failed to query GitHub release: ${(err as Error).message}`);
  }
  if (!asset) {
    return jsonError(
      404,
      `No installer matching ${candidates.join(" or ")} for tags ${releaseTagCandidates(version).join(" or ")} in ${REPO_OWNER}/${REPO_NAME}.`,
    );
  }

  // Fetch the asset bytes via the GitHub API (private-repo safe).
  const assetUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${asset.id}`;
  const range = req.headers.get("range");
  const upstream = await fetch(assetUrl, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${token}`,
      "User-Agent": "simpilot-bridge-download-proxy",
      ...(range ? { Range: range } : {}),
    },
  });
  if (!upstream.ok && upstream.status !== 206) {
    return jsonError(upstream.status, `Upstream returned ${upstream.status} fetching ${asset.name}.`);
  }

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/octet-stream");
  // RFC 5987 / 6266 — provide both a sanitized ASCII fallback and a UTF-8
  // encoded filename* so spaces, unicode, and special chars round-trip
  // correctly across browsers and proxies.
  const asciiFallback = asset.name
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
  );
  headers.set("Accept-Ranges", "bytes");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  const cr = upstream.headers.get("content-range");
  if (cr) headers.set("Content-Range", cr);

  if (req.method === "HEAD") {
    return new Response(null, { status: upstream.status, headers });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
});