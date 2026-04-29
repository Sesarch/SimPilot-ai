import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Plane, Flame, Radio, X, Save, Pencil, Download, CheckCheck, GraduationCap, Tablet } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePilotContext } from "@/hooks/usePilotContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { onDashboardRefresh, emitDashboardRefresh } from "@/lib/dashboardEvents";
import { buildForeFlightCsv, downloadCsv } from "@/lib/foreflightLogbookCsv";
import MonthlyHoursChart from "@/components/logbook/MonthlyHoursChart";
import DraftsReviewPanel from "@/components/logbook/DraftsReviewPanel";
import PmdgDebriefModal, { type PmdgDebrief } from "@/components/PmdgDebriefModal";

type FlightLog = {
  id: string;
  status: "draft" | "final";
  flight_date: string;
  aircraft_type: string | null;
  tail_number: string | null;
  departure: string | null;
  destination: string | null;
  route: string | null;
  total_time: number;
  pic_time: number;
  sic_time: number;
  cross_country_time: number;
  night_time: number;
  day_time: number;
  instrument_time: number;
  simulated_instrument_time: number;
  dual_received_time: number;
  dual_given_time: number;
  solo_time: number;
  day_landings: number;
  night_landings: number;
  approaches: number;
  remarks: string | null;
  source: "manual" | "atc_session" | "msfs2024" | "xplane12" | "sim" | "tracking_device";
  source_session_id: string | null;
  created_at: string;
  pmdg_debrief: PmdgDebrief | null;
};

const emptyDraft = (): Partial<FlightLog> => ({
  status: "final",
  flight_date: new Date().toISOString().slice(0, 10),
  aircraft_type: "",
  tail_number: "",
  departure: "",
  destination: "",
  route: "",
  total_time: 0,
  pic_time: 0,
  sic_time: 0,
  cross_country_time: 0,
  night_time: 0,
  day_time: 0,
  instrument_time: 0,
  simulated_instrument_time: 0,
  dual_received_time: 0,
  dual_given_time: 0,
  solo_time: 0,
  day_landings: 0,
  night_landings: 0,
  approaches: 0,
  remarks: "",
  source: "manual",
});

const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

// FAA Part 61 minimum aeronautical experience requirements (most common tracks).
// We surface these on the logbook so a student can see "X of Y hours remaining"
// for the certificate they're working toward.
type LicenseReq = { key: string; label: string; target: number; tooltip: string };
type LicenseSpec = { code: string; name: string; far: string; reqs: LicenseReq[] };

const LICENSE_SPECS: Record<string, LicenseSpec> = {
  PPL: {
    code: "PPL",
    name: "Private Pilot — Airplane",
    far: "14 CFR 61.109(a)",
    reqs: [
      { key: "total", label: "Total Time", target: 40, tooltip: "Min 40 hrs total flight time" },
      { key: "dual_received", label: "Dual Received", target: 20, tooltip: "Min 20 hrs of flight training with a CFI" },
      { key: "solo", label: "Solo", target: 10, tooltip: "Min 10 hrs of solo flight time" },
      { key: "xc_dual", label: "X-Country (any)", target: 5, tooltip: "Includes 3 hrs XC dual + solo XC" },
      { key: "night", label: "Night", target: 3, tooltip: "Min 3 hrs of night training" },
      { key: "instrument", label: "Instrument (sim/actual)", target: 3, tooltip: "Min 3 hrs of instrument training" },
    ],
  },
  IR: {
    code: "IR",
    name: "Instrument Rating — Airplane",
    far: "14 CFR 61.65(d)",
    reqs: [
      { key: "xc_pic", label: "X-Country PIC", target: 50, tooltip: "Min 50 hrs PIC cross-country (≥10 in airplanes)" },
      { key: "instrument", label: "Instrument (sim/actual)", target: 40, tooltip: "Min 40 hrs of actual or simulated instrument time" },
      { key: "dual_received", label: "Instrument Dual", target: 15, tooltip: "Min 15 hrs of instrument flight training with a CFII" },
    ],
  },
  CPL: {
    code: "CPL",
    name: "Commercial Pilot — Airplane (SEL)",
    far: "14 CFR 61.129(a)",
    reqs: [
      { key: "total", label: "Total Time", target: 250, tooltip: "Min 250 hrs total flight time" },
      { key: "pic", label: "PIC", target: 100, tooltip: "Min 100 hrs PIC" },
      { key: "xc_pic", label: "X-Country PIC", target: 50, tooltip: "Min 50 hrs cross-country PIC" },
      { key: "instrument", label: "Instrument (sim/actual)", target: 10, tooltip: "Min 10 hrs of instrument training" },
      { key: "night", label: "Night", target: 5, tooltip: "Min 5 hrs of night flight training" },
    ],
  },
  ATP: {
    code: "ATP",
    name: "Airline Transport Pilot — Airplane",
    far: "14 CFR 61.159",
    reqs: [
      { key: "total", label: "Total Time", target: 1500, tooltip: "Min 1,500 hrs total flight time" },
      { key: "pic", label: "PIC", target: 250, tooltip: "Min 250 hrs PIC" },
      { key: "xc", label: "X-Country", target: 500, tooltip: "Min 500 hrs cross-country" },
      { key: "night", label: "Night", target: 100, tooltip: "Min 100 hrs night" },
      { key: "instrument", label: "Instrument (sim/actual)", target: 75, tooltip: "Min 75 hrs of instrument time" },
    ],
  },
};

