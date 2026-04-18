import { useState, useRef, useEffect, useCallback } from "react";
import { Radio, RotateCcw, Mic, MicOff, Volume2, AlertCircle, ClipboardCheck, Loader2, CheckCircle2, XCircle, Download, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PercentileSparkline } from "@/components/PercentileSparkline";
import { useExamPercentile } from "@/hooks/useExamPercentile";
import { generateATCDebriefPDF } from "@/lib/atcDebriefReport";
import { emitDashboardRefresh } from "@/lib/dashboardEvents";

interface ATCMessage {
  id: string;
  role: "atc" | "pilot" | "system";
  content: string;
}

type PhraseologyScore = {
  score: number;
  total: number;
  result: "PASS" | "FAIL";
  summary: string;
  weak_areas: { category: string; issue: string; example?: string }[];
  saved_id?: string;
};

const scenarios = [
  { id: "departure", label: "Departure Clearance", description: "IFR/VFR clearance delivery & ground", facility: "CLNC DEL", frequency: "121.65" },
  { id: "approach", label: "Approach & Landing", description: "Approach, tower, landing clearance", facility: "TWR", frequency: "118.30" },
  { id: "enroute", label: "En Route", description: "Center handoffs, altitude, position reports", facility: "CTR", frequency: "133.45" },
  { id: "emergency", label: "Emergency Procedures", description: "Mayday, Pan-Pan, vectors to nearest", facility: "GUARD", frequency: "121.50" },
  { id: "ground", label: "Ground Operations", description: "Taxi, hold short, runway crossings", facility: "GND", frequency: "121.90" },
  { id: "vfr-flight-following", label: "VFR Flight Following", description: "Approach control advisories", facility: "APP", frequency: "124.35" },
] as const;

const FAA_PROMPT = (scenarioLabel: string) => `You are a FAA-certified Air Traffic Controller running a live radio drill.

CALLSIGN: Pilot is "November One Two Three Alpha Bravo" (N123AB). Use full callsign on first contact, then "One Two Three Alpha Bravo" or "Three Alpha Bravo".

SCENARIO: ${scenarioLabel}

STRICT RADIO PHRASEOLOGY RULES (FAA AIM 4-2 / Pilot-Controller Glossary):
- Use ONLY standard FAA phraseology. No conversational filler.
- Numbers: pronounce digits individually ("one two three", not "one twenty-three"). Altitudes in thousands say "thousand" ("five thousand five hundred"). Flight levels: "flight level two one zero".
- Headings: three digits ("heading zero niner zero"). Use "niner" for 9.
- Frequencies: decimal as "point" ("one two one point niner").
- Use proper sequence: WHO you're calling, WHO you are, WHERE, WHAT.
- Use "roger", "wilco", "affirmative", "negative", "say again", "stand by", "unable", "cleared", "contact", "monitor", "squawk", "ident", "verify".
- No "okay", "yeah", "alright", "sure", "no problem".
- Keep transmissions short and crisp — one breath each.

OUTPUT FORMAT (CRITICAL):
- Respond ONLY with the spoken radio transmission. No labels, no markdown, no prose.
- ONE transmission per turn.
- After your transmission, on a NEW LINE, append a feedback block in this exact format if (and only if) the pilot's previous call had errors:
  [FEEDBACK] short, specific correction (e.g. "Read back runway and hold-short instruction.")
- If the pilot's call was correct, omit the [FEEDBACK] line entirely.
- Never break character. You are the controller, not a teacher.`;

// ---- Static / squelch sound design (WebAudio, no asset files) -----------
class RadioFX {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private hissNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** Shared analyser for VU meter — sums voice + hiss bed. */
  public analyser: AnalyserNode | null = null;
  private analyserMix: GainNode | null = null;
  private elementSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  getCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /** Lazy-init analyser bus. Everything taps into analyserMix → analyser → destination. */
  private getAnalyserBus() {
    const ctx = this.getCtx();
    if (!this.analyser || !this.analyserMix) {
      const mix = ctx.createGain();
      mix.gain.value = 1;
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.75;
      mix.connect(an).connect(ctx.destination);
      this.analyserMix = mix;
      this.analyser = an;
    }
    return this.analyserMix;
  }

  /** Route an <audio> element through the analyser bus. Idempotent per element. */
  attachMediaElement(el: HTMLMediaElement) {
    const ctx = this.getCtx();
    const bus = this.getAnalyserBus();
    if (this.elementSources.has(el)) return;
    try {
      const src = ctx.createMediaElementSource(el);
      src.connect(bus);
      this.elementSources.set(el, src);
    } catch {
      /* element already wired or cross-origin; ignore */
    }
  }

