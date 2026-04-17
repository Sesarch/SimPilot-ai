export type CheckrideWeakArea = {
  acs_code: string;
  topic: string;
  issue: string;
  study: string;
};

export type CheckrideReport = {
  result: "PASS" | "FAIL" | "INCOMPLETE";
  score: number;
  total: number;
  certificate: string;
  stress_mode: boolean;
  duration_questions: number;
  summary: string;
  strengths: string[];
  weak_areas: CheckrideWeakArea[];
  recommended_study: string[];
  examiner_notes: string;
  /** Oral-exam-page id (e.g. "ppl", "instrument") used for percentile cohort lookup */
  exam_type_id?: string;
};

const REPORT_FENCE_RE = /```checkride-report\s*\n([\s\S]*?)\n```/i;

/** Extract the structured report JSON from an assistant message, if present. */
export function extractCheckrideReport(text: string): CheckrideReport | null {
  const m = text.match(REPORT_FENCE_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.score === "number" &&
      typeof parsed.total === "number" &&
      typeof parsed.result === "string"
    ) {
      return {
        result: parsed.result,
        score: parsed.score,
        total: parsed.total,
        certificate: parsed.certificate ?? "MIXED",
        stress_mode: !!parsed.stress_mode,
        duration_questions: parsed.duration_questions ?? parsed.total,
        summary: parsed.summary ?? "",
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weak_areas: Array.isArray(parsed.weak_areas) ? parsed.weak_areas : [],
        recommended_study: Array.isArray(parsed.recommended_study) ? parsed.recommended_study : [],
        examiner_notes: parsed.examiner_notes ?? "",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Strip the report fence from a message so it doesn't show as raw JSON in the chat bubble. */
export function stripReportFence(text: string): string {
  return text.replace(REPORT_FENCE_RE, "").trimEnd();
}
