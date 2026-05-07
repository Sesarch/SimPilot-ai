export type GroundQuizQuestion = {
  acs_code?: string;
  question: string;
  /** Exactly 4 answer choices (A, B, C, D). */
  options: [string, string, string, string];
  /** Index 0..3 of the correct option. */
  correct: number;
  explanation: string;
};

export type GroundQuiz = {
  topic: string;
  questions: GroundQuizQuestion[];
};

const QUIZ_FENCE_RE = /```ground-quiz\s*\n([\s\S]*?)\n```/i;

export function extractGroundQuiz(text: string): GroundQuiz | null {
  const m = text.match(QUIZ_FENCE_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]);
    if (!parsed || !Array.isArray(parsed.questions)) return null;
    const questions: GroundQuizQuestion[] = parsed.questions
      .filter(
        (q: any) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct === "number" &&
          q.correct >= 0 &&
          q.correct <= 3,
      )
      .map((q: any) => ({
        acs_code: typeof q.acs_code === "string" ? q.acs_code : undefined,
        question: q.question,
        options: [String(q.options[0]), String(q.options[1]), String(q.options[2]), String(q.options[3])] as [
          string,
          string,
          string,
          string,
        ],
        correct: q.correct,
        explanation: typeof q.explanation === "string" ? q.explanation : "",
      }));
    if (questions.length === 0) return null;
    return { topic: typeof parsed.topic === "string" ? parsed.topic : "Knowledge Check", questions };
  } catch {
    return null;
  }
}

export function stripGroundQuizFence(text: string): string {
  return text.replace(QUIZ_FENCE_RE, "").trimEnd();
}
