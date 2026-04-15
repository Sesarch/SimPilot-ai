import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENSKY_API = "https://opensky-network.org/api/states/all";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lamin = url.searchParams.get("lamin");
    const lamax = url.searchParams.get("lamax");
    const lomin = url.searchParams.get("lomin");
    const lomax = url.searchParams.get("lomax");

    const params = new URLSearchParams();
    if (lamin) params.set("lamin", lamin);
    if (lamax) params.set("lamax", lamax);
    if (lomin) params.set("lomin", lomin);
    if (lomax) params.set("lomax", lomax);

    const apiUrl = `${OPENSKY_API}${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `OpenSky API error: ${res.status}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
