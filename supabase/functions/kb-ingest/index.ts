// Parses an uploaded PDF in storage, splits it into chunks, embeds each,
// and inserts them into kb_chunks. Admin-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { chunkText, embedText, toPgVector } from "../_shared/kb-embed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an admin
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id } = await req.json();
    if (!document_id || typeof document_id !== "string") {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceRoleKey);

    const { data: doc, error: docErr } = await sb
      .from("kb_documents")
      .select("*")
      .eq("id", document_id)
      .maybeSingle();
    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("kb_documents").update({ status: "processing", error_message: null }).eq("id", document_id);

    // Download PDF from storage
    const { data: file, error: dlErr } = await sb.storage.from("kb-files").download(doc.file_path);
    if (dlErr || !file) {
      await sb.from("kb_documents").update({ status: "error", error_message: dlErr?.message || "download failed" }).eq("id", document_id);
      return new Response(JSON.stringify({ error: "Could not download PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await file.arrayBuffer());

    // Parse PDF
    let pageCount = 0;
    let fullText = "";
    try {
      const pdf = await getDocumentProxy(buf);
      pageCount = pdf.numPages;
      const { text } = await extractText(pdf, { mergePages: false });
      // text is string[] when mergePages: false — join with form-feed for page boundaries
      fullText = Array.isArray(text) ? text.join("\f") : String(text || "");
    } catch (parseErr) {
      const msg = (parseErr as Error).message;
      await sb.from("kb_documents").update({ status: "error", error_message: `Parse error: ${msg}` }).eq("id", document_id);
      return new Response(JSON.stringify({ error: `PDF parse failed: ${msg}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fullText.trim()) {
      await sb.from("kb_documents").update({ status: "error", error_message: "No text extracted (scanned PDF?)" }).eq("id", document_id);
      return new Response(JSON.stringify({ error: "No extractable text in PDF" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace any prior chunks for this doc
    await sb.from("kb_chunks").delete().eq("document_id", document_id);

    const chunks = chunkText(fullText, { maxChars: 900, overlap: 120 });

    // Insert in batches of 50
    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const rows = slice.map((c, j) => ({
        document_id,
        source_label: doc.source_label,
        page: c.page,
        section: c.section,
        chunk_index: i + j,
        content: c.content,
        embedding: toPgVector(embedText(c.content)),
      }));
      const { error: insErr } = await sb.from("kb_chunks").insert(rows);
      if (insErr) {
        await sb.from("kb_documents").update({ status: "error", error_message: insErr.message }).eq("id", document_id);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += rows.length;
    }

    await sb.from("kb_documents").update({
      status: "ready",
      pages: pageCount,
      chunk_count: inserted,
    }).eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, pages: pageCount, chunks: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-ingest error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
