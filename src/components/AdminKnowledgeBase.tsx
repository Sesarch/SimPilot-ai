import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BookOpen, Upload, Trash2, RefreshCw, FileText, Search,
  CheckCircle2, AlertCircle, Loader2, Clock,
} from "lucide-react";

type KbDoc = {
  id: string;
  title: string;
  source_label: string;
  file_path: string;
  pages: number;
  chunk_count: number;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  created_at: string;
};

const SUGGESTED_LABELS = [
  "AIM", "PHAK", "AFH", "IFH", "FAR", "AC 00-6B", "AC 00-45H",
  "Cessna 172 POH", "Cessna 152 POH", "Piper PA-28 POH", "DA-40 POH",
];

export default function AdminKnowledgeBase() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testing, setTesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kb_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDocs((data as KbDoc[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-poll while anything is processing
  useEffect(() => {
    if (!docs.some((d) => d.status === "processing" || d.status === "pending")) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [docs, refresh]);

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF must be under 50 MB");
      return;
    }
    setPendingFile(file);
    if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    if (!sourceLabel) {
      const guess = SUGGESTED_LABELS.find((s) => file.name.toUpperCase().includes(s.toUpperCase()));
      if (guess) setSourceLabel(guess);
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) { toast.error("Pick a PDF first"); return; }
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!sourceLabel.trim()) { toast.error("Source label required (e.g. AIM, PHAK)"); return; }

    setUploading(true);
    try {
      const safeName = pendingFile.name.replace(/[^\w.\-]+/g, "_");
      const path = `${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("kb-files").upload(path, pendingFile, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: userRes } = await supabase.auth.getUser();
      const { data: doc, error: docErr } = await supabase
        .from("kb_documents")
        .insert({
          title: title.trim(),
          source_label: sourceLabel.trim(),
          file_path: path,
          status: "pending",
          uploaded_by: userRes?.user?.id ?? null,
        })
        .select()
        .single();
      if (docErr) throw docErr;

      toast.success("Uploaded — parsing PDF...");
      setPendingFile(null);
      setTitle("");
      setSourceLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      const { error: ingErr } = await supabase.functions.invoke("kb-ingest", {
        body: { document_id: doc.id },
      });
      if (ingErr) {
        toast.error(`Ingest failed: ${ingErr.message}`);
      } else {
        toast.success("Indexed and ready");
      }
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (doc: KbDoc) => {
    toast.info(`Re-indexing ${doc.title}...`);
    await supabase.from("kb_documents").update({ status: "processing", error_message: null }).eq("id", doc.id);
    refresh();
    const { error } = await supabase.functions.invoke("kb-ingest", { body: { document_id: doc.id } });
    if (error) toast.error(error.message);
    else toast.success("Re-indexed");
    refresh();
  };

  const handleDelete = async (doc: KbDoc) => {
    if (!confirm(`Delete "${doc.title}" and all its chunks?`)) return;
    await supabase.storage.from("kb-files").remove([doc.file_path]).catch(() => {});
    const { error } = await supabase.from("kb_documents").delete().eq("id", doc.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refresh(); }
  };

  const handleTestSearch = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResults(null);
    const { data, error } = await supabase.functions.invoke("kb-search", {
      body: { query: testQuery, top_k: 5 },
    });
    if (error) toast.error(error.message);
    else setTestResults((data as any)?.matches || []);
    setTesting(false);
  };

  const statusBadge = (s: KbDoc["status"]) => {
    if (s === "ready") return <Badge className="bg-green-500/15 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Ready</Badge>;
    if (s === "processing") return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
    if (s === "pending") return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
    return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <div>
          <h2 className="font-display text-xl tracking-wider">PILOT KNOWLEDGE BASE</h2>
          <p className="text-sm text-muted-foreground">Drag aviation PDFs (AIM, PHAK, POH...) — the AI will cite passages in answers.</p>
        </div>
      </div>

      {/* Upload card */}
      <Card className="p-6 space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onPickFile(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="">{pendingFile ? pendingFile.name : "Drop a PDF here, or click to browse"}</p>
          <p className="text-xs text-muted-foreground mt-1">AIM, PHAK, AFH, IFH, POH (max 50 MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
        </div>

        {pendingFile && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kb-title">Document Title</Label>
              <Input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aeronautical Information Manual" />
            </div>
            <div>
              <Label htmlFor="kb-label">Source Label (used in citations)</Label>
              <Input id="kb-label" value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="e.g. AIM" list="kb-label-suggestions" />
              <datalist id="kb-label-suggestions">
                {SUGGESTED_LABELS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading & indexing...</> : <><Upload className="w-4 h-4 mr-2" />Upload & index</>}
              </Button>
              <Button variant="outline" onClick={() => { setPendingFile(null); setTitle(""); setSourceLabel(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Document list */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm tracking-wider">INDEXED DOCUMENTS ({docs.length})</h3>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No documents yet. Upload a PDF above.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate">{d.title}</p>
                    <Badge variant="outline" className="text-xs">{d.source_label}</Badge>
                    {statusBadge(d.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.pages > 0 ? `${d.pages} pages · ` : ""}{d.chunk_count} chunks
                    {d.error_message ? ` · ${d.error_message}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleReindex(d)} title="Re-index">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(d)} title="Delete">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Retrieval tester */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          <h3 className="font-display text-sm tracking-wider">TEST RETRIEVAL</h3>
        </div>
        <p className="text-xs text-muted-foreground">Preview the chunks the AI will see for a given question.</p>
        <Textarea
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="e.g. What are the VFR weather minimums in Class E airspace?"
          rows={2}
        />
        <Button onClick={handleTestSearch} disabled={testing || !testQuery.trim()} size="sm">
          {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Search className="w-4 h-4 mr-2" />Search KB</>}
        </Button>
        {testResults && (
          <div className="space-y-2 mt-2">
            {testResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches above threshold.</p>
            ) : testResults.map((r: any, i: number) => (
              <div key={r.id} className="p-3 border border-border rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="">[{i + 1}] {r.source_label}{r.section ? ` — ${r.section}` : ""}{r.page ? ` (p. ${r.page})` : ""}</span>
                  <Badge variant="outline" className="text-xs">sim {Number(r.similarity).toFixed(3)}</Badge>
                </div>
                <p className="text-muted-foreground line-clamp-3">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
