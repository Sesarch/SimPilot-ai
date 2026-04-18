import { jsPDF } from "jspdf";

export type ATCDebriefTurn = {
  role: "atc" | "pilot" | "system";
  content: string;
};

export type ATCDebriefWeakArea = {
  category: string;
  issue: string;
  example?: string;
};

export type ATCDebriefInput = {
  scenarioLabel: string;
  callsign?: string;
  voice?: string;
  score: number;
  total: number;
  result: "PASS" | "FAIL";
  summary: string;
  weak_areas: ATCDebriefWeakArea[];
  transcript: ATCDebriefTurn[];
  /** Optional anonymized cohort percentile */
  percentile?: { percentile: number; sample_size: number } | null;
  generatedAt?: Date;
};

const ROLE_LABEL: Record<ATCDebriefTurn["role"], string> = {
  atc: "ATC",
  pilot: "PILOT",
  system: "SYS",
};

/** Strip the inline `[FEEDBACK] ...` block from ATC turns for the printable transcript. */
const splitAtcContent = (content: string) => {
  const [spoken, ...rest] = content.split(/\n?\[FEEDBACK\]/i);
  return {
    spoken: (spoken || "").trim(),
    feedback: rest.join(" ").trim(),
  };
};

/**
 * Generates a downloadable "Radio Communications Debrief" PDF for a scored
 * ATC scenario. Mirrors the structure of the Checkride Readiness Report.
 */
export function generateATCDebriefPDF(input: ATCDebriefInput) {
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
  doc.text("Radio Communications Debrief", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const dateStr = (input.generatedAt ?? new Date()).toLocaleString();
  doc.text(`SimPilot.AI · ATC Phraseology Drill — ${dateStr}`, margin, y);
  y += 22;

  // ---- Result banner ------------------------------------------------------
  const pct = input.total > 0 ? Math.round((input.score / input.total) * 100) : 0;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Result: ${input.result}`, margin, y);
  doc.text(`Score: ${input.score}/${input.total} (${pct}%)`, pageW - margin, y, { align: "right" });
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const meta = [
    `Scenario: ${input.scenarioLabel}`,
    input.callsign ? `Callsign: ${input.callsign}` : null,
    input.voice ? `Controller voice: ${input.voice}` : null,
  ]
    .filter(Boolean)
    .join("   •   ");
  doc.text(meta, margin, y);
  y += 22;

  // ---- Summary ------------------------------------------------------------
  if (input.summary) {
    sectionHeader("Examiner Summary");
    writeWrapped(input.summary);
    y += 6;
  }

  // ---- Percentile ---------------------------------------------------------
  if (input.percentile && input.percentile.sample_size >= 5) {
    sectionHeader("Community Percentile");
    writeWrapped(
      `You scored higher than ${input.percentile.percentile}% of SimPilot pilots on ATC phraseology drills. ` +
        `Based on ${input.percentile.sample_size.toLocaleString()} anonymized sessions.`
    );
    y += 6;
  }

  // ---- Weak areas ---------------------------------------------------------
  if (input.weak_areas.length > 0) {
    sectionHeader("Areas To Review");
    input.weak_areas.forEach((w) => {
      doc.setFont("helvetica", "bold");
      writeWrapped(`• ${w.category}`);
      doc.setFont("helvetica", "normal");
      writeWrapped(`Issue: ${w.issue}`, { indent: 14 });
      if (w.example) writeWrapped(`Example: "${w.example}"`, { indent: 14 });
      y += 4;
    });
    y += 4;
  }

  // ---- Transcript ---------------------------------------------------------
  sectionHeader("Transcript");
  if (input.transcript.length === 0) {
    writeWrapped("(No transmissions recorded.)");
  } else {
    input.transcript.forEach((turn, i) => {
      const label = ROLE_LABEL[turn.role];
      if (turn.role === "atc") {
        const { spoken, feedback } = splitAtcContent(turn.content);
        doc.setFont("helvetica", "bold");
        writeWrapped(`${i + 1}. ${label}:`);
        doc.setFont("helvetica", "normal");
        writeWrapped(spoken || turn.content, { indent: 14 });
        if (feedback) {
          doc.setFont("helvetica", "oblique");
          writeWrapped(`Feedback: ${feedback}`, { indent: 14 });
          doc.setFont("helvetica", "normal");
        }
      } else if (turn.role === "pilot") {
        doc.setFont("helvetica", "bold");
        writeWrapped(`${i + 1}. ${label}:`);
        doc.setFont("helvetica", "normal");
        writeWrapped(turn.content, { indent: 14 });
      } else {
        doc.setFont("helvetica", "oblique");
        writeWrapped(`— ${turn.content} —`);
        doc.setFont("helvetica", "normal");
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
  doc.save(`atc-debrief-${slug || "scenario"}-${Date.now()}.pdf`);
}
