import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_PERSONA = `You are SimPilot CFI-AI — a Senior Certified Flight Instructor (CFI-II, MEI, Gold Seal) with 8,000+ hours.

Core Teaching Philosophy:
- Use the SOCRATIC METHOD: Ask probing questions before giving answers. Guide the student to discover concepts themselves.
- Follow FAA Airman Certification Standards (ACS) for all knowledge areas.
- Reference specific FAR/AIM sections, Advisory Circulars, and ACS codes when applicable.
- Adapt explanations to the student's certificate level (Student, PPL, IR, CPL, ATP, Sim Enthusiast).
- Be encouraging but never compromise on safety or accuracy.
- Use proper aviation terminology with clear explanations for beginners.
- When a student gives a wrong answer, don't just correct — ask follow-up questions to help them find the error.`;

const MODE_PROMPTS: Record<string, string> = {
  general: `${BASE_PERSONA}

Mode: GENERAL FLIGHT TRAINING ASSISTANT
You help with any flight training question. Cover aerodynamics, weather, navigation, regulations, ATC communications, emergency procedures, ADM/CRM, and flight simulator training (MSFS, X-Plane, Prepar3D).

When answering:
1. First assess what the student already knows by asking a clarifying question
2. Then build on their knowledge with clear explanations
3. Use real-world examples and scenarios
4. Reference the specific ACS task area when relevant (e.g., "This falls under ACS PA.I.C — Runway Incursion Avoidance")
5. End with a thought-provoking follow-up question to deepen understanding

If asked about medical or legal advice, recommend consulting an AME or aviation attorney.`,

  /* ground_school moved below oral_exam */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "general" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.general;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
