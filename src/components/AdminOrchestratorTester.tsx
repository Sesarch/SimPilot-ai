import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FlaskConical, Loader2, Cpu, Radio, Eye, ShieldAlert, ShieldCheck, Clock,
  RefreshCw, GitCompare, X, History, Trash2, Play,
} from "lucide-react";

type HistoryEntry = {
  id: string;
  ts: number;
  prompt: string;
  forced_task: TaskType;
  routed_task: string;
  model: string;
  latency_ms: number;
  audit_id: string | null;
  audit_status: string; // "n/a" | "pending" | "clean" | "flagged" | "error"
  audit_severity: number | null;
};

const HISTORY_KEY = "simpilot.admin.orchestrator.history.v1";
const HISTORY_LIMIT = 25;

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

type Slot = {
  task: TaskType;
  result: OrchestratorResult | null;
  audit: AuditRow | null;
  loading: boolean;
  polling: boolean;
};

const SAMPLES: Record<Exclude<TaskType, "auto">, string> = {
  technical: "What is Vx vs Vy in a Cessna 172, and when would I use each on departure?",
  operational: "Read back this clearance: 'Skyhawk 12345, cleared to KPAO via direct, climb and maintain 3000, squawk 4521.'",
  vision: "I'm looking at a sectional chart with a magenta dashed circle around an airport. What does that indicate?",
};

const emptySlot = (task: TaskType): Slot => ({
  task, result: null, audit: null, loading: false, polling: false,
});

const TaskBadge = ({ task }: { task: string }) => {
  const Icon = task === "operational" ? Radio : task === "vision" ? Eye : Cpu;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-semibold text-foreground">{task}</span>
    </span>
  );
};

