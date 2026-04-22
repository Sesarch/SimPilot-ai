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

const DEFAULT_VERSION = "1.0.0";
const REPO_OWNER = Deno.env.get("BRIDGE_RELEASE_OWNER") ?? "Sesarch";
const REPO_NAME = Deno.env.get("BRIDGE_RELEASE_REPO") ?? "SimPilot-ai";

function filenameFor(platform: string, version: string): string | null {
  switch (platform) {
    case "windows":
      return `SimPilotBridge-Setup-${version}.exe`;
    case "macos":
      return `SimPilotBridge-${version}-mac-universal.zip`;
    case "linux":
      return `SimPilotBridge-${version}-linux-x64.tar.gz`;
    default:
      return null;
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
  version: string,
  filename: string,
): Promise<{ id: number; size: number } | null> {
  const tag = `v${version}`;
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "simpilot-bridge-download-proxy",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    assets: Array<{ id: number; name: string; size: number }>;
  };
  const match = data.assets.find((a) => a.name === filename);
  return match ? { id: match.id, size: match.size } : null;
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
  const filename = filenameFor(platform, version);
  if (!filename) {
    return jsonError(400, "Invalid platform. Use windows, macos, or linux.");
  }

  let asset: { id: number; size: number } | null = null;
  try {
    asset = await findAsset(token, version, filename);
  } catch (err) {
    return jsonError(502, `Failed to query GitHub release: ${(err as Error).message}`);
  }
  if (!asset) {
    return jsonError(
      404,
      `Asset ${filename} for v${version} is not published in ${REPO_OWNER}/${REPO_NAME}.`,
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
    return jsonError(upstream.status, `Upstream returned ${upstream.status} fetching ${filename}.`);
  }

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
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