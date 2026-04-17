import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Award, AlertTriangle, BookOpen, Download, X, Flame, Target, TrendingUp } from "lucide-react";
import type { CheckrideReport } from "@/lib/checkrideReport";
import { useExamPercentile } from "@/hooks/useExamPercentile";

interface Props {
  report: CheckrideReport;
  onClose?: () => void;
  onRetry?: () => void;
}

export const CheckrideReadinessReport = ({ report, onClose, onRetry }: Props) => {
  const navigate = useNavigate();
  const hasWeakAreas = report.weak_areas.length > 0;

  const drillWeakAreas = () => {
    navigate("/oral-exam", {
      state: {
        drill: {
          certificate: report.certificate,
          stress_mode: report.stress_mode,
          weak_areas: report.weak_areas,
        },
      },
    });
  };

  const pct = useMemo(
    () => (report.total > 0 ? Math.round((report.score / report.total) * 100) : 0),
    [report]
  );
  const passed = report.result === "PASS";

  // Anonymized peer percentile — only shown if the cohort is large enough to be meaningful.
  const { data: percentile } = useExamPercentile(
    report.exam_type_id,
    report.score,
    report.total,
    report.stress_mode
  );
  const showPercentile = !!percentile && percentile.sample_size >= 10;

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 56;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Checkride Readiness Report", 56, y);
    y += 24;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`SimPilot.AI — ${new Date().toLocaleDateString()}`, 56, y);
    y += 28;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Result: ${report.result}`, 56, y);
    doc.text(`Score: ${report.score}/${report.total} (${pct}%)`, pageW - 56, y, { align: "right" });
    y += 18;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Certificate: ${report.certificate}   ${report.stress_mode ? "• Stress Mode" : ""}`,
      56,
      y
    );
    y += 22;

    const wrapAndPrint = (label: string, body: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 56, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(body || "—", pageW - 112);
      lines.forEach((ln: string) => {
        if (y > 740) { doc.addPage(); y = 56; }
        doc.text(ln, 56, y);
        y += 14;
      });
      y += 8;
    };

    wrapAndPrint("Summary", report.summary);
    wrapAndPrint("Strengths", report.strengths.map((s) => `• ${s}`).join("\n"));

    doc.setFont("helvetica", "bold");
    doc.text("Weak Areas (FAA ACS Task Codes)", 56, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    report.weak_areas.forEach((w) => {
      const block = `[${w.acs_code}] ${w.topic}\n  Issue: ${w.issue}\n  Study: ${w.study}`;
      const lines = doc.splitTextToSize(block, pageW - 112);
      lines.forEach((ln: string) => {
        if (y > 740) { doc.addPage(); y = 56; }
        doc.text(ln, 56, y);
        y += 14;
      });
      y += 4;
    });
    y += 8;

    wrapAndPrint("Recommended Study", report.recommended_study.map((s) => `• ${s}`).join("\n"));
    wrapAndPrint("Examiner Notes", report.examiner_notes);

    doc.save(`checkride-report-${Date.now()}.pdf`);
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 my-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              passed
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-destructive/15 text-destructive border border-destructive/30"
            }`}
          >
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
              Checkride Readiness Report
            </p>
            <h3 className="font-display text-lg font-bold text-foreground">
              {report.result} — {report.score}/{report.total} ({pct}%)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{report.certificate}</span>
              {report.stress_mode && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 text-[10px] font-semibold uppercase tracking-wider">
                  <Flame className="w-3 h-3" /> Stress Mode
                </span>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close report"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {report.summary && (
        <p className="text-sm text-foreground mb-4 italic border-l-2 border-primary/40 pl-3">
          {report.summary}
        </p>
      )}

      {report.strengths.length > 0 && (
        <div className="mb-4">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-primary mb-2">
            ✅ Strengths
          </h4>
          <ul className="space-y-1 text-sm text-foreground/90">
            {report.strengths.map((s, i) => (
              <li key={i} className="pl-2 border-l border-primary/30">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {report.weak_areas.length > 0 && (
        <div className="mb-4">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-accent mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> ACS Task Codes For Review
          </h4>
          <div className="space-y-2">
            {report.weak_areas.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-accent/25 bg-accent/5 p-3 text-sm"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold">
                    {w.acs_code}
                  </span>
                  <span className="font-semibold text-foreground">{w.topic}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground/80">Issue:</span> {w.issue}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">Study:</span> {w.study}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.recommended_study.length > 0 && (
        <div className="mb-4">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground/80 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Recommended Study
          </h4>
          <ul className="space-y-1 text-sm text-foreground/90">
            {report.recommended_study.map((s, i) => (
              <li key={i} className="pl-2 border-l border-border">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {report.examiner_notes && (
        <div className="mb-4">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground/80 mb-2">
            💡 Examiner Notes
          </h4>
          <p className="text-sm text-foreground/90 italic">{report.examiner_notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
        <button
          onClick={downloadPDF}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-display font-semibold tracking-wider uppercase hover:shadow-[0_0_15px_hsl(var(--cyan-glow)/0.3)] transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Download PDF
        </button>
        {hasWeakAreas && (
          <button
            onClick={drillWeakAreas}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-display font-semibold tracking-wider uppercase hover:shadow-[0_0_15px_hsl(var(--amber-instrument)/0.4)] transition-all"
          >
            <Target className="w-3.5 h-3.5" /> Drill Weak Areas ({report.weak_areas.length})
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-xs font-display font-semibold tracking-wider uppercase hover:bg-secondary/80 transition-all"
          >
            New Exam
          </button>
        )}
      </div>
    </div>
  );
};

export default CheckrideReadinessReport;
