// Lightweight CSV export helpers (no deps).

const escapeCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "object") {
    try { s = JSON.stringify(v); } catch { s = String(v); }
  } else {
    s = String(v);
  }
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length && !columns?.length) return "";
  const cols = columns ?? Array.from(rows.reduce<Set<string>>((acc, r) => {
    Object.keys(r).forEach(k => acc.add(k));
    return acc;
  }, new Set()));
  const header = cols.map(escapeCell).join(",");
  const body = rows.map(r => cols.map(c => escapeCell(r[c])).join(",")).join("\n");
  return body ? `${header}\n${body}` : header;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const csvDateStamp = () => new Date().toISOString().slice(0, 10);
