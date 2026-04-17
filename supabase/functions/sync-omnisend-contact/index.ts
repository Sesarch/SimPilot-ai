import { corsHeaders } from "@supabase/supabase-js/cors";

const OMNISEND_BASE_URL = "https://api.omnisend.com/v5";

interface SyncRequest {
  email: string;
  pilotContext?: Record<string, unknown> | null;
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const OMNISEND_API_KEY = Deno.env.get("OMNISEND_API_KEY");
    if (!OMNISEND_API_KEY) {
      throw new Error("OMNISEND_API_KEY is not configured");
    }

    const body = (await req.json()) as SyncRequest;
    const email = (body.email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const source = body.source || "simpilot.ai/newsletter";
    const tags = ["newsletter", "pilot-briefings", "simpilot.ai"];
    const pilotContext = body.pilotContext ?? null;

    // 1. Upsert the contact in Omnisend
    const contactPayload = {
      identifiers: [
        {
          type: "email",
          id: email,
          channels: {
            email: {
              status: "subscribed",
              statusDate: new Date().toISOString(),
            },
          },
        },
      ],
      tags,
      customProperties: {
        source,
        ...(pilotContext && typeof pilotContext === "object" ? pilotContext : {}),
      },
    };

    const contactResp = await fetch(`${OMNISEND_BASE_URL}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": OMNISEND_API_KEY,
      },
      body: JSON.stringify(contactPayload),
    });

    const contactText = await contactResp.text();
    if (!contactResp.ok) {
      console.error("Omnisend contact sync failed", contactResp.status, contactText);
      return new Response(
        JSON.stringify({
          error: "Failed to sync contact to Omnisend",
          status: contactResp.status,
          details: contactText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Trigger the newsletter_signup custom event for automations
    const eventPayload = {
      eventName: "newsletter_signup",
      origin: "api",
      contact: { email },
      properties: {
        source,
        ...(pilotContext && typeof pilotContext === "object" ? pilotContext : {}),
      },
    };

    const eventResp = await fetch(`${OMNISEND_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": OMNISEND_API_KEY,
      },
      body: JSON.stringify(eventPayload),
    });

    let eventResult: unknown = null;
    const eventText = await eventResp.text();
    try {
      eventResult = eventText ? JSON.parse(eventText) : null;
    } catch {
      eventResult = eventText;
    }

    if (!eventResp.ok) {
      // Contact synced but event failed — log and return partial success
      console.warn("Omnisend event trigger failed", eventResp.status, eventText);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contactSynced: true,
        eventTriggered: eventResp.ok,
        event: eventResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("sync-omnisend-contact error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
