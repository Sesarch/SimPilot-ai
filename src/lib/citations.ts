import { BookOpen, FileText, Scale, Plane } from "lucide-react";
import type { ComponentType } from "react";

export type CitationKind = "FAR" | "AIM" | "PHAK" | "AFH" | "IFH" | "AC" | "ACS" | "POH" | "REF";

export interface ParsedCitation {
  /** Source family — drives icon + color */
  kind: CitationKind;
  /** The full matched citation text, e.g. "14 CFR 91.155" */
  label: string;
  /** Optional short subtitle, e.g. "Basic VFR Weather Minimums" if found in trailing text */
  detail?: string;
}

export interface ExplanationParts {
  /** Prose with citation phrases removed and tidied. */
  prose: string;
  /** Detected citations, in order, deduplicated. */
  citations: ParsedCitation[];
}

// Match patterns. Order matters — most specific first.
const PATTERNS: { kind: CitationKind; re: RegExp }[] = [
  // 14 CFR 91.155, 14 CFR §91.155, 14 CFR Part 61, 14 CFR 61.57(c)
  { kind: "FAR", re: /\b14\s*CFR\s*(?:Part\s*)?§?\s*\d+(?:\.\d+(?:\([a-z0-9]+\))*)?/gi },
  // FAR 91.155 / FAR §91.155
  { kind: "FAR", re: /\bFAR\s*§?\s*\d+(?:\.\d+(?:\([a-z0-9]+\))*)?/gi },
  // AIM 4-1-9 / AIM Chapter 7
  { kind: "AIM", re: /\bAIM\s*(?:Ch(?:apter|\.)?\s*)?\d+(?:[-.\u2013]\d+){0,3}/gi },
  // PHAK Ch 12 / PHAK Chapter 12 / PHAK 12-3
  { kind: "PHAK", re: /\bPHAK\s*(?:Ch(?:apter|\.)?\s*)?\d+(?:[-.\u2013]\d+)?/gi },
  // AFH Ch 5 / IFH Ch 4
  { kind: "AFH", re: /\bAFH\s*(?:Ch(?:apter|\.)?\s*)?\d+(?:[-.\u2013]\d+)?/gi },
  { kind: "IFH", re: /\bIFH\s*(?:Ch(?:apter|\.)?\s*)?\d+(?:[-.\u2013]\d+)?/gi },
  // AC 00-6B / AC 61-67C
  { kind: "AC", re: /\bAC\s*\d{2,3}-\d{1,3}[A-Z]?/gi },
  // ACS PA.I.A.K1
  { kind: "ACS", re: /\b(?:ACS\s*)?[A-Z]{2,3}\.[IVX]+\.[A-Z]\.[A-Z]\d+/g },
  // POH §5
  { kind: "POH", re: /\bPOH\s*(?:Section|§)?\s*\d+(?:\.\d+)?/gi },
];

export function parseExplanation(text: string): ExplanationParts {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { prose: "", citations: [] };

  const found: ParsedCitation[] = [];
  const seen = new Set<string>();
  let working = trimmed;

  for (const { kind, re } of PATTERNS) {
    const matches = working.match(re);
    if (!matches) continue;
    for (const m of matches) {
      const key = `${kind}:${m.toLowerCase().replace(/\s+/g, " ").trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ kind, label: m.replace(/\s+/g, " ").trim() });
    }
  }

  // Tidy prose: collapse "(per X, Y)" and "— see X" leftovers, then trim spaces.
  let prose = trimmed
    .replace(/\s*\((?:see|per|cf\.?|ref(?:erence)?:?)\s*[^)]*\)\s*/gi, " ")
    .replace(/\s+—\s*(?:see|per|ref(?:erence)?:?)\s+[^.;]*[.;]?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

  // Strip a trailing "Sources:" / "Reference:" line if it's just citation text.
  prose = prose.replace(/\b(?:Sources?|References?):?\s*$/i, "").trim();

  return { prose, citations: found };
}

const ICON_BY_KIND: Record<CitationKind, ComponentType<{ className?: string }>> = {
  FAR: Scale,
  AIM: Plane,
  PHAK: BookOpen,
  AFH: BookOpen,
  IFH: BookOpen,
  AC: FileText,
  ACS: FileText,
  POH: FileText,
  REF: FileText,
};

const FULL_NAME: Record<CitationKind, string> = {
  FAR: "Federal Aviation Regulation",
  AIM: "Aeronautical Information Manual",
  PHAK: "Pilot's Handbook of Aeronautical Knowledge",
  AFH: "Airplane Flying Handbook",
  IFH: "Instrument Flying Handbook",
  AC: "Advisory Circular",
  ACS: "Airman Certification Standards",
  POH: "Pilot Operating Handbook",
  REF: "Reference",
};

export function citationIcon(kind: CitationKind) {
  return ICON_BY_KIND[kind] ?? FileText;
}

export function citationFullName(kind: CitationKind): string {
  return FULL_NAME[kind] ?? "Reference";
}
