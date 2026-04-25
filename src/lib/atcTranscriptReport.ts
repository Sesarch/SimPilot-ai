import { jsPDF } from "jspdf";

export type ATCTranscriptTurn = {
  role: "atc" | "pilot" | "system";
  content: string;
};

export type ATCTranscriptInput = {
  scenarioLabel: string;
  callsign?: string;
  voice?: string;
  /** Optional facility/airport context for live-frequency mode. */
  airportIcao?: string;
  facilityName?: string;
  frequency?: string;
  transcript: ATCTranscriptTurn[];
  generatedAt?: Date;
};

const ROLE_LABEL: Record<ATCTranscriptTurn["role"], string> = {
  atc: "ATC",
  pilot: "PILOT",
  system: "SYS",
};

/** Strip inline grader/correction tags from the printable transcript. */
const cleanContent = (text: string) =>
  (text || "")
    .replace(/\n?\[FEEDBACK\][\s\S]*$/i, "")
    .replace(/\[CORRECTION[^\]]*\]/gi, "")
    .trim();

/**
 * Generate a clean, shareable PDF of the full ATC training conversation.
 * Available at any point during a session — does not require grading.
 */
export function generateATCTranscriptPDF(input: ATCTranscriptInput) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 56;
  const maxY = 740;
  let y = margin;

  const newPageIfNeeded = (needed = 14) => {
    if (y + needed > maxY) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, opts?: { indent?: number; lineHeight?: number }) => {
    const indent = opts?.indent ?? 0;
    const lh = opts?.lineHeight ?? 14;
    const lines = doc.splitTextToSize(text || "—", pageW - margin * 2 - indent);
    lines.forEach((ln: string) => {
      newPageIfNeeded(lh);
      doc.text(ln, margin + indent, y);
      y += lh;
    });
  };

  const sectionHeader = (label: string) => {
    newPageIfNeeded(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(label.toUpperCase(), margin, y);
    y += 14;
    doc.setDrawColor(150);
    doc.line(margin, y - 6, pageW - margin, y - 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  // ---- Title block --------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ATC Training Transcript", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const dateStr = (input.generatedAt ?? new Date()).toLocaleString();
  doc.text(`SimPilot.AI · Radio Communications Session — ${dateStr}`, margin, y);
  y += 18;

  // ---- Session metadata ---------------------------------------------------
  const meta = [
    `Scenario: ${input.scenarioLabel}`,
    input.airportIcao ? `Airport: ${input.airportIcao}` : null,
    input.facilityName ? `Facility: ${input.facilityName}` : null,
    input.frequency ? `Frequency: ${input.frequency}` : null,
    input.callsign ? `Callsign: ${input.callsign}` : null,
    input.voice ? `Controller voice: ${input.voice}` : null,
  ]
    .filter(Boolean)
    .join("   •   ");
  if (meta) {
    writeWrapped(meta);
    y += 6;
  }

  // ---- Counts -------------------------------------------------------------
  const pilotCount = input.transcript.filter((t) => t.role === "pilot").length;
  const atcCount = input.transcript.filter((t) => t.role === "atc").length;
  doc.setFont("helvetica", "oblique");
  writeWrapped(`${pilotCount} pilot transmission${pilotCount === 1 ? "" : "s"} · ${atcCount} ATC response${atcCount === 1 ? "" : "s"}`);
  doc.setFont("helvetica", "normal");
  y += 6;

  // ---- Transcript ---------------------------------------------------------
  sectionHeader("Conversation");
  if (input.transcript.length === 0) {
    writeWrapped("(No transmissions recorded.)");
  } else {
    input.transcript.forEach((turn, i) => {
      const label = ROLE_LABEL[turn.role];
      if (turn.role === "system") {
        doc.setFont("helvetica", "oblique");
        writeWrapped(`— ${cleanContent(turn.content)} —`);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setFont("helvetica", "bold");
        writeWrapped(`${i + 1}. ${label}:`);
        doc.setFont("helvetica", "normal");
        writeWrapped(cleanContent(turn.content) || turn.content, { indent: 14 });
      }
      y += 4;
    });
  }

  // ---- Footer -------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "SimPilot.AI is a supplemental study aid and is not FAA-approved. Always defer to your CFI and current FAA publications.",
      margin,
      maxY + 30,
      { maxWidth: pageW - margin * 2 }
    );
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, maxY + 30, { align: "right" });
    doc.setTextColor(0);
  }

  const slug = input.scenarioLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`atc-transcript-${slug || "session"}-${Date.now()}.pdf`);
}