  private getNoise() {
    const ctx = this.getCtx();
    if (this.noiseBuffer) return this.noiseBuffer;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    this.noiseBuffer = buf;
    return buf;
  }

  /** Short squelch click (key-up or key-down). */
  squelch(kind: "up" | "down" = "up") {
    const ctx = this.getCtx();
    const bus = this.getAnalyserBus();
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise();
    const gain = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = kind === "up" ? 2200 : 1600;
    bp.Q.value = 0.8;
    src.connect(bp).connect(gain).connect(bus);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    src.start(now);
    src.stop(now + 0.12);
  }

  /** Start a low-level filtered hiss bed (loops until stopHiss). */
  startHiss() {
    if (this.hissNode) return;
    const ctx = this.getCtx();
    const bus = this.getAnalyserBus();
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise();
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3800;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(hp).connect(lp).connect(gain).connect(bus);
    src.start();
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.08);
    this.hissNode = { src, gain };
  }

  stopHiss() {
    if (!this.hissNode) return;
    const ctx = this.getCtx();
    const { src, gain } = this.hissNode;
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    setTimeout(() => {
      try { src.stop(); } catch { /* noop */ }
    }, 150);
    this.hissNode = null;
  }
}

// ---- Browser STT (PTT) ---------------------------------------------------
function getRecognizer(): any {
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

const ATCTrainer = () => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ATCMessage[]>([]);
  const [interim, setInterim] = useState("");
  const [pttActive, setPttActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<"male" | "female">("male");
  const [sttSupported, setSttSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [phraseologyScore, setPhraseologyScore] = useState<PhraseologyScore | null>(null);
  // Swappable COM1 active/standby frequencies (Garmin-style). Reset on scenario change.
  const [activeFreq, setActiveFreq] = useState("118.300");
  const [standbyFreq, setStandbyFreq] = useState("121.500");
  const [swapAnim, setSwapAnim] = useState(false);
  const swapFreqs = useCallback(() => {
    setActiveFreq((prevA) => {
      setStandbyFreq(prevA);
      return standbyFreq;
    });
    setSwapAnim(true);
    window.setTimeout(() => setSwapAnim(false), 350);
  }, [standbyFreq]);
  const { user } = useAuth();

  // Anonymized cohort percentile for the current scored attempt — included in the PDF.
  const { data: percentile } = useExamPercentile(
    phraseologyScore ? "atc_phraseology" : undefined,
    phraseologyScore?.score ?? 0,
    phraseologyScore?.total ?? 0,
  );

  const downloadDebrief = useCallback(() => {
    if (!phraseologyScore) return;
    const scenario = scenarios.find((s) => s.id === selectedScenario);
    generateATCDebriefPDF({
      scenarioLabel: scenario?.label ?? "ATC Scenario",
      callsign: "N123AB",
      voice: voice === "male" ? "Male" : "Female",
      score: phraseologyScore.score,
      total: phraseologyScore.total,
      result: phraseologyScore.result,
      summary: phraseologyScore.summary,
      weak_areas: phraseologyScore.weak_areas,
      transcript: messages.map((m) => ({ role: m.role, content: m.content })),
      percentile: percentile ?? null,
    });
    toast.success("Debrief PDF downloaded");
  }, [phraseologyScore, selectedScenario, voice, messages, percentile]);

  const recognizerRef = useRef<any>(null);
  const finalBufferRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<RadioFX | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fxRef.current = new RadioFX();
    setSttSupported(!!getRecognizer());
    return () => {
      try { recognizerRef.current?.stop?.(); } catch { /* noop */ }
      fxRef.current?.stopHiss();
      audioElRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interim]);

  // Reset COM1 active/standby when the scenario changes.
  useEffect(() => {
    if (!selectedScenario) return;
    const sc = scenarios.find((s) => s.id === selectedScenario);
    const fac = sc?.facility ?? "TWR";
    const freq = sc?.frequency ?? "118.300";
    const [intp, dec = ""] = String(freq).split(".");
    setActiveFreq(`${intp}.${(dec + "000").slice(0, 3)}`);
    setStandbyFreq(fac === "GND" ? "118.300" : "121.500");
  }, [selectedScenario]);

  const startScenario = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setMessages([]);
    setError(null);
    setPhraseologyScore(null);
    setLoading(true);

    const scenario = scenarios.find((s) => s.id === scenarioId)!;
    try {
      const { data, error } = await supabase.functions.invoke("pilot-chat", {
        body: {
          messages: [
            { role: "system", content: FAA_PROMPT(scenario.label) },
            { role: "user", content: `Begin scenario. Make your initial transmission to N123AB.` },
          ],
        },
      });
      if (error) throw error;
      const reply = data?.choices?.[0]?.message?.content || data?.reply || "";
      const intro: ATCMessage = { id: crypto.randomUUID(), role: "system", content: `📡 ${scenario.label} — N123AB` };
      const atcMsg: ATCMessage = { id: crypto.randomUUID(), role: "atc", content: reply };
      setMessages([intro, atcMsg]);
      void speakATC(reply);
    } catch (e) {
      setError("Failed to start scenario.");
    } finally {
      setLoading(false);
    }
  };

  const speakATC = async (text: string) => {
    // Strip [FEEDBACK] line from spoken audio (only spoken radio call).
    const spoken = text.split(/\n?\[FEEDBACK\]/i)[0].trim();
    if (!spoken) return;

    try {
      setSpeaking(true);
      fxRef.current?.squelch("up");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atc-tts`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: spoken, voice }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioElRef.current?.pause();
      audioElRef.current = audio;
      fxRef.current?.attachMediaElement(audio);
      // small delay so the squelch click is audible before voice
      await new Promise((r) => setTimeout(r, 90));
      fxRef.current?.startHiss();
      await audio.play();
      audio.onended = () => {
        fxRef.current?.stopHiss();
        fxRef.current?.squelch("down");
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
      };
      audio.onerror = () => {
        fxRef.current?.stopHiss();
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
      };
    } catch (e) {
      console.error("ATC speak failed", e);
      fxRef.current?.stopHiss();
      setSpeaking(false);
    }
  };

  const sendPilotTransmission = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !selectedScenario) return;
    const scenario = scenarios.find((s) => s.id === selectedScenario)!;
    const userMsg: ATCMessage = { id: crypto.randomUUID(), role: "pilot", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    setError(null);

    const history = updated
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "atc" ? "assistant" : "user",
        content: m.content,
      }));

    try {
      const { data, error } = await supabase.functions.invoke("pilot-chat", {
        body: {
          messages: [{ role: "system", content: FAA_PROMPT(scenario.label) }, ...history],
        },
      });
      if (error) throw error;
      const reply = data?.choices?.[0]?.message?.content || data?.reply || "";
      const atcMsg: ATCMessage = { id: crypto.randomUUID(), role: "atc", content: reply };
      setMessages((prev) => [...prev, atcMsg]);
      void speakATC(reply);
    } catch {
      setError("Connection lost. Try again.");
    } finally {
      setLoading(false);
    }
  }, [messages, selectedScenario, voice]);

  // ---- Scoring & save to Logbook -----------------------------------------
  const scoreAndSaveScenario = useCallback(async () => {
    if (!selectedScenario || scoring) return;
    const pilotTurns = messages.filter((m) => m.role === "pilot");
    if (pilotTurns.length === 0) {
      toast.error("Make at least one transmission before scoring.");
      return;
    }
    if (!user) {
      toast.error("Sign in to save your phraseology score to your Logbook.");
      return;
    }

    const scenario = scenarios.find((s) => s.id === selectedScenario)!;
    setScoring(true);
    setError(null);

    // Build transcript for the grader
    const transcript = messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "atc" ? "ATC" : "PILOT"}: ${m.content.split(/\n?\[FEEDBACK\]/i)[0].trim()}`)
      .join("\n");

    const SCORE_PROMPT = `You are a FAA Designated Pilot Examiner grading a pilot's RADIO PHRASEOLOGY only (not airmanship).
Scenario: ${scenario.label}. Callsign: N123AB.

Grade STRICTLY against FAA AIM 4-2 / Pilot-Controller Glossary. Evaluate ONLY the lines starting with "PILOT:".
Score every distinct pilot transmission as 1 point. A transmission is correct (1 point) only if ALL of these hold:
  • Proper sequence (who you're calling, who you are, where, what)
  • Correct number/altitude/heading/frequency phraseology (digits individually, "niner", "thousand", "point")
  • Correct use of standard words (roger, wilco, affirmative, negative, cleared, etc.) — no "okay/yeah/alright"
  • Required readbacks present (runway assignment, hold short, altitudes, headings, frequencies, clearances)
  • Callsign used correctly

Otherwise it is 0 points. Half-credit is NOT allowed.

Output ONLY a single JSON object, no markdown, no prose, matching this schema:
{
  "score": <int, total correct transmissions>,
  "total": <int, total pilot transmissions evaluated>,
  "result": "PASS" | "FAIL",   // PASS if score/total >= 0.7
  "summary": "<one-sentence overall verdict>",
  "weak_areas": [
    { "category": "<short label e.g. Readback / Numbers / Sequence / Callsign / Standard Words>",
      "issue": "<specific problem in plain English>",
      "example": "<exact pilot phrase that was wrong, optional>" }
  ]
}

TRANSCRIPT:
${transcript}`;

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("pilot-chat", {
        body: { messages: [{ role: "system", content: SCORE_PROMPT }, { role: "user", content: "Grade now. Return only JSON." }] },
      });
      if (invokeErr) throw invokeErr;
      const raw: string = data?.choices?.[0]?.message?.content || data?.reply || "";
      // Pull first {...} block
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in grader reply");
      const parsed = JSON.parse(match[0]);

      const score = Math.max(0, parseInt(String(parsed.score), 10) || 0);
      const total = Math.max(1, parseInt(String(parsed.total), 10) || pilotTurns.length);
      const result: "PASS" | "FAIL" = (parsed.result === "PASS" || score / total >= 0.7) ? "PASS" : "FAIL";
      const weak_areas = Array.isArray(parsed.weak_areas) ? parsed.weak_areas.slice(0, 8) : [];
      const summary = typeof parsed.summary === "string" ? parsed.summary : "";

      // Persist to exam_scores so the Logbook picks it up.
      const acsCodes = ["PA.I.K"]; // ATC Communications
      const { data: inserted, error: dbErr } = await supabase
        .from("exam_scores")
        .insert({
          user_id: user.id,
          exam_type: "atc_phraseology",
          score,
          total_questions: total,
          result,
          stress_mode: false,
          acs_codes: acsCodes,
          report: {
            scenario_id: selectedScenario,
            scenario_label: scenario.label,
            voice,
            summary,
            weak_areas,
          } as any,
        } as any)
        .select("id")
        .single();

      if (dbErr) throw dbErr;

      const final: PhraseologyScore = { score, total, result, summary, weak_areas, saved_id: inserted?.id };
      setPhraseologyScore(final);
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      toast.success(`Phraseology ${result} · ${score}/${total} · saved to Logbook`);
      // 90+ achievement — subtle but celebratory
      if (pct >= 90) {
        setTimeout(() => {
          toast.success("🏆 Achievement Unlocked", {
            description: "Radio Proficiency: Top Tier",
            duration: 6000,
          });
        }, 600);
      }
      // Notify Flight Deck / Recent Activity to refresh instantly
      emitDashboardRefresh({ source: "atc" });
    } catch (e) {
      console.error("Phraseology scoring failed", e);
      toast.error("Couldn't score this scenario. Try again.");
      setError("Phraseology grading failed. Please try again.");
    } finally {
      setScoring(false);
    }
  }, [messages, selectedScenario, scoring, user, voice]);

  const startPTT = () => {
    if (speaking || loading) return;
    if (!sttSupported) {
      setError("Speech recognition unavailable in this browser. Use Chrome or Edge.");
      return;
    }
    audioElRef.current?.pause();
    fxRef.current?.stopHiss();
    fxRef.current?.squelch("down"); // mic key-down click

    finalBufferRef.current = "";
    setInterim("");
    setPttActive(true);

    const r = getRecognizer();
    recognizerRef.current = r;
    r.onresult = (ev: any) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalBufferRef.current += res[0].transcript + " ";
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
    };
    r.onerror = (ev: any) => {
      if (ev.error === "not-allowed") setError("Microphone permission denied.");
      else if (ev.error !== "no-speech" && ev.error !== "aborted") setError(`Mic error: ${ev.error}`);
    };
    r.onend = () => {
      setPttActive(false);
      setInterim("");
      fxRef.current?.squelch("up"); // mic key-up click
      const transcript = finalBufferRef.current.trim();
      finalBufferRef.current = "";
      if (transcript) void sendPilotTransmission(transcript);
    };
    try { r.start(); } catch { /* already started */ }
  };

  const endPTT = () => {
    if (!pttActive) return;
    try { recognizerRef.current?.stop(); } catch { /* noop */ }
  };

  // ---- Render ------------------------------------------------------------
  if (!selectedScenario) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Radio className="h-10 w-10 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-foreground">ATC Radio</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Live duplex radio drill. Push to talk, release to transmit. Strict FAA phraseology.
          </p>
        </div>

        {/* Voice picker */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="font-display tracking-[0.2em] uppercase text-muted-foreground">Controller voice</span>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {(["male", "female"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVoice(v)}
                className={cn(
                  "px-3 py-1 text-xs uppercase tracking-wider font-display transition-colors",
                  voice === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => startScenario(s.id)}
              className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left space-y-1"
            >
              <div className="font-semibold text-sm text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </button>
          ))}
        </div>

        {!sttSupported && (
          <div className="flex items-center gap-2 justify-center text-xs text-accent">
            <AlertCircle className="h-3.5 w-3.5" />
            Speech recognition not supported in this browser. Use Chrome or Edge for PTT.
          </div>
        )}
      </div>
    );
  }

  const activeScenario = scenarios.find((s) => s.id === selectedScenario);
  const scenarioLabel = activeScenario?.label;
  const facility = activeScenario?.facility ?? "TWR";
  const frequency = activeScenario?.frequency ?? "118.300";
  // Normalize to a 6-char "118.700" style display.
  const normalizeFreq = (f: string) => {
    const [intp, dec = ""] = String(f).split(".");
    return `${intp}.${(dec + "000").slice(0, 3)}`;
  };
  const freqDisplay = normalizeFreq(frequency);

  return (
    <div className="space-y-4">
      {/* Garmin G3000-style COM1 radio strip */}
      <G3000ComRadio
        facility={facility}
        active={activeFreq}
        standby={standbyFreq}
        speaking={speaking}
        ptt={pttActive}
        onSwap={swapFreqs}
        swapping={swapAnim}
      />

    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Transcript */}
      <div className="flex flex-col h-[560px] border border-border rounded-lg bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                speaking ? "animate-ping bg-accent" : pttActive ? "animate-ping bg-[hsl(var(--hud-green))]" : "bg-muted-foreground/30",
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                speaking ? "bg-accent" : pttActive ? "bg-[hsl(var(--hud-green))]" : "bg-muted-foreground/40",
              )} />
            </span>
            <Radio className="h-4 w-4 text-primary" />
            <span className="font-display text-xs tracking-[0.2em] uppercase">{scenarioLabel}</span>
            <span className="text-xs text-muted-foreground">• N123AB</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={scoreAndSaveScenario}
              disabled={scoring || loading || speaking || messages.filter(m => m.role === "pilot").length === 0}
              title={user ? "Grade this session and save to your Logbook" : "Sign in to save"}
            >
              {scoring ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <ClipboardCheck className="h-3 w-3 mr-1" />
              )}
              {scoring ? "Grading…" : "End & Score"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedScenario(null); setMessages([]); setPhraseologyScore(null); }}>
              <RotateCcw className="h-3 w-3 mr-1" /> New Scenario
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[13px] leading-relaxed">
          {messages.map((msg) => {
            if (msg.role === "system") {
              return (
                <div key={msg.id} className="text-center text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                  {msg.content}
                </div>
              );
            }
            const [spoken, ...feedbackParts] = msg.content.split(/\n?\[FEEDBACK\]/i);
            const feedback = feedbackParts.join(" ").trim();
            return (
              <div key={msg.id} className={cn("flex", msg.role === "pilot" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[88%] rounded-md px-3 py-2",
                  msg.role === "pilot"
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "bg-muted/40 border border-border text-foreground",
                )}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {msg.role === "atc" ? (
                      <Volume2 className="h-3 w-3 text-accent" />
                    ) : (
                      <Mic className="h-3 w-3 text-primary" />
                    )}
                    <span className={cn(
                      "text-[10px] font-display tracking-[0.25em] uppercase",
                      msg.role === "atc" ? "text-accent" : "text-primary",
                    )}>
                      {msg.role === "atc" ? "ATC" : "N123AB"}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{spoken.trim()}</div>
                  {feedback && (
                    <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-accent/90 not-italic">
                      <span className="font-display tracking-[0.2em] uppercase text-[9px] mr-1">Coach</span>
                      {feedback}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {pttActive && interim && (
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-md px-3 py-2 bg-primary/5 border border-dashed border-primary/40 text-muted-foreground italic">
                {interim}…
              </div>
            </div>
          )}
          {loading && (
            <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground animate-pulse">
              ATC transmitting…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-3 py-1.5 text-xs text-destructive border-t border-destructive/30 bg-destructive/5">
            {error}
          </div>
        )}

        {phraseologyScore && (
          <div className="border-t border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {phraseologyScore.result === "PASS" ? (
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--hud-green))]" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    Phraseology Score
                  </div>
                  <div className={cn(
                    "font-display text-base font-bold tracking-wider",
                    phraseologyScore.result === "PASS" ? "text-[hsl(var(--hud-green))]" : "text-destructive",
                  )}>
                    {phraseologyScore.score}/{phraseologyScore.total} · {phraseologyScore.result}
                    <span className="ml-2 text-foreground/80 text-sm font-normal">
                      ({Math.round((phraseologyScore.score / phraseologyScore.total) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadDebrief}
                  className="h-7 text-[10px] tracking-[0.15em] uppercase font-display"
                >
                  <Download className="h-3 w-3 mr-1" /> Debrief PDF
                </Button>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Saved · Logbook
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PercentileSparkline
                examType="atc_phraseology"
                score={phraseologyScore.score}
                total={phraseologyScore.total}
                minSample={5}
                showTopTier
              />
            </div>
            {phraseologyScore.summary && (
              <p className="text-xs text-muted-foreground italic">"{phraseologyScore.summary}"</p>
            )}
            {phraseologyScore.weak_areas.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  Areas to Review
                </div>
                <ul className="space-y-1">
                  {phraseologyScore.weak_areas.map((w, i) => (
                    <li key={i} className="text-xs text-foreground/90">
                      <span className="font-semibold text-accent">{w.category}:</span>{" "}
                      <span>{w.issue}</span>
                      {w.example && (
                        <span className="block text-[11px] text-muted-foreground font-mono mt-0.5">
                          → "{w.example}"
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PTT panel */}
      <div className="border border-border rounded-lg bg-card p-4 flex flex-col items-center justify-between gap-4">
        <div className="text-center">
          <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            Push To Talk
          </div>
          <div className="text-xs text-muted-foreground">
            Hold the button (or hold <kbd className="px-1 py-0.5 rounded bg-muted text-foreground text-[10px]">Space</kbd>) and speak. Release to transmit.
          </div>
        </div>

        <div className="relative h-48 w-48 flex items-center justify-center">
          {/* Cockpit-style segmented ring around the PTT — reacts to AI voice */}
          <PTTRing
            getAnalyser={() => fxRef.current?.analyser ?? null}
            speaking={speaking}
            pttActive={pttActive}
          />
          <button
            onMouseDown={startPTT}
            onMouseUp={endPTT}
            onMouseLeave={endPTT}
            onTouchStart={(e) => { e.preventDefault(); startPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); endPTT(); }}
            disabled={speaking || loading}
            className={cn(
              "relative h-40 w-40 rounded-full border-4 transition-all select-none z-10",
              "flex flex-col items-center justify-center gap-1",
              pttActive
                ? "bg-[hsl(var(--hud-green))]/20 border-[hsl(var(--hud-green))] shadow-[0_0_30px_hsl(var(--hud-green)/0.6)]"
                : speaking
                ? "bg-accent/10 border-accent/60 cursor-not-allowed"
                : "bg-primary/5 border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95",
              (speaking || loading) && "opacity-60",
            )}
          >
            {pttActive ? (
              <Mic className="h-10 w-10 text-[hsl(var(--hud-green))]" />
            ) : speaking ? (
              <Volume2 className="h-10 w-10 text-accent animate-pulse" />
            ) : (
              <MicOff className="h-10 w-10 text-primary" />
            )}
            <span className="font-display text-[10px] tracking-[0.25em] uppercase mt-1">
              {pttActive ? "Live" : speaking ? "ATC" : "PTT"}
            </span>
          </button>
        </div>

        {/* VU meter — pulses with AI voice + hiss bed */}
        <VUMeter getAnalyser={() => fxRef.current?.analyser ?? null} active={speaking} />

        <div className="text-center text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Voice: <span className="text-foreground">{voice}</span>
        </div>

        {!sttSupported && (
          <div className="flex items-start gap-2 text-[11px] text-accent">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Speech recognition unavailable. Use Chrome or Edge for PTT.</span>
          </div>
        )}
      </div>

      {/* Spacebar hold for PTT */}
      <SpaceHoldPTT onDown={startPTT} onUp={endPTT} disabled={speaking || loading} />
    </div>
    </div>
  );
};

// Hidden component: hold spacebar = PTT.
const SpaceHoldPTT = ({ onDown, onUp, disabled }: { onDown: () => void; onUp: () => void; disabled: boolean }) => {
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || disabled || isTyping(e.target)) return;
      e.preventDefault();
      onDown();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      onUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onDown, onUp, disabled]);
  return null;
};

// VU meter: 16 vertical bars driven by an AnalyserNode (frequency-domain).
const VUMeter = ({
  getAnalyser,
  active,
}: {
  getAnalyser: () => AnalyserNode | null;
  active: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const BARS = 16;
    const PEAK_DECAY = 0.015;
    if (peaksRef.current.length !== BARS) peaksRef.current = new Array(BARS).fill(0);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, cssW, cssH);

      const analyser = getAnalyser();
      const bins = new Uint8Array(analyser?.frequencyBinCount ?? BARS);
      if (analyser) analyser.getByteFrequencyData(bins);

      // Map FFT bins → BARS by averaging slices (skip very low rumble bins).
      const start = 2;
      const usable = bins.length - start;
      const slice = Math.max(1, Math.floor(usable / BARS));
      const gap = 3;
      const barW = (cssW - gap * (BARS - 1)) / BARS;
      const styles = getComputedStyle(canvas);
      const accent = styles.getPropertyValue("--accent").trim() || "180 70% 50%";
      const muted = styles.getPropertyValue("--muted-foreground").trim() || "0 0% 50%";

      for (let i = 0; i < BARS; i++) {
        let sum = 0;
        const from = start + i * slice;
        const to = Math.min(bins.length, from + slice);
        for (let j = from; j < to; j++) sum += bins[j];
        const avg = (to - from) > 0 ? sum / (to - from) / 255 : 0;
        const level = active ? avg : 0;
        // peak hold
        const prev = peaksRef.current[i] ?? 0;
        const next = level > prev ? level : Math.max(0, prev - PEAK_DECAY);
        peaksRef.current[i] = next;

        const h = Math.max(2, next * cssH);
        const x = i * (barW + gap);
        const y = cssH - h;
        ctx2d.fillStyle = active ? `hsl(${accent})` : `hsl(${muted} / 0.35)`;
        ctx2d.fillRect(x, y, barW, h);
        // peak cap
        const capY = cssH - Math.max(h, 2) - 1;
        ctx2d.fillStyle = active ? `hsl(${accent} / 0.9)` : `hsl(${muted} / 0.5)`;
        ctx2d.fillRect(x, capY, barW, 1);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getAnalyser, active]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">VU</span>
        <span className={cn(
          "font-display text-[9px] tracking-[0.25em] uppercase",
          active ? "text-accent" : "text-muted-foreground/60",
        )}>
          {active ? "● RX" : "○ IDLE"}
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-10 rounded-sm bg-background/60 border border-border/60" />
    </div>
  );
};

// Circular segmented waveform ring around the PTT button.
// Lights segment-by-segment based on AI voice analyser amplitude.
const PTTRing = ({
  getAnalyser,
  speaking,
  pttActive,
}: {
  getAnalyser: () => AnalyserNode | null;
  speaking: boolean;
  pttActive: boolean;
}) => {
  const SEGMENTS = 48;
  const [levels, setLevels] = useState<number[]>(() => new Array(SEGMENTS).fill(0));
  const rafRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>(new Array(SEGMENTS).fill(0));

  useEffect(() => {
    const PEAK_DECAY = 0.025;
    const tick = () => {
      const analyser = getAnalyser();
      const next = new Array(SEGMENTS).fill(0);
      if (analyser && speaking) {
        const bins = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bins);
        const start = 2;
        const usable = bins.length - start;
        // Use half the segments (mirror around the ring for symmetry)
        const HALF = SEGMENTS / 2;
        const slice = Math.max(1, Math.floor(usable / HALF));
        for (let i = 0; i < HALF; i++) {
          let sum = 0;
          const from = start + i * slice;
          const to = Math.min(bins.length, from + slice);
          for (let j = from; j < to; j++) sum += bins[j];
          const avg = (to - from) > 0 ? sum / (to - from) / 255 : 0;
          // Mirror: top arc both sides
          next[i] = avg;
          next[SEGMENTS - 1 - i] = avg;
        }
      }
      // Peak hold / decay for smoother ring
      for (let i = 0; i < SEGMENTS; i++) {
        const prev = peaksRef.current[i] ?? 0;
        peaksRef.current[i] = next[i] > prev ? next[i] : Math.max(0, prev - PEAK_DECAY);
      }
      setLevels([...peaksRef.current]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getAnalyser, speaking]);

  // SVG geometry
  const SIZE = 192; // matches container h-48 w-48
  const CENTER = SIZE / 2;
  const RADIUS = 88;
  const SEG_LEN = 10; // length of each radial tick
  const SEG_W = 2.5;
  const GAP_DEG = 360 / SEGMENTS;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    >
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const angle = (i * GAP_DEG - 90) * (Math.PI / 180);
        const x1 = CENTER + Math.cos(angle) * RADIUS;
        const y1 = CENTER + Math.sin(angle) * RADIUS;
        const x2 = CENTER + Math.cos(angle) * (RADIUS + SEG_LEN);
        const y2 = CENTER + Math.sin(angle) * (RADIUS + SEG_LEN);
        const lvl = levels[i] ?? 0;
        // Choose color based on state
        const colorVar = speaking
          ? "var(--accent)"
          : pttActive
          ? "var(--hud-green)"
          : "var(--primary)";
        // Idle: faint baseline. Active: scale opacity by amplitude.
        const idleOpacity = pttActive ? 0.35 : 0.15;
        const opacity = speaking ? Math.min(1, 0.2 + lvl * 1.3) : idleOpacity;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={`hsl(${colorVar})`}
            strokeOpacity={opacity}
            strokeWidth={SEG_W}
            strokeLinecap="round"
            style={{
              filter: speaking && lvl > 0.45 ? `drop-shadow(0 0 4px hsl(${colorVar}))` : undefined,
              transition: speaking ? "none" : "stroke-opacity 200ms ease-out",
            }}
          />
        );
      })}
    </svg>
  );
};

/**
 * Garmin G3000-style COM1 radio strip. Active frequency on the left in
 * cyan, standby on the right in white, with a small TX/RX status lamp.
 */
const G3000ComRadio = ({
  facility,
  active,
  standby,
  speaking,
  ptt,
  onSwap,
  swapping,
}: {
  facility: string;
  active: string;
  standby: string;
  speaking: boolean;
  ptt: boolean;
  onSwap?: () => void;
  swapping?: boolean;
}) => {
  const status = ptt ? "TX" : speaking ? "RX" : "STBY";
  const statusColor = ptt
    ? "hsl(var(--hud-green))"
    : speaking
    ? "hsl(var(--amber-instrument))"
    : "hsl(var(--muted-foreground))";

  return (
    <div
      className="rounded-lg border border-border bg-black/85 px-4 py-3 shadow-[inset_0_0_24px_rgba(0,0,0,0.7),0_0_0_1px_hsl(var(--primary)/0.15)] relative overflow-hidden"
      role="group"
      aria-label={`COM1 radio tuned to ${facility} ${active}`}
    >
      {/* corner ticks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

      <div className="flex items-center justify-between gap-4">
        {/* Active (TX) frequency */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: statusColor,
                boxShadow: ptt || speaking ? `0 0 8px ${statusColor}` : "none",
                animation: ptt || speaking ? "pulse 1.5s ease-in-out infinite" : undefined,
              }}
            />
            <span className="font-display text-[9px] tracking-[0.3em] uppercase text-primary/80">
              COM1 · ACTIVE
            </span>
            <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              · {facility}
            </span>
          </div>
          <div
            className="font-mono font-bold tabular-nums leading-none text-[hsl(var(--cyan-glow))] text-3xl sm:text-4xl tracking-wider"
            style={{ textShadow: "0 0 12px hsl(var(--cyan-glow) / 0.55)" }}
          >
            {active}
          </div>
        </div>

        {/* Status lamp */}
        <div className="flex flex-col items-center px-2 sm:px-4 border-x border-border/60 self-stretch justify-center">
          <span className="font-display text-[8px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
            Status
          </span>
          <span
            className="font-display text-xs tracking-[0.25em] uppercase font-bold"
            style={{
              color: statusColor,
              textShadow: ptt || speaking ? `0 0 8px ${statusColor}` : "none",
            }}
          >
            {status}
          </span>
        </div>

        {/* Swap button */}
        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            aria-label="Swap COM1 active and standby frequencies"
            title="Swap active ⇄ standby"
            className="group flex flex-col items-center justify-center px-2 py-1 rounded border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            <ArrowLeftRight
              className={cn(
                "h-4 w-4 text-primary transition-transform",
                swapping && "rotate-180",
              )}
            />
            <span className="font-display text-[8px] tracking-[0.25em] uppercase text-primary/70 mt-0.5">
              Swap
            </span>
          </button>
        )}

        {/* Standby */}
        <div className="text-right">
          <div className="font-display text-[9px] tracking-[0.3em] uppercase text-muted-foreground/80 mb-0.5">
            Standby
          </div>
          <div
            className={cn(
              "font-mono font-bold tabular-nums leading-none text-foreground/90 text-xl sm:text-2xl tracking-wider transition-opacity",
              swapping && "opacity-40",
            )}
            style={{ textShadow: "0 0 6px rgba(255,255,255,0.15)" }}
          >
            {standby}
          </div>
        </div>
      </div>

      {/* subtle scanline */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </div>
  );
};

export default ATCTrainer;
