import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, ShieldCheck, Loader2, Cpu, Radio, Eye, ScanSearch, Activity, CheckCircle2, XCircle } from "lucide-react";

const GATEWAY_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview) — fast" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — balanced" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — cheapest" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — strongest reasoning + vision" },
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (via gateway)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (via gateway)" },
  { value: "openai/gpt-5", label: "GPT-5 (via gateway)" },
  { value: "openai/gpt-5.2", label: "GPT-5.2 (via gateway)" },
];

const ANTHROPIC_MODELS = [
  { value: "anthropic/claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Anthropic direct)" },
  { value: "anthropic/claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (Anthropic direct)" },
  { value: "anthropic/claude-3-opus-latest", label: "Claude 3 Opus (Anthropic direct)" },
];

const OPENAI_DIRECT = [
  { value: "openai/gpt-4o", label: "GPT-4o (OpenAI direct, low latency)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (OpenAI direct)" },
  { value: "openai/o1", label: "o1 (OpenAI direct, deep reasoning)" },
  { value: "openai/o1-mini", label: "o1 Mini (OpenAI direct)" },
];

const ALL = [...ANTHROPIC_MODELS, ...OPENAI_DIRECT, ...GATEWAY_MODELS];

const SCOPE_OPTIONS = [
  { value: "all", label: "All AI chat responses" },
  { value: "oral_exam", label: "Oral Exam only" },
  { value: "training", label: "Oral Exam + Ground One-on-One" },
  { value: "off", label: "Off (no audit)" },
];

type Settings = {
  primary_model: string;
  reviewer_model: string;
  reviewer_enabled: boolean;
  reviewer_scope: string;
  guardrails_enabled: boolean;
  technical_model: string;
  operational_model: string;
  vision_model: string;
  auditor_model: string;
  shadow_audit_enabled: boolean;
};

type AuditRow = {
  id: string;
  task_type: string;
  primary_model: string;
  status: string;
  audit_notes: string | null;
  created_at: string;
};

