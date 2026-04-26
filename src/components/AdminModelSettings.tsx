import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, ShieldCheck, Loader2 } from "lucide-react";

const MODEL_OPTIONS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview) — fast, balanced" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — balanced default" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — cheapest, fastest" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — strongest reasoning" },
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview) — next-gen reasoning" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano — speed/cost focused" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini — middle ground" },
  { value: "openai/gpt-5", label: "GPT-5 — premium accuracy" },
  { value: "openai/gpt-5.2", label: "GPT-5.2 — latest reasoning" },
];

const SCOPE_OPTIONS = [
  { value: "all", label: "All AI chat responses" },
  { value: "oral_exam", label: "Oral Exam only" },
  { value: "training", label: "Oral Exam + Ground School" },
  { value: "off", label: "Off (no audit)" },
];

type Settings = {
  primary_model: string;
  reviewer_model: string;
  reviewer_enabled: boolean;
  reviewer_scope: string;
  guardrails_enabled: boolean;
};

const AdminModelSettings = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("model_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else if (data) setS(data as Settings);
      });
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
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Primary Model</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Writes the answer that students see. Routed through Lovable AI — no API keys needed.
        </p>
        <Select value={s.primary_model} onValueChange={(v) => setS({ ...s, primary_model: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="font-display text-sm font-semibold text-foreground">Reviewer Model</h2>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="reviewer-enabled" className="text-xs text-muted-foreground">Enabled</Label>
            <Switch
              id="reviewer-enabled"
              checked={s.reviewer_enabled}
              onCheckedChange={(v) => setS({ ...s, reviewer_enabled: v })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Audits the primary answer for FAA accuracy and hallucinations. If issues are found, a safety
          notice is appended pointing the student to official FAA docs.
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Reviewer model</Label>
            <Select value={s.reviewer_model} onValueChange={(v) => setS({ ...s, reviewer_model: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Apply reviewer to</Label>
            <Select value={s.reviewer_scope} onValueChange={(v) => setS({ ...s, reviewer_scope: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">Aviation Guardrails</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Never invent emergency procedures or performance data. When uncertain, recommend
              consulting official FAA documentation, the POH, or a CFI.
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
    </div>
  );
};

export default AdminModelSettings;
