import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLASSIFIER_PROMPT = `You are a topical relevance classifier for an FAA aviation Q&A tool.
The tool only answers questions related to FAA aviation knowledge: PHAK (Pilot's Handbook of Aeronautical Knowledge), FAR (14 CFR), AIM (Aeronautical Information Manual), aircraft systems, weather for pilots, navigation, airspace, regulations, ATC procedures, flight maneuvers, checkride/oral exam topics.

You MUST call the classify_question tool. Decide:
- relevant: true if the question is plausibly aviation/FAA/pilot-training related (be permissive — short or vague aviation questions count).
- relevant: false ONLY if clearly off-topic (e.g. cooking, sports, coding help, celebrity gossip, math homework, random chitchat).
If false, provide a one-sentence "reason" explaining what topic it is, and a one-sentence "suggestion" telling the user to rephrase as an FAA/aviation question.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (typeof question !== "string" || question.trim().length < 3 || question.length > 300) {
      return new Response(JSON.stringify({ error: "Invalid question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: question },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_question",
            description: "Return relevance verdict.",
            parameters: {
              type: "object",
              properties: {
                relevant: { type: "boolean" },
                reason: { type: "string" },
                suggestion: { type: "string" },
              },
              required: ["relevant"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_question" } },
      }),
    });

    if (!response.ok) {
      // Fail-open: if classifier fails, allow the question through
      console.error("classifier gateway error:", response.status);
      return new Response(JSON.stringify({ relevant: true, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: { relevant?: boolean; reason?: string; suggestion?: string } = {};
    try { parsed = JSON.parse(args || "{}"); } catch { parsed = { relevant: true }; }

    return new Response(JSON.stringify({
      relevant: parsed.relevant !== false,
      reason: parsed.reason || "",
      suggestion: parsed.suggestion || "Try rephrasing as an FAA, PHAK, FAR, or AIM question.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("quick-answer-validate error:", e);
    // Fail-open
    return new Response(JSON.stringify({ relevant: true, fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
