import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Plane, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PmdgDebrief {
  generated_at?: string;
  variant?: string | null;
  aircraft_title?: string | null;
  duration_minutes?: number | null;
  departure?: string | null;
  destination?: string | null;
  summary?: string;
  scores?: {
    automation?: number;
    flap_schedule?: number;
    stable_approach?: number;
  };
  automation?: {
    ap_engagement_call?: string;
    at_usage_call?: string;
    engage_disengage_count?: number;
    issues?: string[];
  };
  flap_schedule?: {
    findings?: Array<{
      flap_setting: number;
      ias_kt: number;
      placard_kt?: number;
      exceedance_kt?: number;
      time_mmss?: string;
      verdict: "ok" | "marginal" | "exceedance";
      note?: string;
    }>;
  };
  stable_approach?: {
    verdict?: "stable" | "marginal" | "unstable" | "unknown";
    note?: string;
  };
  recommendations?: string[];
  event_timeline?: unknown[];
}

interface PmdgDebriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: string | null;
  debrief?: PmdgDebrief | null;
}

const scoreColor = (n?: number) => {
  if (n == null) return "text-muted-foreground";
  if (n >= 85) return "text-[hsl(var(--cyan-glow))]";
  if (n >= 70) return "text-[hsl(var(--amber-instrument))]";
  return "text-destructive";
};

// PMDG 737 flaps_handle_index → physical detent label
// Index: 0=UP, 1=1, 2=2, 3=5, 4=10, 5=15, 6=25, 7=30, 8=40
const FLAP_DETENT_LABELS = ["UP", "1", "2", "5", "10", "15", "25", "30", "40"] as const;
const flapLabel = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  const i = Math.round(n);
  return FLAP_DETENT_LABELS[i] ?? String(n);
};

// jsPDF's built-in helvetica only ships WinAnsi glyphs, so anything outside
// that range (≥, →, °, smart quotes, em-dashes, …) renders as a stray "e" or
// drops out. Replace common aviation/AI-emitted unicode with ASCII fallbacks
// before drawing into the PDF.
const PDF_UNICODE_MAP: Array<[RegExp, string]> = [
  [/[\u2192\u279C\u27A1\u2794]/g, "->"],   // → ➜ ➡ ➔
  [/[\u2190]/g, "<-"],                     // ←
  [/[\u2194]/g, "<->"],                    // ↔
  [/[\u2191]/g, "^"],                      // ↑
  [/[\u2193]/g, "v"],                      // ↓
  [/\u2265/g, ">="],                       // ≥
  [/\u2264/g, "<="],                       // ≤
  [/\u2260/g, "!="],                       // ≠
  [/\u00B1/g, "+/-"],                      // ±
  [/\u00D7/g, "x"],                        // ×
  [/\u00F7/g, "/"],                        // ÷
  [/\u00B0/g, " deg"],                     // °
  [/[\u2018\u2019\u02BC]/g, "'"],          // ' ' ʼ
  [/[\u201C\u201D]/g, '"'],                // " "
  [/[\u2013\u2014]/g, "-"],                // – —
  [/\u2026/g, "..."],                      // …
  [/\u00A0/g, " "],                        // nbsp
  [/[\u2022\u25CF\u25E6]/g, "*"],          // • ● ◦
  [/\u00B7/g, "."],                        // ·
];
const pdfSafe = (input: unknown): string => {
  if (input == null) return "";
  let s = String(input);
  for (const [re, rep] of PDF_UNICODE_MAP) s = s.replace(re, rep);
  // Strip anything still outside printable WinAnsi range
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
  return s;
};

const verdictBadge = (v?: string) => {
  switch (v) {
    case "ok":
    case "stable":
      return { className: "border-primary/40 bg-primary/10 text-primary", icon: CheckCircle2 };
    case "marginal":
      return {
        className: "border-amber-500/40 bg-amber-500/10 text-amber-500",
        icon: AlertTriangle,
      };
    case "exceedance":
    case "unstable":
      return {
        className: "border-destructive/50 bg-destructive/10 text-destructive",
        icon: AlertTriangle,
      };
    default:
      return { className: "border-border text-muted-foreground", icon: AlertTriangle };
  }
};

