// supabase/functions/atc-grade-response/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface GradeResult {
  score: number;
  passed: boolean;
  elements_hit: string[];
  elements_missed: string[];
  feedback: string;
  correct_version: string;
}

const SYSTEM_PROMPT = `You are a strict FAA-certified ATC phraseology grader for pilot training.

LANGUAGE: Respond in English only. Never use any other language, regardless of pilot input.

You will receive:
- A situation description
- The controller's transmission
- The expected FAA-correct phraseology
- A list of key_elements the pilot response MUST include
- The pilot's actual response (text)

Grade strictly against AIM Chapter 4 standards. Score 0-100:
- 100: All key elements present, correct order, FAA-standard phraseology
- 70-99: All key elements present, minor non-standard wording
- 40-69: Some key elements missing or wrong order
- 0-39: Major elements missing, unsafe, or wrong intent
Pass threshold: 70.

Return ONLY a JSON object — no markdown, no prose outside JSON — with this exact shape:
{
  "score": <integer 0-100>,
  "passed": <boolean>,
  "elements_hit": [<key_element strings actually present>],
  "elements_missed": [<key_element strings missing>],
  "feedback": "<one short paragraph, instructor tone, English only>",
  "correct_version": "<the FAA-correct version the pilot should have said>"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "Server not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const drillId = typeof body?.drill_id === "string" ? body.drill_id : null;
    const studentResponse = typeof body?.student_response === "string"
      ? body.student_response.trim()
      : (typeof body?.pilot_response === "string" ? body.pilot_response.trim() : "");
    if (!drillId) return json({ error: "drill_id required" }, 400);
    if (!studentResponse) return json({ error: "student_response required" }, 400);
    if (studentResponse.length > 2000) return json({ error: "student_response too long" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: drill, error: drillErr } = await admin
      .from("atc_drills")
      .select("id, category_id, situation, controller_transmission, expected_phraseology, key_elements, difficulty")
      .eq("id", drillId)
      .maybeSingle();
    if (drillErr) return json({ error: "Database error" }, 500);
    if (!drill) return json({ error: "Drill not found" }, 404);

    const keyElements: string[] = Array.isArray(drill.key_elements) ? drill.key_elements : [];

    const userPrompt = `SITUATION:
${drill.situation}

CONTROLLER TRANSMISSION:
${drill.controller_transmission}

EXPECTED PHRASEOLOGY (reference):
${drill.expected_phraseology}

KEY ELEMENTS (must all be present for full credit):
${JSON.stringify(keyElements)}

PILOT RESPONSE TO GRADE:
${studentResponse}

Return JSON only.`;

    let anthropicResp: Response;
    try {
      anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
    } catch (e) {
      console.error("Anthropic fetch failed:", e);
      return json({ error: "Grading service unavailable", graded: false }, 502);
    }

    if (!anthropicResp.ok) {
      const txt = await anthropicResp.text().catch(() => "");
      console.error("Anthropic error:", anthropicResp.status, txt);
      return json({ error: "Grading service error", graded: false }, 502);
    }

    const anthropicJson = await anthropicResp.json().catch(() => null);
    const rawText: string | undefined = anthropicJson?.content?.[0]?.text;
    if (!rawText) {
      console.error("Anthropic missing content");
      return json({
        graded: false,
        score: 0,
        feedback: "Grading failed: empty response from grader. No attempt recorded — please try again.",
      }, 200);
    }

    let parsed: GradeResult | null = null;
    try {
      const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const obj = JSON.parse(cleaned);
      if (typeof obj?.score === "number" && typeof obj?.feedback === "string") {
        const score = Math.max(0, Math.min(100, Math.round(obj.score)));
        parsed = {
          score,
          passed: obj.passed === true || score >= 70,
          elements_hit: Array.isArray(obj.elements_hit) ? obj.elements_hit.map(String) : [],
          elements_missed: Array.isArray(obj.elements_missed) ? obj.elements_missed.map(String) : [],
          feedback: String(obj.feedback),
          correct_version: typeof obj.correct_version === "string"
            ? obj.correct_version
            : drill.expected_phraseology,
        };
      }
    } catch (e) {
      console.error("JSON parse failed:", e, "raw:", rawText.slice(0, 500));
    }

    if (!parsed) {
      return json({
        graded: false,
        score: 0,
        feedback: "Grading failed: the grader returned an unreadable response. No attempt was recorded — please try again.",
      }, 200);
    }

    const { error: insertErr } = await admin.from("atc_drill_attempts").insert({
      user_id: userId,
      drill_id: drillId,
      student_response: studentResponse,
      score: parsed.score,
      elements_hit: parsed.elements_hit,
      elements_missed: parsed.elements_missed,
      feedback: parsed.feedback,
      correct_version: parsed.correct_version,
    });
    if (insertErr) {
      console.error("Insert attempt failed:", insertErr);
      return json({ graded: true, persisted: false, ...parsed }, 200);
    }

    const { data: recent, error: recentErr } = await admin
      .from("atc_drill_attempts")
      .select("score, drill:atc_drills!inner(category_id)")
      .eq("user_id", userId)
      .eq("drill.category_id", drill.category_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!recentErr && recent && recent.length > 0) {
      const scores = recent.map((r: any) => r.score ?? 0);
      const avg = Math.round(scores.reduce((s: number, n: number) => s + n, 0) / scores.length);
      const passedCount = scores.filter((s: number) => s >= 70).length;

      const { error: upsertErr } = await admin.from("atc_mastery").upsert({
        user_id: userId,
        category_id: drill.category_id,
        mastery_score: avg,
        drills_attempted: recent.length,
        drills_passed: passedCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,category_id" });
      if (upsertErr) console.error("Mastery upsert failed:", upsertErr);
    } else if (recentErr) {
      console.error("Recent attempts query failed:", recentErr);
    }

    return json({ graded: true, persisted: true, ...parsed }, 200);
  } catch (e) {
    console.error("atc-grade-response unexpected error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
