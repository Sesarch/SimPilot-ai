// Lightweight, deterministic 384-dim "semantic-ish" embedding.
// No external API needed — works for both ingest and query so cosine
// similarity matches up. Based on hashed bag-of-words TF with simple
// English stopword removal and L2 normalization. Good enough to retrieve
// the right paragraph from FAA handbooks; can be swapped for a real
// embedding model later by re-running ingest.

export const EMBED_DIM = 384;

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","of","at","by","for","with",
  "about","against","between","into","through","during","before","after","above",
  "below","to","from","up","down","in","out","on","off","over","under","again",
  "further","once","here","there","when","where","why","how","all","any","both",
  "each","few","more","most","other","some","such","no","nor","not","only","own",
  "same","so","than","too","very","s","t","can","will","just","don","should","now",
  "is","am","are","was","were","be","been","being","have","has","had","do","does",
  "did","i","me","my","we","our","you","your","he","him","his","she","her","it",
  "its","they","them","their","this","that","these","those","what","which","who",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && w.length < 40 && !STOPWORDS.has(w));
}

// FNV-1a 32-bit hash
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function embedText(text: string): number[] {
  const vec = new Float32Array(EMBED_DIM);
  const tokens = tokenize(text);
  if (tokens.length === 0) return Array.from(vec);

  // Unigrams
  for (const tok of tokens) {
    const h = hash32(tok) % EMBED_DIM;
    const sign = (hash32("s:" + tok) & 1) === 0 ? 1 : -1;
    vec[h] += sign;
  }
  // Bigrams (capture phrases like "flight following", "spot 5")
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = tokens[i] + "_" + tokens[i + 1];
    const h = hash32(bg) % EMBED_DIM;
    const sign = (hash32("sb:" + bg) & 1) === 0 ? 1 : -1;
    vec[h] += sign * 0.6;
  }

  // L2 normalize
  let sum = 0;
  for (let i = 0; i < EMBED_DIM; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Array<number>(EMBED_DIM);
  for (let i = 0; i < EMBED_DIM; i++) out[i] = vec[i] / norm;
  return out;
}

// pgvector text format: "[0.1,0.2,...]"
export function toPgVector(vec: number[]): string {
  return "[" + vec.map((v) => v.toFixed(6)).join(",") + "]";
}

// Split long text into ~900-char chunks, breaking on paragraph/sentence
// boundaries when possible. Returns chunks with approximate page numbers
// when the input contains "\f" form-feeds (one per page from unpdf).
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlap?: number } = {}
): { content: string; page: number | null; section: string | null }[] {
  const maxChars = opts.maxChars ?? 900;
  const overlap = opts.overlap ?? 120;

  // Split into pages using form-feed if present
  const rawPages = text.split(/\f/);
  const pages: { page: number | null; text: string }[] = rawPages.map((p, i) => ({
    page: rawPages.length > 1 ? i + 1 : null,
    text: p,
  }));

  const chunks: { content: string; page: number | null; section: string | null }[] = [];

  for (const { page, text: pageText } of pages) {
    const cleaned = pageText.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!cleaned) continue;

    // Naive section detection: lines like "4-3-2", "Chapter 5", "Section 4.3"
    let currentSection: string | null = null;
    const sectionRe =
      /^(?:Chapter\s+\d+[^\n]{0,80}|Section\s+[\d\.]+[^\n]{0,80}|\d+-\d+-\d+[^\n]{0,80}|[A-Z][A-Z0-9 ,\/&-]{4,80})$/m;

    let cursor = 0;
    while (cursor < cleaned.length) {
      // Try to grow up to maxChars but break on a paragraph or sentence
      const end = Math.min(cursor + maxChars, cleaned.length);
      let slice = cleaned.slice(cursor, end);

      if (end < cleaned.length) {
        const lastPara = slice.lastIndexOf("\n\n");
        const lastSent = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
        const breakAt = lastPara > maxChars * 0.5 ? lastPara : lastSent > maxChars * 0.5 ? lastSent + 1 : -1;
        if (breakAt > 0) slice = slice.slice(0, breakAt);
      }

      const sliceTrim = slice.trim();
      if (sliceTrim.length > 40) {
        const m = sliceTrim.match(sectionRe);
        if (m) currentSection = m[0].trim().slice(0, 120);
        chunks.push({
          content: sliceTrim,
          page,
          section: currentSection,
        });
      }

      cursor += slice.length - overlap;
      if (cursor < 0) cursor = slice.length;
      if (slice.length === 0) break;
    }
  }

  return chunks;
}