const PmdgDebriefModal = ({
  open,
  onOpenChange,
  loading,
  error,
  debrief,
}: PmdgDebriefModalProps) => {
  // Force a brief mounting delay so the loading state isn't a flash
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => setShow(true), 50);
      return () => window.clearTimeout(id);
    }
    setShow(false);
  }, [open]);

  const loadLogoDataUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch("/favicon.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    if (!debrief) return;
    const logoDataUrl = await loadLogoDataUrl();

    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = margin;

    // === Cockpit-style header band ===
    const bandHeight = 88;
    // Deep navy base
    doc.setFillColor(8, 15, 30);
    doc.rect(0, 0, pageWidth, bandHeight, "F");
    // Subtle inner panel band (slightly lighter navy) for depth
    doc.setFillColor(15, 25, 46);
    doc.rect(0, 18, pageWidth, bandHeight - 18, "F");
    // Teal cockpit accent stripe (SimPilot primary ~ #009199)
    doc.setFillColor(0, 145, 153);
    doc.rect(0, bandHeight, pageWidth, 3, "F");
    // Amber instrument tick line above stripe
    doc.setFillColor(245, 158, 11);
    doc.rect(margin, bandHeight - 4, 36, 2, "F");

    // Logo (left)
    let textLeft = margin;
    if (logoDataUrl) {
      try {
        const logoSize = 44;
        doc.addImage(logoDataUrl, "PNG", margin, (bandHeight - logoSize) / 2, logoSize, logoSize);
        textLeft = margin + logoSize + 14;
      } catch {
        // fall through, no logo
      }
    }

    // Brand label
    doc.setTextColor(0, 200, 210);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SIMPILOT  -  FLIGHT OPERATIONS", textLeft, 26, { charSpace: 1.2 });

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("PMDG POST-FLIGHT DEBRIEF", textLeft, 48);

    // Sub-line (route / variant / duration) in mono-ish style
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 195, 215);
    const sub = [
      pdfSafe(debrief.variant ?? "PMDG"),
      debrief.departure || debrief.destination
        ? `${pdfSafe(debrief.departure ?? "????")}  >  ${pdfSafe(debrief.destination ?? "????")}`
        : null,
      debrief.duration_minutes != null ? `${debrief.duration_minutes.toFixed(1)} MIN` : null,
    ]
      .filter(Boolean)
      .join("   |   ");
    doc.text(sub.toUpperCase(), textLeft, 66);

    // Right-side timestamp block (cockpit clock feel)
    const ts = debrief.generated_at ? new Date(debrief.generated_at) : new Date();
    const dateStr = ts.toISOString().slice(0, 10).replace(/-/g, ".");
    const timeStr = ts.toISOString().slice(11, 16) + "Z";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 200, 210);
    doc.text("REPORT GENERATED", pageWidth - margin, 26, { align: "right", charSpace: 1.2 });
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(dateStr, pageWidth - margin, 44, { align: "right" });
    doc.setFontSize(9);
    doc.setTextColor(180, 195, 215);
    doc.text(timeStr, pageWidth - margin, 60, { align: "right" });

    // Reset for body
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    y = bandHeight + 24;

    // Scores
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SCORES", margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Automation", "Flap Schedule", "Stable Approach"]],
      body: [[
        debrief.scores?.automation != null ? String(debrief.scores.automation) : "-",
        debrief.scores?.flap_schedule != null ? String(debrief.scores.flap_schedule) : "-",
        debrief.scores?.stable_approach != null ? String(debrief.scores.stable_approach) : "-",
      ]],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center", fontSize: 18, fontStyle: "bold", cellPadding: 10 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 18;

    // Summary
    if (debrief.summary) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SUMMARY", margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(pdfSafe(debrief.summary), pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 10;
    }

    // Automation
    if (debrief.automation) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("AUTOMATION DISCIPLINE", margin, y);
      y += 8;
      const rows: string[][] = [];
      if (debrief.automation.ap_engagement_call)
        rows.push(["A/P engagement", pdfSafe(debrief.automation.ap_engagement_call)]);
      if (debrief.automation.at_usage_call)
        rows.push(["A/T usage", pdfSafe(debrief.automation.at_usage_call)]);
      if (debrief.automation.engage_disengage_count != null)
        rows.push(["Engage/Disengage cycles", String(debrief.automation.engage_disengage_count)]);
      (debrief.automation.issues ?? []).forEach((i) => rows.push(["Issue", pdfSafe(i)]));
      if (rows.length) {
        autoTable(doc, {
          startY: y,
          body: rows,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 6 },
          columnStyles: { 0: { fontStyle: "bold", cellWidth: 130 } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 18;
      }
    }

    // Flap schedule
    if (debrief.flap_schedule?.findings?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("FLAP SPEED SCHEDULE", margin, y);
      y += 8;
      // Verdict color palette (matches on-screen badges)
      const verdictFill: Record<string, [number, number, number]> = {
        ok: [220, 245, 230],         // soft green
        marginal: [254, 243, 199],   // soft amber
        exceedance: [254, 226, 226], // soft red
      };
      const verdictText: Record<string, [number, number, number]> = {
        ok: [22, 101, 52],           // green-800
        marginal: [146, 64, 14],     // amber-800
        exceedance: [153, 27, 27],   // red-800
      };
      autoTable(doc, {
        startY: y,
        head: [["Time", "Flap", "IAS (kt)", "Placard (kt)", "Verdict", "Note"]],
        body: debrief.flap_schedule.findings.map((f) => [
          f.time_mmss ?? "-",
          flapLabel(f.flap_setting),
          String(f.ias_kt),
          f.placard_kt ? String(f.placard_kt) : "-",
          {
            content: `${f.verdict.toUpperCase()}${f.exceedance_kt ? ` +${f.exceedance_kt}` : ""}`,
            styles: {
              fillColor: verdictFill[f.verdict] ?? [243, 244, 246],
              textColor: verdictText[f.verdict] ?? [55, 65, 81],
              fontStyle: "bold",
              halign: "center",
            },
          },
          pdfSafe(f.note ?? ""),
        ]),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }

    // Stable approach
    if (debrief.stable_approach?.verdict) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("STABLE APPROACH", margin, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        body: [[
          debrief.stable_approach.verdict.toUpperCase(),
          debrief.stable_approach.note ?? "",
        ]],
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }

    // Recommendations
    if (debrief.recommendations?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("NEXT LEG · ACTION ITEMS", margin, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        body: debrief.recommendations.map((r, i) => [`${i + 1}.`, r]),
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 22, fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(120);
      const ts = debrief.generated_at
        ? new Date(debrief.generated_at).toLocaleString()
        : new Date().toLocaleString();
      doc.text(
        `SimPilot · PMDG Debrief · Generated ${ts}`,
        margin,
        doc.internal.pageSize.getHeight() - 24,
      );
      doc.text(
        `Page ${p} / ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 24,
        { align: "right" },
      );
    }

    const datePart = (debrief.generated_at
      ? new Date(debrief.generated_at)
      : new Date()
    )
      .toISOString()
      .slice(0, 10);
    const route =
      debrief.departure && debrief.destination
        ? `-${debrief.departure}-${debrief.destination}`
        : "";
    doc.save(`pmdg-debrief-${datePart}${route}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-orbitron">
            <Sparkles className="h-5 w-5 text-primary" />
            Airline-Style PMDG Debrief
            {debrief?.variant && (
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {debrief.variant}
              </Badge>
            )}
            {debrief && !loading && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                className="ml-auto h-7 font-display text-[10px] tracking-[0.18em] uppercase"
              >
                <Download className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {debrief?.departure || debrief?.destination ? (
              <span className="inline-flex items-center gap-1.5 text-foreground/80">
                <Plane className="h-3.5 w-3.5" />
                {debrief.departure ?? "????"} → {debrief.destination ?? "????"}
                {debrief.duration_minutes != null && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {debrief.duration_minutes.toFixed(1)} min
                  </span>
                )}
              </span>
            ) : (
              "Generated from your captured PMDG event timeline."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && show && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Reviewing your flight timeline…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {debrief && !loading && (
          <div className="space-y-5 pt-1">
            {/* Score row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Automation", value: debrief.scores?.automation },
                { label: "Flap Schedule", value: debrief.scores?.flap_schedule },
                { label: "Stable Approach", value: debrief.scores?.stable_approach },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-md border border-border bg-background/40 p-3 text-center"
                >
                  <div className="font-display text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/70">
                    {s.label}
                  </div>
                  <div
                    className={cn(
                      "font-display text-2xl font-extrabold tabular-nums mt-1",
                      scoreColor(s.value),
                    )}
                  >
                    {s.value != null ? `${s.value}` : "—"}
                  </div>
                </div>
              ))}
            </div>

            {debrief.summary && (
              <p className="text-sm leading-relaxed text-foreground/90">{debrief.summary}</p>
            )}

            {/* Automation */}
            {debrief.automation && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Automation Discipline
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {debrief.automation.ap_engagement_call && (
                    <div className="rounded-md border border-border bg-background/40 p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        A/P engagement
                      </div>
                      <div className="text-foreground/90">{debrief.automation.ap_engagement_call}</div>
                    </div>
                  )}
                  {debrief.automation.at_usage_call && (
                    <div className="rounded-md border border-border bg-background/40 p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        A/T usage
                      </div>
                      <div className="text-foreground/90">{debrief.automation.at_usage_call}</div>
                    </div>
                  )}
                </div>
                {debrief.automation.issues && debrief.automation.issues.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
                    {debrief.automation.issues.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Flap schedule */}
            {debrief.flap_schedule?.findings && debrief.flap_schedule.findings.length > 0 && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Flap Speed Schedule
                </h4>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Time</th>
                        <th className="px-3 py-2 text-left font-medium">Flap</th>
                        <th className="px-3 py-2 text-left font-medium">IAS</th>
                        <th className="px-3 py-2 text-left font-medium">Placard</th>
                        <th className="px-3 py-2 text-left font-medium">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debrief.flap_schedule.findings.map((f, idx) => {
                        const v = verdictBadge(f.verdict);
                        const Icon = v.icon;
                        return (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                              {f.time_mmss ?? "—"}
                            </td>
                            <td className="px-3 py-2 tabular-nums font-mono">{flapLabel(f.flap_setting)}</td>
                            <td className="px-3 py-2 tabular-nums">{f.ias_kt} kt</td>
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">
                              {f.placard_kt ? `${f.placard_kt} kt` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                  v.className,
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {f.verdict}
                                {f.exceedance_kt ? ` +${f.exceedance_kt}` : ""}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Stable approach */}
            {debrief.stable_approach?.verdict && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Stable Approach
                </h4>
                {(() => {
                  const v = verdictBadge(debrief.stable_approach!.verdict);
                  const Icon = v.icon;
                  return (
                    <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0",
                          v.className,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {debrief.stable_approach!.verdict}
                      </span>
                      {debrief.stable_approach!.note && (
                        <p className="text-sm text-foreground/90">
                          {debrief.stable_approach!.note}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Recommendations */}
            {debrief.recommendations && debrief.recommendations.length > 0 && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Next Leg · Action Items
                </h4>
                <ul className="list-decimal pl-5 text-sm text-foreground/90 space-y-1.5">
                  {debrief.recommendations.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </section>
            )}

            {debrief.generated_at && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Generated {new Date(debrief.generated_at).toLocaleString()} ·{" "}
                {debrief.event_timeline?.length ?? 0} events analyzed
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PmdgDebriefModal;
