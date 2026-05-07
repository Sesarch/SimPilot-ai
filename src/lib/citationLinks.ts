import type { CitationKind, ParsedCitation } from "./citations";

export interface CitationResource {
  /** Best-effort canonical URL to the official source */
  url: string;
  /** Where the link points (eCFR, FAA, etc.) */
  source: string;
  /** Short summary of what this document covers */
  summary: string;
  /** Suggested chapters / sections users will find at the link */
  highlights?: string[];
}

/** Strip the family prefix from the label, e.g. "FAR 91.155" -> "91.155" */
export function citationNumber(c: ParsedCitation): string {
  return c.label
    .replace(/^(?:14\s*CFR(?:\s*Part)?|FAR|AIM|PHAK|AFH|IFH|AC|ACS|POH)\s*/i, "")
    .replace(/^§\s*/, "")
    .trim();
}

const SUMMARY_BY_KIND: Record<CitationKind, string> = {
  FAR: "Title 14 of the Code of Federal Regulations — the binding rules pilots are tested and certificated against.",
  AIM: "FAA's official guide to flight information, ATC procedures, airspace, and recommended practices.",
  PHAK: "Foundational handbook covering aerodynamics, weather, navigation, performance, and ADM for all certificates.",
  AFH: "Practical airplane handling: takeoffs, landings, stalls, slow flight, emergencies, and maneuvers.",
  IFH: "Instrument procedures, holding, approaches, departures, and IFR system knowledge.",
  AC: "Advisory Circular — non-regulatory FAA guidance on a specific topic.",
  ACS: "Airman Certification Standards — the exact knowledge, risk, and skill elements tested on checkrides.",
  POH: "Aircraft-specific operating handbook with limitations, procedures, and performance data.",
  REF: "Aviation reference material.",
};

const HIGHLIGHTS_BY_KIND: Partial<Record<CitationKind, string[]>> = {
  FAR: ["Definitions and abbreviations", "Pilot certification & currency", "General operating & flight rules"],
  AIM: ["Airspace classes", "Communication procedures", "Wake turbulence & weather services"],
  PHAK: ["Aerodynamics of flight", "Weather theory", "Aeronautical decision making"],
  AFH: ["Ground operations", "Approaches and landings", "Emergency procedures"],
  IFH: ["Attitude instrument flying", "Departures, en route, arrivals", "Approaches & holding"],
  ACS: ["Knowledge elements (Kn)", "Risk management (RM)", "Skill elements (SK)"],
};

/**
 * Resolve a citation to a best-effort canonical URL + context.
 * Falls back to a Google search when we can't construct a deterministic deep link.
 */
export function citationResource(c: ParsedCitation): CitationResource {
  const num = citationNumber(c);

  const summary = SUMMARY_BY_KIND[c.kind] ?? SUMMARY_BY_KIND.REF;
  const highlights = HIGHLIGHTS_BY_KIND[c.kind];

  switch (c.kind) {
    case "FAR": {
      // Try to deep-link to the eCFR section, e.g. "91.155" -> part 91, section 91.155
      const m = num.match(/^(\d+)(?:\.(\d+(?:\([a-z0-9]+\))*))?/i);
      if (m) {
        const part = m[1];
        const sec = m[2];
        const base = `https://www.ecfr.gov/current/title-14/chapter-I/part-${part}`;
        const url = sec ? `${base}/section-${part}.${sec.replace(/\([a-z0-9]+\)/gi, "")}` : base;
        return { url, source: "eCFR · 14 CFR (official)", summary, highlights };
      }
      return {
        url: `https://www.ecfr.gov/current/title-14`,
        source: "eCFR · 14 CFR (official)",
        summary,
        highlights,
      };
    }

    case "AIM":
      return {
        url: "https://www.faa.gov/air_traffic/publications/atpubs/aim_html/",
        source: "FAA · Aeronautical Information Manual",
        summary,
        highlights,
      };

    case "PHAK":
      return {
        url: "https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak",
        source: "FAA · Pilot's Handbook of Aeronautical Knowledge",
        summary,
        highlights,
      };

    case "AFH":
      return {
        url: "https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook",
        source: "FAA · Airplane Flying Handbook",
        summary,
        highlights,
      };

    case "IFH":
      return {
        url: "https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_flying_handbook",
        source: "FAA · Instrument Flying Handbook",
        summary,
        highlights,
      };

    case "AC":
      return {
        url: `https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/search?searchKey=${encodeURIComponent(num)}`,
        source: "FAA · Advisory Circulars Library",
        summary,
        highlights,
      };

    case "ACS":
      return {
        url: "https://www.faa.gov/training_testing/testing/acs",
        source: "FAA · Airman Certification Standards",
        summary,
        highlights,
      };

    case "POH":
      return {
        url: `https://www.google.com/search?q=${encodeURIComponent(`Pilot Operating Handbook ${num}`)}`,
        source: "Aircraft-specific reference",
        summary,
        highlights,
      };

    default:
      return {
        url: `https://www.google.com/search?q=${encodeURIComponent(c.label)}`,
        source: "Web reference",
        summary,
        highlights,
      };
  }
}
