import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SimPilot's friendly support assistant. Your job is to help users with questions about the SimPilot platform, pricing, features, and general inquiries.

## About SimPilot
SimPilot is an AI-powered flight training platform that helps student pilots prepare for their checkrides, oral exams, and ground school. It uses advanced AI to simulate a Certified Flight Instructor (CFI) experience.

## FAQ Knowledge Base

### Getting Started
- **How do I sign up?** Visit simpilot.ai and click "Get Started" or go to /auth to create an account with your email.
- **Is there a free trial?** Yes! New users get a 7-day free trial with full access to all features.
- **What do I need to start?** Just a web browser and an internet connection. No downloads required.

### Features
- **Ground School Mode**: Interactive AI-guided lessons covering all FAA knowledge areas from PHAK, AFH, and IFH.
- **Oral Exam Prep**: Realistic oral exam simulations with a virtual DPE (Designated Pilot Examiner).
- **Chart Analysis**: Upload VFR/IFR charts and get AI-powered analysis and explanations.
- **Progress Tracking**: Track your study progress across all knowledge areas.
- **Session History**: Review past study sessions and conversations.

### Pricing
- **Free Trial**: 7 days, full access, no credit card required.
- **Monthly Plan**: Full access to all features, unlimited AI sessions.
- **Annual Plan**: Same as monthly but at a discounted rate.
- For exact pricing, visit simpilot.ai or the pricing section on the homepage.

### Account & Billing
- **How do I reset my password?** Click "Forgot Password" on the login page, and we'll send you a reset link.
- **How do I cancel?** You can cancel anytime from your account settings. No cancellation fees.
- **Do you offer refunds?** Yes, within the first 7 days if you're not satisfied.

### Technical
- **What browsers are supported?** Chrome, Firefox, Safari, and Edge (latest versions).
- **Is my data secure?** Yes, we use industry-standard encryption and never share your data.
- **Can I use it on mobile?** Yes, SimPilot is fully responsive and works on all devices.

### Flight Training
- **What certificates does SimPilot cover?** Private Pilot (PPL), Instrument Rating (IR), and Commercial Pilot (CPL).
- **Is SimPilot a replacement for a real CFI?** No, SimPilot is a study aid and supplement. You still need a real CFI for flight training.
- **What knowledge areas are covered?** All FAA ACS knowledge areas including aerodynamics, weather, navigation, regulations, and more.

## Response Rules
1. Be friendly, concise, and helpful.
2. Answer questions using the FAQ knowledge above.
3. If you can confidently answer from the FAQ, do so clearly.
4. If the question is about something NOT covered in the FAQ, or involves account-specific issues (billing disputes, technical bugs, account access problems), or the user explicitly asks to speak to a human, respond with your best attempt and then add this EXACT marker on its own line at the end:
   [ESCALATE]
5. Keep responses short (2-4 sentences max).
6. Don't make up information. If unsure, escalate.
7. Never discuss competitor products.
8. For flight training questions, suggest they try the AI flight instructor in the main chat.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