const SlotCard = ({
  label,
  slot,
  onClose,
}: {
  label: string;
  slot: Slot;
  onClose?: () => void;
}) => {
  const audit = slot.audit;
  const sevColor =
    audit?.severity === 1 ? "text-destructive" :
    audit?.severity === 2 ? "text-amber-500" :
    audit?.status === "clean" ? "text-emerald-500" :
    "text-muted-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label} · forced: {slot.task}
        </p>
        {onClose && (
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {slot.loading && (
        <div className="p-3 rounded-lg border border-border bg-background/40 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…
        </div>
      )}

      {slot.result && !slot.loading && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="p-2.5 rounded-lg border border-border bg-background/40">
              <p className="text-[10px] text-muted-foreground uppercase">Routed</p>
              <TaskBadge task={slot.result.task} />
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/40">
              <p className="text-[10px] text-muted-foreground uppercase">Model</p>
              <p className="text-[11px] font-mono text-foreground break-all">{slot.result.model}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/40 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Latency</p>
                <p className="text-xs font-semibold text-foreground">{slot.result.latency_ms} ms</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/40">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">AI response</p>
            <pre className="text-[11px] whitespace-pre-wrap text-foreground max-h-72 overflow-auto">
              {slot.result.response}
            </pre>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/40">
            <div className="flex items-center gap-2 mb-1">
              {audit?.status === "flagged"
                ? <ShieldAlert className={`w-4 h-4 ${sevColor}`} />
                : <ShieldCheck className={`w-4 h-4 ${sevColor}`} />}
              <p className="text-[10px] text-muted-foreground uppercase">Safety audit</p>
              {slot.polling && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
            </div>
            {!slot.result.audit_id && (
              <p className="text-[11px] text-muted-foreground">Shadow audit skipped (vision or disabled).</p>
            )}
            {slot.result.audit_id && !audit && (
              <p className="text-[11px] text-muted-foreground">
                Queued · <span className="font-mono">{slot.result.audit_id.slice(0, 8)}</span> · waiting for auditor…
              </p>
            )}
            {audit && (
              <div className="space-y-2">
                <p className={`text-xs font-semibold ${sevColor}`}>
                  {audit.status.toUpperCase()}
                  {audit.severity != null && ` · Severity ${audit.severity}`}
                </p>
                {audit.status === "flagged" && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 space-y-1.5">
                    {audit.contradiction && (
                      <p className="text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">
                        {audit.contradiction}
                      </p>
                    )}
                    {audit.poh_reference && (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(audit.poh_reference)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-block text-[11px] text-primary hover:underline font-mono break-all"
                      >
                        Ref: {audit.poh_reference}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const AdminOrchestratorTester = () => {
  const [task, setTask] = useState<TaskType>("auto");
  const [compareTask, setCompareTask] = useState<TaskType>("operational");
  const [prompt, setPrompt] = useState(SAMPLES.technical);
  const [slotA, setSlotA] = useState<Slot>(emptySlot("auto"));
  const [slotB, setSlotB] = useState<Slot | null>(null);

  const loadSample = (t: Exclude<TaskType, "auto">) => {
    setTask(t);
    setPrompt(SAMPLES[t]);
  };

  const pollAudit = (id: string, setter: React.Dispatch<React.SetStateAction<Slot | null>> | ((u: (s: Slot) => Slot) => void), isB = false) => {
    let attempts = 0;
    const update = (patch: Partial<Slot>) => {
      if (isB) (setter as React.Dispatch<React.SetStateAction<Slot | null>>)(prev => prev ? { ...prev, ...patch } : prev);
      else (setter as (u: (s: Slot) => Slot) => void)(prev => ({ ...prev, ...patch }));
    };
    update({ polling: true });

    const tick = async () => {
      attempts++;
      const { data: row } = await supabase
        .from("ai_audit_queue")
        .select("id, status, audit_notes, audit_model")
        .eq("id", id).maybeSingle();
      const { data: flag } = await supabase
        .from("ai_safety_flags")
        .select("severity, contradiction, poh_reference")
        .eq("audit_queue_id", id).maybeSingle();
      if (row) {
        update({
          audit: {
            id: row.id,
            status: row.status,
            audit_notes: row.audit_notes,
            audit_model: row.audit_model,
            severity: flag?.severity ?? null,
            contradiction: flag?.contradiction ?? null,
            poh_reference: flag?.poh_reference ?? null,
          },
        });
        if (row.status !== "pending") { update({ polling: false }); return; }
      }
      if (attempts < 30) setTimeout(tick, 2500);
      else update({ polling: false });
    };
    tick();
  };

  const invokeFor = async (forcedTask: TaskType): Promise<OrchestratorResult> => {
    const { data, error } = await supabase.functions.invoke("admin-orchestrator-test", {
      body: { task: forcedTask, messages: [{ role: "user", content: prompt }] },
    });
    if (error) throw error;
    if (!data?.response) throw new Error(data?.error || "No response from orchestrator");
    return data as OrchestratorResult;
  };

  const runSlot = async (which: "A" | "B", forcedTask: TaskType) => {
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    const fresh: Slot = { task: forcedTask, result: null, audit: null, loading: true, polling: false };
    if (which === "A") setSlotA(fresh);
    else setSlotB(fresh);

    try {
      const data = await invokeFor(forcedTask);
      if (which === "A") {
        setSlotA(prev => ({ ...prev, result: data, loading: false }));
        if (data.audit_id) pollAudit(data.audit_id, setSlotA as any, false);
      } else {
        setSlotB(prev => prev ? { ...prev, result: data, loading: false } : prev);
        if (data.audit_id) pollAudit(data.audit_id, setSlotB as any, true);
      }
      toast.success(`${which}: routed to ${data.task}`);
    } catch (e: any) {
      toast.error(`${which} failed: ${e?.message || "error"}`);
      if (which === "A") setSlotA(prev => ({ ...prev, loading: false }));
      else setSlotB(prev => prev ? { ...prev, loading: false } : prev);
    }
  };

  const run = () => runSlot("A", task);
  const rerun = () => {
    runSlot("A", slotA.task);
    if (slotB) runSlot("B", slotB.task);
  };
  const compare = async () => {
    if (compareTask === task) {
      toast.error("Pick a different task type for B");
      return;
    }
    await Promise.all([runSlot("A", task), runSlot("B", compareTask)]);
  };

  const anyLoading = slotA.loading || (slotB?.loading ?? false);
  const hasResult = !!slotA.result || !!slotB?.result;

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-primary/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">
          Orchestrator Test Console
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Send a sample prompt through <code className="text-[10px]">ai-orchestrator</code>, re-run for
        regression checks, or compare two forced task types side-by-side.
      </p>

      <div className="grid gap-3 sm:grid-cols-[160px,160px,1fr] mb-3">
        <div>
          <Label className="text-xs">Force task (A)</Label>
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
          <Label className="text-xs">Compare with (B)</Label>
          <Select value={compareTask} onValueChange={(v) => setCompareTask(v as TaskType)}>
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
        <Button size="sm" onClick={run} disabled={anyLoading}>
          {anyLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <FlaskConical className="w-3 h-3 mr-1.5" />}
          Run
        </Button>
        <Button size="sm" variant="secondary" onClick={rerun} disabled={anyLoading || !hasResult}>
          <RefreshCw className="w-3 h-3 mr-1.5" /> Re-run
        </Button>
        <Button size="sm" variant="secondary" onClick={compare} disabled={anyLoading}>
          <GitCompare className="w-3 h-3 mr-1.5" /> Compare A vs B
        </Button>
        <span className="text-[10px] text-muted-foreground ml-2 mr-1">Samples:</span>
        <Button size="sm" variant="outline" onClick={() => loadSample("technical")}>Technical</Button>
        <Button size="sm" variant="outline" onClick={() => loadSample("operational")}>Operational</Button>
        <Button size="sm" variant="outline" onClick={() => loadSample("vision")}>Vision</Button>
      </div>

      {(hasResult || anyLoading) && (
        <div className={`grid gap-4 ${slotB ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          <SlotCard label="Result A" slot={slotA} />
          {slotB && (
            <SlotCard label="Result B" slot={slotB} onClose={() => setSlotB(null)} />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOrchestratorTester;