const ModelPicker = ({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
    <SelectContent>
      {options.map((m) => (
        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const AdminModelSettings = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [health, setHealth] = useState<{ checked_at: string; results: any[] } | null>(null);

  const runHealthCheck = async () => {
    setHealthLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-health-check", { body: {} });
    setHealthLoading(false);
    if (error) { toast.error(error.message); return; }
    setHealth(data);
    const bad = (data?.results || []).filter((r: any) => !r.ok).length;
    if (bad === 0) toast.success("All brains reachable");
    else toast.warning(`${bad} brain(s) failing — see details below`);
  };

  useEffect(() => {
    supabase.from("model_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else if (data) setS(data as Settings);
      });
    supabase.from("ai_audit_queue")
      .select("id, task_type, primary_model, status, audit_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => { if (data) setAudits(data as any); });
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase
      .from("model_settings")
      .update({
        primary_model: s.primary_model,
        reviewer_model: s.reviewer_model,
        reviewer_enabled: s.reviewer_enabled,
        reviewer_scope: s.reviewer_scope,
        guardrails_enabled: s.guardrails_enabled,
        technical_model: s.technical_model,
        operational_model: s.operational_model,
        vision_model: s.vision_model,
        auditor_model: s.auditor_model,
        shadow_audit_enabled: s.shadow_audit_enabled,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Model settings saved");
  };

  if (!s) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Multi-Brain Orchestrator ---------- */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-primary/30 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm text-foreground">
            Multi-Brain Orchestrator (Deep Vertical Engine)
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Routes each request to a specialist model. Pilot Profile (tail #, license, training progress)
          is shared across all four brains.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Technical Brain (POH, V-speeds, regs)</Label>
            <ModelPicker value={s.technical_model} onChange={(v) => setS({ ...s, technical_model: v })} options={ALL} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5"><Radio className="w-3 h-3" /> Operational Brain (ATC / PTT)</Label>
            <ModelPicker value={s.operational_model} onChange={(v) => setS({ ...s, operational_model: v })} options={ALL} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5"><Eye className="w-3 h-3" /> Vision & Data Analyst (charts, screenshots)</Label>
            <ModelPicker value={s.vision_model} onChange={(v) => setS({ ...s, vision_model: v })} options={ALL} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5"><ScanSearch className="w-3 h-3" /> Safety Auditor (shadow review)</Label>
            <ModelPicker value={s.auditor_model} onChange={(v) => setS({ ...s, auditor_model: v })} options={ALL} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-foreground">Shadow Audit</p>
            <p className="text-[11px] text-muted-foreground">Async review of every Technical/Operational response. Severity 1 → user banner.</p>
          </div>
          <Switch checked={s.shadow_audit_enabled} onCheckedChange={(v) => setS({ ...s, shadow_audit_enabled: v })} />
        </div>
      </div>

      {/* ---------- Model Connection Health ---------- */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm text-foreground">Model Connection Health</h2>
          </div>
          <Button size="sm" variant="outline" onClick={runHealthCheck} disabled={healthLoading}>
            {healthLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Activity className="w-3 h-3 mr-1.5" />}
            {healthLoading ? "Pinging..." : "Run health check"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Sends a tiny ping to each direct provider key (Anthropic, OpenAI, Lovable Gateway) and decodes any 401/404/429 errors.
        </p>
        {!health && !healthLoading && (
          <p className="text-[11px] text-muted-foreground italic">No check yet — click "Run health check".</p>
        )}
        {health && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Last checked: {new Date(health.checked_at).toLocaleString()}</p>
            {health.results.map((r: any) => (
              <div key={r.brain} className={`p-3 rounded-lg border text-xs ${r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span className="text-foreground">{r.brain}</span>
                  <span className="text-muted-foreground">→ {r.model}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {r.status ? `HTTP ${r.status}` : "no response"} · {r.latency_ms}ms
                  </span>
                </div>
                {!r.ok && (
                  <div className="mt-2 ml-6 space-y-1">
                    {r.hint && <p className="text-[11px] text-foreground"><span className="">What to do: </span>{r.hint}</p>}
                    {r.error && <p className="text-[10px] text-muted-foreground font-mono break-all">{r.error}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Legacy single-flow settings (still used by pilot-chat) ---------- */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm text-foreground">Legacy Primary / Reviewer</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Used by the existing pilot-chat streaming endpoint. The Orchestrator above supersedes this for new call sites.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Primary</Label>
            <ModelPicker value={s.primary_model} onChange={(v) => setS({ ...s, primary_model: v })} options={GATEWAY_MODELS} />
          </div>
          <div>
            <Label className="text-xs">Reviewer</Label>
            <ModelPicker value={s.reviewer_model} onChange={(v) => setS({ ...s, reviewer_model: v })} options={GATEWAY_MODELS} />
          </div>
          <div>
            <Label className="text-xs">Apply reviewer to</Label>
            <Select value={s.reviewer_scope} onValueChange={(v) => setS({ ...s, reviewer_scope: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={s.reviewer_enabled} onCheckedChange={(v) => setS({ ...s, reviewer_enabled: v })} />
              <span className="text-xs">Reviewer enabled</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h2 className="font-display text-sm text-foreground">Aviation Guardrails</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Never invent emergency procedures or performance data; recommend POH/CFI when uncertain.
            </p>
          </div>
          <Switch
            checked={s.guardrails_enabled}
            onCheckedChange={(v) => setS({ ...s, guardrails_enabled: v })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Model Settings"}
        </Button>
      </div>

      {/* ---------- Recent audit log ---------- */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <h2 className="font-display text-sm text-foreground mb-3">Recent Shadow Audits</h2>
        {audits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No audits yet. Once users chat, the Safety Auditor's results will appear here.</p>
        ) : (
          <div className="space-y-1.5">
            {audits.map((a) => (
              <div key={a.id} className="text-[11px] flex items-center gap-2 py-1.5 px-2 rounded bg-background/40">
                <span className={
                  a.status === "flagged" ? "text-destructive " :
                  a.status === "clean" ? "text-emerald-500" :
                  a.status === "error" ? "text-amber-500" : "text-muted-foreground"
                }>
                  {a.status.toUpperCase()}
                </span>
                <span className="text-muted-foreground">{a.task_type}</span>
                <span className="text-muted-foreground truncate">{a.primary_model}</span>
                <span className="ml-auto text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModelSettings;