const LogbookPage = () => {
  const { user } = useAuth();
  const pilotCtx = usePilotContext();
  const [logs, setLogs] = useState<FlightLog[] | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [hasIronMic, setHasIronMic] = useState<boolean>(false);
  const [editing, setEditing] = useState<Partial<FlightLog> | null>(null);
  const [saving, setSaving] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefData, setDebriefData] = useState<PmdgDebrief | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) { setLogs([]); return; }
    const { data, error } = await supabase
      .from("flight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("flight_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Failed to load logbook");
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as FlightLog[]);
  }, [user]);

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    const [{ data: recent }, { data: ach }] = await Promise.all([
      supabase
        .from("exam_scores")
        .select("result, created_at")
        .eq("user_id", user.id)
        .eq("exam_type", "atc_phraseology")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_achievements")
        .select("tier")
        .eq("user_id", user.id)
        .eq("tier", "radio_streak_10")
        .maybeSingle(),
    ]);
    let count = 0;
    for (const r of recent ?? []) {
      if (r.result === "PASS") count++;
      else break;
    }
    setStreak(count);
    setHasIronMic(!!ach);
  }, [user]);

  useEffect(() => {
    void fetchLogs();
    void fetchSummary();
    const off = onDashboardRefresh(() => {
      void fetchLogs();
      void fetchSummary();
    });
    return () => { off(); };
  }, [fetchLogs, fetchSummary]);

  const totals = useMemo(() => {
    const finals = (logs ?? []).filter((l) => l.status === "final");
    const sum = (k: keyof FlightLog) => finals.reduce((a, l) => a + num(l[k]), 0);
    return {
      entries: finals.length,
      drafts: (logs ?? []).filter((l) => l.status === "draft").length,
      total: sum("total_time"),
      pic: sum("pic_time"),
      sic: sum("sic_time"),
      xc: sum("cross_country_time"),
      night: sum("night_time"),
      day: sum("day_time"),
      instrument: sum("instrument_time"),
      simInstrument: sum("simulated_instrument_time"),
      dualReceived: sum("dual_received_time"),
      dualGiven: sum("dual_given_time"),
      solo: sum("solo_time"),
      landings: sum("day_landings") + sum("night_landings"),
    };
  }, [logs]);

  // Map the student's pilot context (or rating focus) to a known license track.
  const activeLicense = useMemo<LicenseSpec | null>(() => {
    const rating = (pilotCtx.context.rating_focus ?? "").toUpperCase();
    const cert = (pilotCtx.context.certificate_type ?? "").toUpperCase();
    // Prefer rating focus (what they're training for); fall back to current cert.
    const candidates = [rating, cert];
    for (const c of candidates) {
      if (!c) continue;
      if (c.includes("ATP")) return LICENSE_SPECS.ATP;
      if (c.includes("COMMERCIAL") || c === "CPL") return LICENSE_SPECS.CPL;
      if (c.includes("INSTRUMENT") || c === "IR") return LICENSE_SPECS.IR;
      if (c.includes("PRIVATE") || c === "PPL") return LICENSE_SPECS.PPL;
    }
    // Default: assume a primary student is working toward PPL.
    return LICENSE_SPECS.PPL;
  }, [pilotCtx.context.rating_focus, pilotCtx.context.certificate_type]);

  // Map each license requirement key to a logged number.
  const licenseProgress = useMemo(() => {
    if (!activeLicense) return [];
    const lookup: Record<string, number> = {
      total: totals.total,
      pic: totals.pic,
      sic: totals.sic,
      dual_received: totals.dualReceived,
      dual_given: totals.dualGiven,
      solo: totals.solo,
      xc: totals.xc,
      xc_pic: totals.xc, // approximation: XC time is typically PIC for these certs
      xc_dual: totals.xc,
      night: totals.night,
      day: totals.day,
      instrument: totals.instrument + totals.simInstrument,
    };
    return activeLicense.reqs.map((r) => {
      const logged = lookup[r.key] ?? 0;
      const remaining = Math.max(0, r.target - logged);
      const pct = r.target > 0 ? Math.min(100, Math.round((logged / r.target) * 100)) : 0;
      return { ...r, logged, remaining, pct, met: logged >= r.target };
    });
  }, [activeLicense, totals]);


  // FAR 61.57 currency: 3 takeoffs/landings within preceding 90 days.
  // Night requires full-stop landings at night. Day allows day OR night landings.
  const currency = useMemo(() => {
    const finals = (logs ?? []).filter((l) => l.status === "final");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d;
    };
    const c30 = cutoff(30);
    const c90 = cutoff(90);
    const c180 = cutoff(180);
    let day30 = 0, day90 = 0, night30 = 0, night90 = 0;
    let approaches180 = 0, instrument180 = 0;
    let lastDay: Date | null = null;
    let lastNight: Date | null = null;
    let lastApproach: Date | null = null;
    for (const l of finals) {
      const d = new Date(l.flight_date + "T00:00:00");
      const day = num(l.day_landings);
      const night = num(l.night_landings);
      const total = day + night;
      const appr = num(l.approaches);
      const instr = num(l.instrument_time) + num(l.simulated_instrument_time);
      if (d >= c30) { day30 += total; night30 += night; }
      if (d >= c90) { day90 += total; night90 += night; }
      if (d >= c180) { approaches180 += appr; instrument180 += instr; }
      if (total > 0 && (!lastDay || d > lastDay)) lastDay = d;
      if (night > 0 && (!lastNight || d > lastNight)) lastNight = d;
      if (appr > 0 && (!lastApproach || d > lastApproach)) lastApproach = d;
    }
    // Currency expires 90 days after the 3rd-most-recent qualifying landing.
    // Simpler heuristic: current if 3+ landings in last 90 days.
    const dayCurrent = day90 >= 3;
    const nightCurrent = night90 >= 3;
    // Days remaining = 90 - (today - oldest of the most recent 3 qualifying flights).
    // Approximation: if current, show 90 - days since most recent qualifying flight.
    const daysSince = (d: Date | null) => d ? Math.floor((today.getTime() - d.getTime()) / 86400000) : null;
    const dayExpiresIn = dayCurrent && lastDay ? Math.max(0, 90 - (daysSince(lastDay) ?? 90)) : 0;
    const nightExpiresIn = nightCurrent && lastNight ? Math.max(0, 90 - (daysSince(lastNight) ?? 90)) : 0;
    const ifrCurrent = approaches180 >= 6;
    const ifrExpiresIn = ifrCurrent && lastApproach ? Math.max(0, 180 - (daysSince(lastApproach) ?? 180)) : 0;
    return {
      day30, day90, night30, night90,
      dayCurrent, nightCurrent,
      dayShortBy: Math.max(0, 3 - day90),
      nightShortBy: Math.max(0, 3 - night90),
      dayExpiresIn, nightExpiresIn,
      approaches180, instrument180,
      ifrCurrent, ifrExpiresIn,
      ifrShortBy: Math.max(0, 6 - approaches180),
    };
  }, [logs]);

  const handleSave = async () => {
    if (!user || !editing) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        status: (editing.status as "draft" | "final") ?? "final",
        flight_date: editing.flight_date ?? new Date().toISOString().slice(0, 10),
        aircraft_type: editing.aircraft_type || null,
        tail_number: editing.tail_number || null,
        departure: editing.departure || null,
        destination: editing.destination || null,
        route: editing.route || null,
        total_time: num(editing.total_time),
        pic_time: num(editing.pic_time),
        sic_time: num(editing.sic_time),
        cross_country_time: num(editing.cross_country_time),
        night_time: num(editing.night_time),
        day_time: num(editing.day_time),
        instrument_time: num(editing.instrument_time),
        simulated_instrument_time: num(editing.simulated_instrument_time),
        dual_received_time: num(editing.dual_received_time),
        dual_given_time: num(editing.dual_given_time),
        solo_time: num(editing.solo_time),
        day_landings: num(editing.day_landings),
        night_landings: num(editing.night_landings),
        approaches: num(editing.approaches),
        remarks: editing.remarks || null,
        source: editing.source ?? "manual",
        source_session_id: editing.source_session_id ?? null,
      };
      if (editing.id) {
        const { error } = await supabase.from("flight_logs").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Logbook entry updated");
      } else {
        const { error } = await supabase.from("flight_logs").insert(payload);
        if (error) throw error;
        toast.success("Logbook entry added");
      }
      setEditing(null);
      await fetchLogs();
      emitDashboardRefresh({ source: "other" });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this logbook entry?")) return;
    const { error } = await supabase.from("flight_logs").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Entry deleted");
    await fetchLogs();
  };

  const streakAccent = streak >= 10 ? "hsl(45 95% 58%)" : streak >= 3 ? "hsl(18 90% 60%)" : "hsl(var(--hud-green))";
  const streakLabel = streak >= 10 ? "Iron Mic" : streak >= 3 ? "On a Roll" : streak > 0 ? "Building" : "No Streak";

  return (
    <div className="g3000 min-h-full bg-background p-4 sm:p-6 lg:p-8 space-y-6">
      <SEOHead
        title="Digital Logbook — SimPilot.AI"
        description="Track your flight time, landings, approaches, and ratings in your SimPilot.AI digital pilot logbook with ForeFlight-compatible CSV export."
        keywords="digital pilot logbook, flight time tracker, ForeFlight CSV export"
        canonical="/logbook"
        noIndex
      />
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl tracking-[0.2em] uppercase text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Digital Logbook
          </h1>
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">
            Flight History · Totals · Auto-Drafted from Radio Sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={(logs ?? []).filter((l) => l.status === "draft").length === 0}
            onClick={async () => {
              if (!user) return;
              const drafts = (logs ?? []).filter((l) => l.status === "draft");
              if (drafts.length === 0) return;
              if (!confirm(`Finalize ${drafts.length} draft ${drafts.length === 1 ? "entry" : "entries"}? This officially logs them.`)) return;
              const { error } = await supabase
                .from("flight_logs")
                .update({ status: "final" })
                .eq("user_id", user.id)
                .eq("status", "draft");
              if (error) { toast.error("Bulk finalize failed"); return; }
              toast.success(`Finalized ${drafts.length} ${drafts.length === 1 ? "entry" : "entries"}`);
              await fetchLogs();
              emitDashboardRefresh({ source: "other" });
            }}
            className="font-display text-[11px] tracking-[0.2em] uppercase"
          >
            <CheckCheck className="w-4 h-4 mr-1.5" /> Finalize Drafts
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const exportable = (logs ?? []).filter((l) => l.status === "final");
              if (exportable.length === 0) {
                toast.error("No final entries to export", { description: "Mark draft entries as Final first." });
                return;
              }
              const csv = buildForeFlightCsv(exportable);
              const today = new Date().toISOString().slice(0, 10);
              downloadCsv(`simpilot-logbook-${today}.csv`, csv);
              toast.success(`Exported ${exportable.length} ${exportable.length === 1 ? "entry" : "entries"}`, {
                description: "ForeFlight / IACRA-compatible CSV downloaded.",
              });
            }}
            className="font-display text-[11px] tracking-[0.2em] uppercase"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button
            onClick={() => setEditing(emptyDraft())}
            className="font-display text-[11px] tracking-[0.2em] uppercase"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Entry
          </Button>
        </div>
      </div>

      {/* Summary strip: Iron Mic + Streak + Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Streak panel */}
        <div
          className="g3000-bezel rounded-lg p-4 relative overflow-hidden"
          style={{
            borderColor: `${streakAccent}66`,
            background: `linear-gradient(135deg, ${streakAccent}22 0%, hsl(var(--background) / 0.6) 50%, ${streakAccent}10 100%)`,
            boxShadow: `inset 0 1px 0 ${streakAccent}40, 0 0 14px -4px ${streakAccent}88`,
          }}
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: `${streakAccent}aa` }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: `${streakAccent}aa` }} />
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3.5 h-3.5" style={{ color: streakAccent }} />
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              ATC PASS Streak
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-4xl font-bold tabular-nums leading-none"
              style={{ color: streakAccent, textShadow: `0 0 12px ${streakAccent}cc, 0 0 2px ${streakAccent}` }}
            >
              {streak}
            </span>
            <span className="font-display text-[10px] tracking-[0.25em] uppercase" style={{ color: streakAccent }}>
              {streakLabel}
            </span>
          </div>
        </div>

        {/* Iron Mic panel */}
        <div
          className="g3000-bezel rounded-lg p-4 relative overflow-hidden"
          style={
            hasIronMic
              ? {
                  borderColor: `hsl(45 95% 58% / 0.5)`,
                  background: `linear-gradient(135deg, hsl(45 95% 58% / 0.18) 0%, hsl(var(--background) / 0.6) 50%, hsl(45 95% 58% / 0.08) 100%)`,
                  boxShadow: `inset 0 1px 0 hsl(45 95% 58% / 0.4), 0 0 14px -4px hsl(45 95% 58% / 0.6)`,
                }
              : undefined
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <Radio className={`w-3.5 h-3.5 ${hasIronMic ? "" : "text-muted-foreground"}`} style={hasIronMic ? { color: "hsl(45 95% 58%)" } : undefined} />
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Iron Mic Badge
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-2xl font-bold uppercase tracking-wider leading-none"
              style={hasIronMic ? { color: "hsl(45 95% 58%)", textShadow: `0 0 10px hsl(45 95% 58% / 0.7)` } : { color: "hsl(var(--muted-foreground))" }}
            >
              {hasIronMic ? "Earned" : "Locked"}
            </span>
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              10 PASS Streak
            </span>
          </div>
        </div>

        {/* Total time */}
        <div className="g3000-bezel rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-3.5 h-3.5 text-primary" />
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Total Flight Time
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold tabular-nums leading-none text-primary"
              style={{ textShadow: `0 0 10px hsl(var(--primary) / 0.5)` }}>
              {totals.total.toFixed(1)}
            </span>
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Hours · {totals.entries} entries
            </span>
          </div>
        </div>
      </div>

      {/* Totals breakdown */}
      {/* Currency tracking — FAR 61.57 */}
      <div className="g3000-bezel rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            Currency · FAR 61.57
          </span>
          <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            VFR 30/90d · IFR 6mo
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: "Day Currency",
              sublabel: "3 takeoffs & landings · 90d",
              current: currency.dayCurrent,
              countMain: currency.day90,
              mainLabel: "90 Day",
              mainTarget: 3,
              countAlt: currency.day30,
              altLabel: "30 Day",
              shortBy: currency.dayShortBy,
              expiresIn: currency.dayExpiresIn,
            },
            {
              label: "Night Currency",
              sublabel: "3 full-stop ldg at night · 90d",
              current: currency.nightCurrent,
              countMain: currency.night90,
              mainLabel: "90 Day",
              mainTarget: 3,
              countAlt: currency.night30,
              altLabel: "30 Day",
              shortBy: currency.nightShortBy,
              expiresIn: currency.nightExpiresIn,
            },
            {
              label: "IFR Currency",
              sublabel: "6 approaches + hold · 6mo · 61.57(c)",
              current: currency.ifrCurrent,
              countMain: currency.approaches180,
              mainLabel: "6 Months",
              mainTarget: 6,
              countAlt: +currency.instrument180.toFixed(1),
              altLabel: "Instr Hrs",
              shortBy: currency.ifrShortBy,
              expiresIn: currency.ifrExpiresIn,
            },
          ].map((c) => {
            const accent = c.current ? "hsl(var(--hud-green))" : "hsl(var(--destructive))";
            return (
              <div
                key={c.label}
                className="rounded-md border px-4 py-3 relative overflow-hidden"
                style={{
                  borderColor: `${accent}55`,
                  background: `linear-gradient(135deg, ${accent}15 0%, hsl(var(--background) / 0.6) 60%, ${accent}08 100%)`,
                  boxShadow: `inset 0 1px 0 ${accent}30, 0 0 10px -4px ${accent}66`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <div className="font-display text-[11px] tracking-[0.2em] uppercase font-bold" style={{ color: accent }}>
                      {c.label}
                    </div>
                    <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
                      {c.sublabel}
                    </div>
                  </div>
                  <span
                    className="font-display text-[10px] tracking-[0.2em] uppercase font-bold px-2 py-0.5 rounded-sm border"
                    style={{
                      color: accent,
                      borderColor: `${accent}66`,
                      background: `${accent}15`,
                      textShadow: `0 0 6px ${accent}88`,
                    }}
                  >
                    {c.current ? "Current" : "Expired"}
                  </span>
                </div>
                <div className="flex items-end gap-4 mt-2">
                  <div>
                    <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">{c.mainLabel}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-bold tabular-nums" style={{ color: accent }}>
                        {c.countMain}
                      </span>
                      <span className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground">/ {c.mainTarget}</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">{c.altLabel}</div>
                    <span className="font-display text-2xl font-bold tabular-nums text-foreground">{c.countAlt}</span>
                  </div>
                  <div className="ml-auto text-right">
                    {c.current ? (
                      <>
                        <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">Expires In</div>
                        <span className="font-display text-base font-bold tabular-nums text-foreground">~{c.expiresIn}d</span>
                      </>
                    ) : (
                      <>
                        <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">Need</div>
                        <span className="font-display text-base font-bold tabular-nums" style={{ color: accent }}>
                          {c.shortBy} more
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="g3000-bezel rounded-lg p-4">
        <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
          Career Totals
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "PIC", value: totals.pic.toFixed(1) },
            { label: "Cross Country", value: totals.xc.toFixed(1) },
            { label: "Night", value: totals.night.toFixed(1) },
            { label: "Instrument", value: totals.instrument.toFixed(1) },
            { label: "Landings", value: totals.landings.toString() },
            { label: "Drafts", value: totals.drafts.toString() },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-border/60 px-3 py-2 bg-background/40">
              <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">{s.label}</div>
              <div className="font-display text-lg font-bold tabular-nums text-foreground mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Drafts awaiting review (auto-drafted from sim/ATC) */}
      <DraftsReviewPanel
        drafts={(logs ?? [])
          .filter((l) => l.status === "draft")
          .map((l) => ({
            id: l.id,
            flight_date: l.flight_date,
            aircraft_type: l.aircraft_type,
            tail_number: l.tail_number,
            departure: l.departure,
            destination: l.destination,
            total_time: num(l.total_time),
            remarks: l.remarks,
            source: l.source,
            created_at: l.created_at,
            pmdg_debrief: l.pmdg_debrief,
          }))}
        onEdit={(d) => setEditing(logs?.find((l) => l.id === d.id) ?? null)}
        onViewDebrief={(d) => { setDebriefData(d); setDebriefOpen(true); }}
        onFinalize={async (id) => {
          const { error } = await supabase
            .from("flight_logs")
            .update({ status: "final" })
            .eq("id", id);
          if (error) { toast.error("Couldn't finalize draft"); return; }
          toast.success("Draft finalized");
          await fetchLogs();
          emitDashboardRefresh({ source: "other" });
        }}
        onDiscard={async (id) => {
          if (!confirm("Discard this draft? This cannot be undone.")) return;
          const { error } = await supabase.from("flight_logs").delete().eq("id", id);
          if (error) { toast.error("Couldn't discard draft"); return; }
          toast.success("Draft discarded");
          await fetchLogs();
        }}
      />

      <PmdgDebriefModal
        open={debriefOpen}
        onOpenChange={setDebriefOpen}
        debrief={debriefData}
      />

      {/* Monthly hours chart */}
      <MonthlyHoursChart logs={(logs ?? []).map((l) => ({
        flight_date: l.flight_date,
        total_time: num(l.total_time),
        night_time: num(l.night_time),
        status: l.status,
        source: l.source,
      }))} />

      {/* Logs list */}
      <div className="g3000-bezel rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="font-display text-[11px] tracking-[0.25em] uppercase text-foreground">
            Flight History
          </span>
          <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
            {logs?.length ?? 0} {logs?.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {logs === null ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Plane className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
              No entries yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pass an ATC scenario to auto-create a draft, or add one manually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/40">
                <tr className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Aircraft</th>
                  <th className="text-left px-3 py-2">Route</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-right px-3 py-2">PIC</th>
                  <th className="text-right px-3 py-2">Ldg</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border/40 hover:bg-primary/5">
                    <td className="px-3 py-2 tabular-nums">{l.flight_date}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm font-display text-[9px] tracking-[0.2em] uppercase ${
                          l.status === "draft"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-[hsl(var(--hud-green)/0.1)] text-[hsl(var(--hud-green))] border border-[hsl(var(--hud-green)/0.3)]"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-foreground">{l.aircraft_type || "—"}</span>
                      {l.tail_number && <span className="text-muted-foreground ml-1">· {l.tail_number}</span>}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {l.departure || l.destination ? `${l.departure || "—"} → ${l.destination || "—"}` : (l.route || "—")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(l.total_time).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(l.pic_time).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(l.day_landings) + num(l.night_landings)}</td>
                    <td className="px-3 py-2">
                      {(() => {
                        // ATC sessions are NOT a real-world logbook source — they are a
                        // SimPilot training artifact. Show them as such and keep real-world
                        // sources (tracking devices, sims, manual) clearly distinct.
                        switch (l.source) {
                          case "tracking_device":
                            return (
                              <span className="inline-flex items-center gap-1 font-display text-[9px] tracking-[0.2em] uppercase text-primary">
                                <Tablet className="w-3 h-3" /> Tracking Device
                              </span>
                            );
                          case "msfs2024":
                          case "xplane12":
                          case "sim":
                            return (
                              <span className="inline-flex items-center gap-1 font-display text-[9px] tracking-[0.2em] uppercase text-accent">
                                <Plane className="w-3 h-3" /> Sim
                              </span>
                            );
                          case "atc_session":
                            return (
                              <span className="inline-flex items-center gap-1 font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                                <Radio className="w-3 h-3" /> SimPilot ATC (practice)
                              </span>
                            );
                          default:
                            return (
                              <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Manual</span>
                            );
                        }
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setEditing(l)}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-1"
                        aria-label="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] uppercase">
              {editing?.id ? "Edit Logbook Entry" : "New Logbook Entry"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={editing.flight_date ?? ""} onChange={(e) => setEditing({ ...editing, flight_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Aircraft</Label>
                <Input value={editing.aircraft_type ?? ""} onChange={(e) => setEditing({ ...editing, aircraft_type: e.target.value })} placeholder="C172" />
              </div>
              <div>
                <Label className="text-xs">Tail #</Label>
                <Input value={editing.tail_number ?? ""} onChange={(e) => setEditing({ ...editing, tail_number: e.target.value })} placeholder="N123AB" />
              </div>
              <div>
                <Label className="text-xs">Departure</Label>
                <Input value={editing.departure ?? ""} onChange={(e) => setEditing({ ...editing, departure: e.target.value })} placeholder="KPAO" />
              </div>
              <div>
                <Label className="text-xs">Destination</Label>
                <Input value={editing.destination ?? ""} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} placeholder="KSQL" />
              </div>
              <div>
                <Label className="text-xs">Route</Label>
                <Input value={editing.route ?? ""} onChange={(e) => setEditing({ ...editing, route: e.target.value })} placeholder="Direct" />
              </div>
              {[
                ["total_time", "Total"],
                ["pic_time", "PIC"],
                ["sic_time", "SIC"],
                ["cross_country_time", "X-Country"],
                ["night_time", "Night"],
                ["instrument_time", "Actual IMC"],
                ["simulated_instrument_time", "Sim IMC"],
              ].map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs">{label} (hr)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={String((editing as any)[k] ?? 0)}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                  />
                </div>
              ))}
              {[
                ["day_landings", "Day Ldg"],
                ["night_landings", "Night Ldg"],
                ["approaches", "Approaches"],
              ].map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={String((editing as any)[k] ?? 0)}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                  />
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3">
                <Label className="text-xs">Remarks</Label>
                <Textarea
                  rows={3}
                  value={editing.remarks ?? ""}
                  onChange={(e) => setEditing({ ...editing, remarks: e.target.value })}
                  placeholder="Maneuvers, ATC notes, lessons learned..."
                />
              </div>
              <div className="col-span-2 sm:col-span-3 flex items-center gap-2">
                <Label className="text-xs">Status:</Label>
                <select
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                  value={editing.status ?? "final"}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as "draft" | "final" })}
                >
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogbookPage;
