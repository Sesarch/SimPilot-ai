/**
 * Robust HTML meta-tag parser used by SEO live checks.
 *
 * Handles real-world variations that crawlers must tolerate:
 *   • Attribute order: `property` before/after `content`, with arbitrary
 *     unrelated attributes in between.
 *   • Quoting: double quotes, single quotes, and unquoted values.
 *   • Whitespace: tabs, multiple spaces, and newlines around `=`, between
 *     attributes, and inside the tag.
 *   • Self-closing markers (`<meta ... />`) and uppercase tag names.
 *   • Duplicate tags: first occurrence wins (matches Facebook / Twitter
 *     scraper behaviour — later duplicates are ignored).
 *   • HTML entities in `content` values (`&amp;`, `&quot;`, `&#39;`,
 *     `&#x2F;`, `&lt;`, `&gt;`, `&nbsp;`).
 *   • HTML comments and <script>/<style> blocks (skipped — meta tags
 *     inside them are ignored).
 *
 * Returns a flat record keyed by lowercased `name`/`property`. Use
 * `parseMetaTagsAll` if you need every occurrence of duplicated keys.
 */

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, body) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (Number.isFinite(code) && code > 0) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return full;
        }
      }
      return full;
    }
    const mapped = ENTITY_MAP[body.toLowerCase()];
    return mapped ?? full;
  });
}

/**
 * Strip <!-- comments -->, <script>…</script>, and <style>…</style> blocks
 * so that meta-looking strings inside them aren't picked up.
 */
function stripNonMetaBlocks(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "");
}

/**
 * Tokenise the attributes of a single tag body (everything between
 * `<meta` and the closing `>`). Supports double-quoted, single-quoted, and
 * bare values. Whitespace and newlines between tokens are tolerated.
 */
function parseAttributes(body: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // name = value, where value is "..."/'...'/bareword, OR a bare boolean attr.
  const re =
    /([a-zA-Z_:][\w:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const name = m[1].toLowerCase();
    if (name in attrs) continue; // first wins within a single tag too
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[name] = value;
  }
  return attrs;
}

/** Iterate every `<meta …>` tag in the document. */
function* iterateMetaTags(html: string): Generator<Record<string, string>> {
  const cleaned = stripNonMetaBlocks(html);
  const re = /<meta\b([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    yield parseAttributes(m[1]);
  }
}

/**
 * Parse all meta tags into a flat map keyed by `property` or `name`
 * (lowercased). When the same key appears multiple times, the **first**
 * occurrence wins — this matches how Facebook and Twitter scrapers behave
 * and prevents late, stray duplicates from clobbering the canonical value.
 */
export function parseMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attrs of iterateMetaTags(html)) {
    const key = attrs["property"] || attrs["name"] || attrs["itemprop"];
    if (!key) continue;
    const k = key.toLowerCase();
    if (k in out) continue;
    const content = attrs["content"];
    if (content === undefined) continue;
    out[k] = decodeHtmlEntities(content);
  }
  return out;
}

/**
 * Parse all meta tags but keep every duplicate occurrence. Useful when you
 * need to assert that a key is *not* duplicated, or to inspect every value
 * a scraper might consider.
 */
export function parseMetaTagsAll(html: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const attrs of iterateMetaTags(html)) {
    const key = attrs["property"] || attrs["name"] || attrs["itemprop"];
    if (!key) continue;
    const k = key.toLowerCase();
    const content = attrs["content"];
    if (content === undefined) continue;
    (out[k] ??= []).push(decodeHtmlEntities(content));
  }
  return out;
}

/** Resolve `<link rel="canonical" href="…">` regardless of attribute order. */
export function parseCanonical(html: string): string | null {
  const cleaned = stripNonMetaBlocks(html);
  const re = /<link\b([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const attrs = parseAttributes(m[1]);
    const rel = (attrs["rel"] || "").toLowerCase().split(/\s+/);
    if (!rel.includes("canonical")) continue;
    const href = attrs["href"];
    if (href) return decodeHtmlEntities(href);
  }
  return null;
}
