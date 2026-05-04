import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FlaskConical, Loader2, Cpu, Radio, Eye, ShieldAlert, ShieldCheck, Clock,
  RefreshCw, GitCompare, X, History, Trash2, Play, Download, Code2, Copy,
  ArrowUp, ArrowDown, ArrowUpDown, FileText, ExternalLink,
} from "lucide-react";
import { toCSV, downloadCSV, csvDateStamp } from "@/lib/csv";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  audit_raw?: {
    id: string;
    status: string;
    audit_notes: string | null;
    audit_model: string | null;
    severity: number | null;
    contradiction: string | null;
    poh_reference: string | null;
  } | null;
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
  const [historyFilter, setHistoryFilter] = useState<"all" | "pending" | "clean" | "flagged" | "error" | "n/a">("all");
  const [inspectEntry, setInspectEntry] = useState<HistoryEntry | null>(null);
  const [detailsEntry, setDetailsEntry] = useState<HistoryEntry | null>(null);
  const [sortKey, setSortKey] = useState<"audit_notes" | "contradiction" | "poh_reference" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [notesQuery, setNotesQuery] = useState("");
  const [contradictionQuery, setContradictionQuery] = useState("");
  const [pohQuery, setPohQuery] = useState("");
  const [presenceFilter, setPresenceFilter] = useState<"any" | "notes" | "contradiction" | "poh">("any");

  const applyHistoryFilters = (rows: HistoryEntry[]) => {
    const nq = notesQuery.trim().toLowerCase();
    const cq = contradictionQuery.trim().toLowerCase();
    const pq = pohQuery.trim().toLowerCase();
    return rows.filter(h => {
      if (historyFilter !== "all" && h.audit_status !== historyFilter) return false;
      const notes = h.audit_raw?.audit_notes ?? "";
      const contradiction = h.audit_raw?.contradiction ?? "";
      const poh = h.audit_raw?.poh_reference ?? "";
      if (presenceFilter === "notes" && !notes) return false;
      if (presenceFilter === "contradiction" && !contradiction) return false;
      if (presenceFilter === "poh" && !poh) return false;
      if (nq && !notes.toLowerCase().includes(nq)) return false;
      if (cq && !contradiction.toLowerCase().includes(cq)) return false;
      if (pq && !poh.toLowerCase().includes(pq)) return false;
      return true;
    });
  };
  const hasExtraFilters =
    presenceFilter !== "any" || !!notesQuery.trim() || !!contradictionQuery.trim() || !!pohQuery.trim();
  const toggleSort = (key: "audit_notes" | "contradiction" | "poh_reference") => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir("asc"); }
  };
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
  }, [history]);

  const addHistory = (forced: TaskType, promptText: string, data: OrchestratorResult) => {
    setHistory(prev => [
      {
        id: `${data.audit_id ?? ""}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ts: Date.now(),
        prompt: promptText,
        forced_task: forced,
        routed_task: data.task,
        model: data.model,
        latency_ms: data.latency_ms,
        audit_id: data.audit_id,
        audit_status: data.audit_id ? "pending" : "n/a",
        audit_severity: null,
      },
      ...prev,
    ].slice(0, HISTORY_LIMIT));
  };

  const updateHistoryAudit = (auditId: string, status: string, severity: number | null, raw?: AuditRow | null) => {
    setHistory(prev => prev.map(h =>
      h.audit_id === auditId
        ? { ...h, audit_status: status, audit_severity: severity, audit_raw: raw ?? h.audit_raw ?? null }
        : h,
    ));
  };

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
        const auditObj: AuditRow = {
          id: row.id,
          status: row.status,
          audit_notes: row.audit_notes,
          audit_model: row.audit_model,
          severity: flag?.severity ?? null,
          contradiction: flag?.contradiction ?? null,
          poh_reference: flag?.poh_reference ?? null,
        };
        update({ audit: auditObj });
        if (row.status !== "pending") {
          updateHistoryAudit(id, row.status, flag?.severity ?? null, auditObj);
          update({ polling: false });
          return;
        }
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
      addHistory(forcedTask, prompt, data);
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

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="font-display text-xs font-semibold text-foreground uppercase tracking-wider">
              Run history
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {history.length}/{HISTORY_LIMIT} (this browser)
            </span>
          </div>
          {history.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const filtered = historyFilter === "all"
                    ? history
                    : history.filter(h => h.audit_status === historyFilter);
                  if (filtered.length === 0) {
                    toast.error("Nothing to export for this filter");
                    return;
                  }
                  const rows = filtered.map(h => ({
                    timestamp_iso: new Date(h.ts).toISOString(),
                    timestamp_local: new Date(h.ts).toLocaleString(),
                    prompt: h.prompt,
                    forced_task: h.forced_task,
                    routed_task: h.routed_task,
                    model: h.model,
                    latency_ms: h.latency_ms,
                    audit_id: h.audit_id ?? "",
                    audit_status: h.audit_status,
                    audit_severity: h.audit_severity ?? "",
                  }));
                  const csv = toCSV(rows, [
                    "timestamp_iso", "timestamp_local", "prompt",
                    "forced_task", "routed_task", "model", "latency_ms",
                    "audit_id", "audit_status", "audit_severity",
                  ]);
                  const suffix = historyFilter === "all" ? "all" : historyFilter.replace("/", "-");
                  downloadCSV(`orchestrator-history-${suffix}-${csvDateStamp()}.csv`, csv);
                  toast.success(`Exported ${filtered.length} run${filtered.length === 1 ? "" : "s"}`);
                }}
              >
                <Download className="w-3 h-3 mr-1.5" /> Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const filtered = historyFilter === "all"
                    ? history
                    : history.filter(h => h.audit_status === historyFilter);
                  if (filtered.length === 0) {
                    toast.error("Nothing to export for this filter");
                    return;
                  }
                  const payload = {
                    exported_at: new Date().toISOString(),
                    filter: historyFilter,
                    count: filtered.length,
                    runs: filtered.map(h => ({
                      id: h.id,
                      timestamp_iso: new Date(h.ts).toISOString(),
                      timestamp_ms: h.ts,
                      prompt: h.prompt,
                      forced_task: h.forced_task,
                      routed_task: h.routed_task,
                      model: h.model,
                      latency_ms: h.latency_ms,
                      audit_id: h.audit_id,
                      audit_status: h.audit_status,
                      audit_severity: h.audit_severity,
                      audit_raw: h.audit_raw ?? null,
                    })),
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: "application/json;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  const suffix = historyFilter === "all" ? "all" : historyFilter.replace("/", "-");
                  a.href = url;
                  a.download = `orchestrator-history-${suffix}-${csvDateStamp()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${filtered.length} run${filtered.length === 1 ? "" : "s"} as JSON`);
                }}
              >
                <Download className="w-3 h-3 mr-1.5" /> Export JSON
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setHistory([])}>
                <Trash2 className="w-3 h-3 mr-1.5" /> Clear
              </Button>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No runs yet. Press Run, Re-run, or Compare to populate the history.
          </p>
        ) : (
          <>
            {(() => {
              const counts = history.reduce<Record<string, number>>((acc, h) => {
                acc[h.audit_status] = (acc[h.audit_status] ?? 0) + 1;
                return acc;
              }, {});
              const filters: { key: typeof historyFilter; label: string }[] = [
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "clean", label: "Clean" },
                { key: "flagged", label: "Flagged" },
                { key: "error", label: "Errors" },
                { key: "n/a", label: "N/A" },
              ];
              return (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {filters.map(f => {
                    const n = f.key === "all" ? history.length : (counts[f.key] ?? 0);
                    const active = historyFilter === f.key;
                    return (
                      <Button
                        key={f.key}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setHistoryFilter(f.key)}
                      >
                        {f.label} <span className="ml-1 opacity-70">{n}</span>
                      </Button>
                    );
                  })}
                </div>
              );
            })()}
            {(() => {
              const base = historyFilter === "all"
                ? history
                : history.filter(h => h.audit_status === historyFilter);
              const filtered = sortKey
                ? [...base].sort((a, b) => {
                    const av = (a.audit_raw?.[sortKey] ?? "") as string;
                    const bv = (b.audit_raw?.[sortKey] ?? "") as string;
                    if (!av && bv) return 1;
                    if (av && !bv) return -1;
                    const cmp = av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true });
                    return sortDir === "asc" ? cmp : -cmp;
                  })
                : base;
              if (filtered.length === 0) {
                return (
                  <p className="text-[11px] text-muted-foreground italic">
                    No runs match this filter.
                  </p>
                );
              }
              return (
          <div className="rounded-lg border border-border bg-background/40 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="text-left px-2.5 py-1.5 font-semibold">Time</th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">Prompt</th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">Forced → routed</th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">Model</th>
                  <th className="text-right px-2.5 py-1.5 font-semibold">Latency</th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">Audit</th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort("audit_notes")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Notes
                      {sortKey === "audit_notes"
                        ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                        : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                  </th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort("contradiction")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Contradiction
                      {sortKey === "contradiction"
                        ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                        : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                  </th>
                  <th className="text-left px-2.5 py-1.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort("poh_reference")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      POH ref
                      {sortKey === "poh_reference"
                        ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                        : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                  </th>
                  <th className="px-2.5 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => {
                  const auditColor =
                    h.audit_status === "flagged" ? "text-destructive" :
                    h.audit_status === "clean" ? "text-emerald-500" :
                    h.audit_status === "pending" ? "text-amber-500" :
                    "text-muted-foreground";
                  return (
                    <tr key={h.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="px-2.5 py-1.5 whitespace-nowrap text-muted-foreground font-mono">
                        {new Date(h.ts).toLocaleTimeString()}
                      </td>
                      <td className="px-2.5 py-1.5 max-w-[260px] truncate text-foreground" title={h.prompt}>
                        {h.prompt}
                      </td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <span className="text-muted-foreground">{h.forced_task}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="text-foreground font-semibold">{h.routed_task}</span>
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-foreground/90 max-w-[200px] truncate" title={h.model}>
                        {h.model}
                      </td>
                      <td className="px-2.5 py-1.5 text-right whitespace-nowrap text-foreground">
                        {h.latency_ms} ms
                      </td>
                      <td className={`px-2.5 py-1.5 whitespace-nowrap font-semibold ${auditColor}`}>
                        {h.audit_status}
                        {h.audit_severity != null && ` · S${h.audit_severity}`}
                      </td>
                      <td
                        className="px-2.5 py-1.5 max-w-[200px] truncate text-foreground/90"
                        title={h.audit_raw?.audit_notes ?? ""}
                      >
                        {h.audit_raw?.audit_notes
                          ? (
                            <button
                              type="button"
                              onClick={() => setDetailsEntry(h)}
                              className="text-left hover:text-primary hover:underline truncate w-full"
                            >
                              {h.audit_raw.audit_notes}
                            </button>
                          )
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td
                        className="px-2.5 py-1.5 max-w-[200px] truncate text-foreground/90"
                        title={h.audit_raw?.contradiction ?? ""}
                      >
                        {h.audit_raw?.contradiction
                          ? (
                            <button
                              type="button"
                              onClick={() => setDetailsEntry(h)}
                              className="text-left hover:text-primary hover:underline truncate w-full"
                            >
                              {h.audit_raw.contradiction}
                            </button>
                          )
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td
                        className="px-2.5 py-1.5 max-w-[160px] truncate font-mono text-foreground/90"
                        title={h.audit_raw?.poh_reference ?? ""}
                      >
                        {h.audit_raw?.poh_reference
                          ? (
                            <button
                              type="button"
                              onClick={() => setDetailsEntry(h)}
                              className="text-primary hover:underline truncate w-full text-left"
                            >
                              {h.audit_raw.poh_reference}
                            </button>
                          )
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="View audit details"
                          onClick={() => setDetailsEntry(h)}
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="View full audit JSON"
                          onClick={() => setInspectEntry(h)}
                        >
                          <Code2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Reuse this prompt"
                          onClick={() => {
                            setPrompt(h.prompt);
                            setTask(h.forced_task);
                          }}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
              );
            })()}
          </>
        )}
      </div>

      <Dialog open={!!inspectEntry} onOpenChange={(o) => !o && setInspectEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Code2 className="w-4 h-4 text-primary" />
              Run inspector
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {inspectEntry && new Date(inspectEntry.ts).toLocaleString()} ·{" "}
              <span className="font-mono">{inspectEntry?.routed_task}</span> ·{" "}
              <span className="font-mono">{inspectEntry?.model}</span> ·{" "}
              {inspectEntry?.latency_ms} ms
            </DialogDescription>
          </DialogHeader>

          {inspectEntry && (() => {
            const payload = {
              id: inspectEntry.id,
              timestamp_iso: new Date(inspectEntry.ts).toISOString(),
              prompt: inspectEntry.prompt,
              forced_task: inspectEntry.forced_task,
              routed_task: inspectEntry.routed_task,
              model: inspectEntry.model,
              latency_ms: inspectEntry.latency_ms,
              audit_id: inspectEntry.audit_id,
              audit_status: inspectEntry.audit_status,
              audit_severity: inspectEntry.audit_severity,
              audit_raw: inspectEntry.audit_raw ?? null,
            };
            const text = JSON.stringify(payload, null, 2);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Full audit payload
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(text);
                        toast.success("Copied JSON to clipboard");
                      } catch {
                        toast.error("Copy failed");
                      }
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1.5" /> Copy JSON
                  </Button>
                </div>
                <ScrollArea className="h-[60vh] rounded-md border border-border bg-background/40">
                  <pre className="text-[11px] font-mono text-foreground p-3 whitespace-pre-wrap break-all">
                    {text}
                  </pre>
                </ScrollArea>
                {!inspectEntry.audit_raw && (
                  <p className="text-[10px] text-muted-foreground italic">
                    No raw audit verdict captured for this run (skipped, pending, or pre-existing entry).
                  </p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsEntry} onOpenChange={(o) => !o && setDetailsEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-primary" />
              Audit details
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {detailsEntry && new Date(detailsEntry.ts).toLocaleString()} ·{" "}
              <span className="font-mono">{detailsEntry?.routed_task}</span> ·{" "}
              <span className="font-mono">{detailsEntry?.audit_status}</span>
              {detailsEntry?.audit_severity != null && ` · S${detailsEntry.audit_severity}`}
            </DialogDescription>
          </DialogHeader>

          {detailsEntry && (
            <ScrollArea className="max-h-[65vh] pr-3">
              <div className="space-y-4">
                <section>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Prompt
                  </p>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap rounded-md border border-border bg-background/40 p-2.5">
                    {detailsEntry.prompt}
                  </p>
                </section>

                <section>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Audit notes
                  </p>
                  {detailsEntry.audit_raw?.audit_notes ? (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap rounded-md border border-border bg-background/40 p-2.5 leading-relaxed">
                      {detailsEntry.audit_raw.audit_notes}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No notes recorded.</p>
                  )}
                  {detailsEntry.audit_raw?.audit_model && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      Auditor: {detailsEntry.audit_raw.audit_model}
                    </p>
                  )}
                </section>

                <section>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Contradiction
                  </p>
                  {detailsEntry.audit_raw?.contradiction ? (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-2.5 leading-relaxed">
                      {detailsEntry.audit_raw.contradiction}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No contradiction flagged.</p>
                  )}
                </section>

                <section>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    POH reference
                  </p>
                  {detailsEntry.audit_raw?.poh_reference ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2.5">
                      <span className="text-xs font-mono text-foreground/90 break-all">
                        {detailsEntry.audit_raw.poh_reference}
                      </span>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(detailsEntry.audit_raw.poh_reference)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline whitespace-nowrap"
                      >
                        Search <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No POH reference cited.</p>
                  )}
                </section>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => {
                      const r = detailsEntry.audit_raw;
                      const text = [
                        `Notes: ${r?.audit_notes ?? "—"}`,
                        `Contradiction: ${r?.contradiction ?? "—"}`,
                        `POH ref: ${r?.poh_reference ?? "—"}`,
                      ].join("\n");
                      navigator.clipboard.writeText(text)
                        .then(() => toast.success("Copied details"))
                        .catch(() => toast.error("Copy failed"));
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1.5" /> Copy details
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrchestratorTester;
