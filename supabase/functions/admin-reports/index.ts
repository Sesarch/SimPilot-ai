// Super Admin reports & analytics edge function.
// Returns signup trends, DAU/MAU, exam pass rate, top schools, engagement.
import { corsHeaders, requireAdmin } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { admin } = auth;

  try {
    const now = Date.now();
    const day = 86400000;
    const since30 = new Date(now - 30 * day).toISOString();
    const since7 = new Date(now - 7 * day).toISOString();
    const since1 = new Date(now - day).toISOString();

    const [
      profilesAll,
      profiles30,
      sessions30,
      sessions7,
      sessions1,
      examsAll,
      schoolsAll,
      compGrants,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("created_at").gte("created_at", since30),
      admin.from("chat_sessions").select("user_id, updated_at").gte("updated_at", since30),
      admin.from("chat_sessions").select("user_id").gte("updated_at", since7),
      admin.from("chat_sessions").select("user_id").gte("updated_at", since1),
      admin.from("exam_scores").select("score, total_questions, result, created_at").gte("created_at", since30),
      admin.from("school_purchases").select("school_name, seats_purchased, amount_paid_cents, status"),
      admin.from("user_comp_grants").select("id", { count: "exact", head: true }).is("revoked_at", null),
    ]);

    // Signup trend (last 30 days)
    const signupTrend: { date: string; signups: number }[] = [];
    const signupsByDay = new Map<string, number>();
    (profiles30.data || []).forEach((p: any) => {
      const d = new Date(p.created_at).toISOString().slice(0, 10);
      signupsByDay.set(d, (signupsByDay.get(d) || 0) + 1);
    });
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * day).toISOString().slice(0, 10);
      signupTrend.push({ date, signups: signupsByDay.get(date) || 0 });
    }

    // DAU/MAU
    const dau = new Set((sessions1.data || []).map((s: any) => s.user_id)).size;
    const wau = new Set((sessions7.data || []).map((s: any) => s.user_id)).size;
    const mau = new Set((sessions30.data || []).map((s: any) => s.user_id)).size;

    // Exam pass rate (last 30d)
    const exams = examsAll.data || [];
    const completed = exams.filter((e: any) => e.result !== "INCOMPLETE");
    const passed = completed.filter((e: any) => (e.score / e.total_questions) >= 0.7).length;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s: number, e: any) => s + (e.score / e.total_questions) * 100, 0) / completed.length)
      : 0;

    // Top schools by paid seats
    const schools = (schoolsAll.data || [])
      .filter((s: any) => s.status === "paid")
      .sort((a: any, b: any) => (b.seats_purchased || 0) - (a.seats_purchased || 0))
      .slice(0, 10)
      .map((s: any) => ({
        name: s.school_name,
        seats: s.seats_purchased,
        revenue_cents: s.amount_paid_cents,
      }));

    return new Response(JSON.stringify({
      total_users: profilesAll.count || 0,
      signups_last_30d: profiles30.data?.length || 0,
      signup_trend: signupTrend,
      dau,
      wau,
      mau,
      exam_pass_rate_pct: passRate,
      avg_exam_score_pct: avgScore,
      exams_taken_30d: completed.length,
      top_schools: schools,
      comp_grants_active: compGrants.count || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[admin-reports] error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
