import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FlaskConical, Loader2, Cpu, Radio, Eye, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

type TaskType = "auto" | "technical" | "operational" | "vision";

type OrchestratorResult = {
  task: string;
  model: string;
  latency_ms: number;
  response: string;
  audit_id: string | null;
};

type AuditRow = {
  id: string;
  status: string;
  audit_notes: string | null;
  audit_model: string | null;
  severity: number | null;
  contradiction: string | null;
  poh_reference: string | null;
};

const SAMPLES: Record<Exclude<TaskType, "auto">, string> = {
  technical: "What is Vx vs Vy in a Cessna 172, and when would I use each on departure?",
  operational: "Read back this clearance: 'Skyhawk 12345, cleared to KPAO via direct, climb and maintain 3000, squawk 4521.'",
  vision: "I'm looking at a sectional chart with a magenta dashed circle around an airport. What does that indicate?",
};

const AdminOrchestratorTester = () => {
  const [task, setTask] = useState<TaskType>("auto");
  const [prompt, setPrompt] = useState(SAMPLES.technical);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [audit, setAudit] = useState<AuditRow | null>(null);
  const [auditPolling, setAuditPolling] = useState(false);

  const loadSample = (t: Exclude<TaskType, "auto">) => {
    setTask(t);
    setPrompt(SAMPLES[t]);
  };

  const pollAudit = async (id: string) => {
    setAuditPolling(true);
    let attempts = 0;
    const tick = async () => {
      attempts++;
      const { data: row } = await supabase
        .from("ai_audit_queue")
        .select("id, status, audit_notes, audit_model")
        .eq("id", id)
        .maybeSingle();
      const { data: flag } = await supabase
        .from("ai_safety_flags")
        .select("severity, contradiction, poh_reference")
        .eq("audit_queue_id", id)
        .maybeSingle();
      if (row) {
        setAudit({
          id: row.id,
          status: row.status,
          audit_notes: row.audit_notes,
          audit_model: row.audit_model,
          severity: flag?.severity ?? null,
          contradiction: flag?.contradiction ?? null,
          poh_reference: flag?.poh_reference ?? null,
        });
        if (row.status !== "pending") { setAuditPolling(false); return; }
      }
      if (attempts < 30) setTimeout(tick, 2500);
      else setAuditPolling(false);
    };
    tick();
  };

  const run = async () => {
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    setLoading(true);
    setResult(null);
    setAudit(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          task,
          messages: [{ role: "user", content: prompt }],
          session_id: `admin-test-${Date.now()}`,
        },
      });
      if (error) throw error;
      if (!data?.response) throw new Error(data?.error || "No response from orchestrator");
      setResult(data as OrchestratorResult);
      toast.success(`Routed to ${data.task} brain`);
      if (data.audit_id) pollAudit(data.audit_id);
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
    } finally {
      setLoading(false);
    }
  };

  const TaskIcon =
    result?.task === "operational" ? Radio :
    result?.task === "vision" ? Eye : Cpu;

  const sevColor =
    audit?.severity === 1 ? "text-destructive" :
    audit?.severity === 2 ? "text-amber-500" :
    audit?.status === "clean" ? "text-emerald-500" :
    "text-muted-foreground";

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-primary/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">
          Orchestrator Test Console
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Send a sample prompt through <code className="text-[10px]">ai-orchestrator</code> and inspect routing,
        latency, and the asynchronous Safety Auditor verdict.
      </p>

      <div className="grid gap-3 sm:grid-cols-[160px,1fr] mb-3">
        <div>
          <Label className="text-xs">Force task</Label>
          <Select value={task} onValueChange={(v) => setTask(v as TaskType)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-classify</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="operational">Operational (ATC)</SelectItem>
              <SelectItem value="vision">Vision</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="mt-1 text-xs font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <FlaskConical className="w-3 h-3 mr-1.5" />}
          {loading ? "Running..." : "Run test"}
        </Button>
        <span className="text-[10px] text-muted-foreground mr-1">Samples:</span>
        <Button size="sm" variant="outline" onClick={() => loadSample("technical")}>Technical</Button>
        <Button size="sm" variant="outline" onClick={() => loadSample("operational")}>Operational</Button>
        <Button size="sm" variant="outline" onClick={() => loadSample("vision")}>Vision</Button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="p-3 rounded-lg border border-border bg-background/40 flex items-center gap-2">
              <TaskIcon className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Routed task</p>
                <p className="text-xs font-semibold text-foreground">{result.task}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background/40">
              <p className="text-[10px] text-muted-foreground uppercase">Model</p>
              <p className="text-xs font-mono text-foreground break-all">{result.model}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background/40 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Latency</p>
                <p className="text-xs font-semibold text-foreground">{result.latency_ms} ms</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/40">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">AI response</p>
            <pre className="text-[11px] whitespace-pre-wrap text-foreground max-h-72 overflow-auto">
              {result.response}
            </pre>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/40">
            <div className="flex items-center gap-2 mb-1">
              {audit?.status === "flagged" ? <ShieldAlert className={`w-4 h-4 ${sevColor}`} /> : <ShieldCheck className={`w-4 h-4 ${sevColor}`} />}
              <p className="text-[10px] text-muted-foreground uppercase">Safety audit</p>
              {auditPolling && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
            </div>
            {!result.audit_id && (
              <p className="text-[11px] text-muted-foreground">Shadow audit skipped (vision task or audit disabled).</p>
            )}
            {result.audit_id && !audit && (
              <p className="text-[11px] text-muted-foreground">Queued · audit id <span className="font-mono">{result.audit_id.slice(0, 8)}</span> · waiting for auditor (cron runs every minute)…</p>
            )}
            {audit && (
              <div className="space-y-1">
                <p className={`text-xs font-semibold ${sevColor}`}>
                  Status: {audit.status.toUpperCase()}
                  {audit.severity != null && ` · Severity ${audit.severity}`}
                </p>
                {audit.auditor_model && <p className="text-[10px] text-muted-foreground">Auditor: {audit.auditor_model}</p>}
                {audit.audit_notes && (
                  <p className="text-[11px] text-foreground whitespace-pre-wrap">{audit.audit_notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrchestratorTester;
