import { useState, useRef, useEffect, useCallback } from "react";
import { Radio, RotateCcw, Mic, MicOff, Volume2, AlertCircle, ClipboardCheck, Loader2, CheckCircle2, XCircle, Download, ArrowLeftRight, Flame, X, Lock, History, Plane, Search, Square } from "lucide-react";
import {
  atcFrequencies,
  getAirportFrequencies,
  lookupFacility,
  formatFreq,
  parseFreqInput,
  type AirportFrequencies,
  type AtcFacility,
  type FacilityKind,
} from "@/data/atcFrequencies";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PercentileSparkline } from "@/components/PercentileSparkline";
import { useExamPercentile } from "@/hooks/useExamPercentile";
import { generateATCDebriefPDF } from "@/lib/atcDebriefReport";
import { emitDashboardRefresh } from "@/lib/dashboardEvents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

/**
 * Dynamic prompt for the "live frequency" mode — the controller persona is
 * derived from whichever facility the pilot has tuned. The AI must:
 *  - Respond ONLY if it really is the controller for that frequency.
 *  - If the pilot calls the wrong facility (e.g. addresses "Tower" while tuned
 *    to Ground), correct them by name and tell them which freq to contact.
 *  - If the frequency has no facility (dead air), respond with empty or static.
 */
const LIVE_FREQ_PROMPT = (opts: {
  airportIcao: string;
  airportCallName: string;
  facilityKind: FacilityKind | "NONE";
  facilityName: string;
  frequency: string;
  knownFacilities: { kind: FacilityKind; name: string; freq: string }[];
}) => {
  const facilityList = opts.knownFacilities
    .map((f) => `  • ${f.name} (${f.kind}) — ${f.freq}`)
    .join("\n");

  if (opts.facilityKind === "NONE") {
    return `You are a FAA-certified Air Traffic Controller training simulator.
The pilot has tuned ${opts.frequency} at ${opts.airportIcao} but NO facility operates on this frequency.
Respond with a single short line acknowledging dead air, e.g. "[no response — frequency is unmonitored]".
Do NOT impersonate a controller. Do NOT add [FEEDBACK].`;
  }

  return `You are ${opts.facilityName} at ${opts.airportIcao} (${opts.airportCallName}) on ${opts.frequency} MHz.
Facility role: ${opts.facilityKind}. The pilot is "November One Two Three Alpha Bravo" (N123AB), a Cessna 172.

OTHER FACILITIES AT ${opts.airportIcao} (for redirection only):
${facilityList || "  • (none on file)"}

CRITICAL ROLE RULES:
1. You are ONLY ${opts.facilityName}. Never speak as any other facility.
2. If the pilot addresses you correctly (e.g. uses "${opts.facilityName}" or its short form), respond as that controller using standard FAA phraseology for the ${opts.facilityKind} role:
   - GROUND: taxi instructions, taxi clearances, runway crossings, hold-short.
   - TOWER: takeoff/landing clearances, traffic, pattern entries, runway assignments.
   - CLEARANCE: IFR/VFR clearances, departure routes, transponder codes.
   - APPROACH/DEPARTURE: vectors, altitudes, traffic advisories, handoffs.
   - ATIS: read-only weather/runway info — no two-way conversation; if pilot transmits, do NOT respond.
   - CTAF/UNICOM: respond as nearby traffic, not as a controller.
   - GUARD: 121.5 — only respond to emergency calls.
3. If the pilot addresses the WRONG facility (e.g. calls "${opts.airportCallName} Tower" while you are ${opts.facilityName}), DO NOT play along.
   Instead, respond with a brief correction in standard phraseology, e.g.:
   "${opts.airportCallName.toUpperCase()} ${opts.facilityKind}, three alpha bravo — you've reached ${opts.facilityName} on ${opts.frequency}. For tower contact one one nine point two."
   Pick the right frequency to redirect to from the list above.
4. If the pilot addresses a different airport entirely, say something like:
   "Three alpha bravo, ${opts.facilityName} — verify station called, you are on ${opts.frequency} at ${opts.airportIcao}."

STRICT PHRASEOLOGY (FAA AIM 4-2 / Pilot-Controller Glossary):
- Numbers: pronounce digits individually ("one two three", not "one twenty-three"). "Niner" for 9. Altitudes use "thousand"/"hundred". Frequencies: decimal as "point".
- Sequence: WHO you're calling, WHO you are, WHERE, WHAT.
- Use roger, wilco, affirmative, negative, say again, stand by, unable, cleared, contact, monitor, squawk, ident, verify. No "okay/yeah/alright".
- Keep transmissions short — one breath each.

OUTPUT FORMAT (CRITICAL):
- Respond ONLY with the spoken radio transmission. No labels, no markdown, no prose around it.
- ONE transmission per turn.
- After your transmission, on a NEW LINE, append a feedback block ONLY if the pilot's previous call had a phraseology error:
  [FEEDBACK] short specific correction.
- If the pilot's call was correct, omit the [FEEDBACK] line entirely.
- Never break character.`;
};

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
  const [pttHeld, setPttHeld] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<"male" | "female">(() => {
    try {
      const saved = localStorage.getItem("atc_voice");
      return saved === "female" || saved === "male" ? saved : "male";
    } catch { return "male"; }
  });
  // Last-used scenario id (for "Resume last scenario" UX). Read once at mount.
  const initialLastScenarioId = (() => {
    try {
      const saved = localStorage.getItem("atc_last_scenario");
      return saved && scenarios.some((s) => s.id === saved) ? saved : null;
    } catch { return null; }
  })();
  const [lastScenarioId, setLastScenarioId] = useState<string | null>(initialLastScenarioId);
  const [sttSupported, setSttSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [gradingProgress, setGradingProgress] = useState<{
    phase: "connecting" | "streaming" | "retrying" | "parsing";
    attempt: number;
    chars: number;
  } | null>(null);
  // Whether the in-flight grader request can still be cancelled. Set true while
  // the SSE fetch/stream is active, cleared the moment the stream ends, errors,
  // or post-processing begins so the Stop button / Cancel link disappear and
  // can no longer fire after the grading is effectively done.
  const [canCancelGrading, setCanCancelGrading] = useState(false);
  const gradingAbortRef = useRef<AbortController | null>(null);
  const gradingCancelledRef = useRef(false);
  const [phraseologyScore, setPhraseologyScore] = useState<PhraseologyScore | null>(null);
  // Mic-test state: idle | recording | playing
  const [micTestState, setMicTestState] = useState<"idle" | "recording" | "playing">("idle");
  const micTestRecorderRef = useRef<MediaRecorder | null>(null);
  const micTestStreamRef = useRef<MediaStream | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const micTestAnalyserRef = useRef<AnalyserNode | null>(null);
  const micTestCtxRef = useRef<AudioContext | null>(null);
  const micTestRafRef = useRef<number | null>(null);
  const [micTestLevel, setMicTestLevel] = useState(0); // 0..1 RMS
  // Input device selection (for users with multiple mics)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    try { return localStorage.getItem("atc_mic_device_id") || ""; } catch { return ""; }
  });
  // Output device selection (for users with multiple speakers/headphones)
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>(() => {
    try { return localStorage.getItem("atc_output_device_id") || ""; } catch { return ""; }
  });
  // setSinkId is only on Chromium-family browsers
  const sinkIdSupported = typeof document !== "undefined"
    && typeof (document.createElement("audio") as any).setSinkId === "function";
  const applySinkId = useCallback(async (el: HTMLAudioElement | null) => {
    if (!el || !selectedOutputId || !sinkIdSupported) return;
    try { await (el as any).setSinkId(selectedOutputId); } catch { /* device gone or not allowed */ }
  }, [selectedOutputId, sinkIdSupported]);
  const refreshAudioDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput");
      const outputs = all.filter((d) => d.kind === "audiooutput");
      setAudioDevices(inputs);
      setOutputDevices(outputs);
      // If saved device is no longer present, clear it
      if (selectedDeviceId && !inputs.some((d) => d.deviceId === selectedDeviceId)) {
        setSelectedDeviceId("");
        try { localStorage.removeItem("atc_mic_device_id"); } catch { /* noop */ }
      }
      if (selectedOutputId && !outputs.some((d) => d.deviceId === selectedOutputId)) {
        setSelectedOutputId("");
        try { localStorage.removeItem("atc_output_device_id"); } catch { /* noop */ }
      }
    } catch { /* noop */ }
  }, [selectedDeviceId, selectedOutputId]);
  useEffect(() => {
    void refreshAudioDevices();
    const handler = () => { void refreshAudioDevices(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => { navigator.mediaDevices?.removeEventListener?.("devicechange", handler); };
  }, [refreshAudioDevices]);
  const handleSelectDevice = useCallback((id: string) => {
    setSelectedDeviceId(id);
    try {
      if (id) localStorage.setItem("atc_mic_device_id", id);
      else localStorage.removeItem("atc_mic_device_id");
    } catch { /* noop */ }
  }, []);
  const handleSelectOutput = useCallback((id: string) => {
    setSelectedOutputId(id);
    try {
      if (id) localStorage.setItem("atc_output_device_id", id);
      else localStorage.removeItem("atc_output_device_id");
    } catch { /* noop */ }
    // Re-route any currently playing audio to the new sink immediately.
    if (audioElRef.current && sinkIdSupported) {
      try { void (audioElRef.current as any).setSinkId(id || "default"); } catch { /* noop */ }
    }
    if (micTestAudioRef.current && sinkIdSupported) {
      try { void (micTestAudioRef.current as any).setSinkId(id || "default"); } catch { /* noop */ }
    }
  }, [sinkIdSupported]);
  // One-time onboarding tooltip explaining mic permission.
  const [showMicOnboarding, setShowMicOnboarding] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("atc_mic_onboarding_dismissed")) {
        setShowMicOnboarding(true);
      }
    } catch { /* private mode */ }
  }, []);
  const dismissMicOnboarding = useCallback(() => {
    setShowMicOnboarding(false);
    try { localStorage.setItem("atc_mic_onboarding_dismissed", "1"); } catch { /* noop */ }
  }, []);
  // Live streak count: consecutive ATC PASSes from most-recent backwards.
  const [streak, setStreak] = useState<number>(0);
  // Swappable COM1 active/standby frequencies (Garmin-style). Reset on scenario change.
  const [activeFreq, setActiveFreq] = useState("118.300");
  const [standbyFreq, setStandbyFreq] = useState("121.500");
  const [swapAnim, setSwapAnim] = useState(false);
  // Live-frequency mode: pilot picks an airport, then tunes a real freq;
  // the controller persona is derived from the airport's published facilities.
  const [liveAirport, setLiveAirport] = useState<AirportFrequencies | null>(null);
  const [airportSearch, setAirportSearch] = useState("");
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
  const pttHoldRef = useRef<boolean>(false);
  const recognizerStartTsRef = useRef<number>(0);
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

  // Compute the live ATC PASS streak (consecutive PASSes from most recent backwards).
  const refreshStreak = useCallback(async () => {
    if (!user) { setStreak(0); return; }
    const { data } = await supabase
      .from("exam_scores")
      .select("result")
      .eq("user_id", user.id)
      .eq("exam_type", "atc_phraseology")
      .order("created_at", { ascending: false })
      .limit(15);
    let count = 0;
    for (const row of data ?? []) {
      if (row.result === "PASS") count += 1;
      else break;
    }
    setStreak(count);
  }, [user]);

  useEffect(() => { void refreshStreak(); }, [refreshStreak]);
  // Refresh after each scored attempt.
  useEffect(() => { if (phraseologyScore) void refreshStreak(); }, [phraseologyScore, refreshStreak]);

  // Persist voice preference across sessions
  useEffect(() => {
    try { localStorage.setItem("atc_voice", voice); } catch { /* private mode */ }
  }, [voice]);

  // Persist last-used scenario id across sessions
  useEffect(() => {
    if (!selectedScenario) return;
    setLastScenarioId(selectedScenario);
    try { localStorage.setItem("atc_last_scenario", selectedScenario); } catch { /* private mode */ }
  }, [selectedScenario]);

  // Reset COM1 active/standby when the scenario changes (legacy preset path).
  useEffect(() => {
    if (!selectedScenario || selectedScenario === "live") return;
    const sc = scenarios.find((s) => s.id === selectedScenario);
    const fac = sc?.facility ?? "TWR";
    const freq = sc?.frequency ?? "118.300";
    const [intp, dec = ""] = String(freq).split(".");
    setActiveFreq(`${intp}.${(dec + "000").slice(0, 3)}`);
    setStandbyFreq(fac === "GND" ? "118.300" : "121.500");
  }, [selectedScenario]);

  // ---- Live frequency mode helpers ---------------------------------------
  /**
   * Resolve the controller persona for the currently-tuned active frequency
   * at the selected airport. Returns `null` when not in live mode.
   */
  const liveContext = (() => {
    if (!liveAirport) return null;
    const freqMHz = parseFloat(activeFreq);
    if (!Number.isFinite(freqMHz)) return null;
    const lookup = lookupFacility(liveAirport.icao, freqMHz);
    return {
      airport: liveAirport,
      freqMHz,
      facility: lookup.facility,
    };
  })();

  /** Build the system prompt for the current session (live or preset). */
  const buildSystemPrompt = useCallback((): string => {
    if (selectedScenario === "live" && liveAirport) {
      const freqMHz = parseFloat(activeFreq);
      const lookup = lookupFacility(liveAirport.icao, freqMHz);
      return LIVE_FREQ_PROMPT({
        airportIcao: liveAirport.icao,
        airportCallName: liveAirport.callName,
        facilityKind: (lookup.facility?.kind ?? "NONE") as FacilityKind | "NONE",
        facilityName: lookup.facility?.name ?? "(no station)",
        frequency: formatFreq(freqMHz),
        knownFacilities: liveAirport.facilities.map((f) => ({
          kind: f.kind,
          name: f.name,
          freq: formatFreq(f.freq),
        })),
      });
    }
    const sc = scenarios.find((s) => s.id === selectedScenario);
    return FAA_PROMPT(sc?.label ?? "ATC Communications");
  }, [selectedScenario, liveAirport, activeFreq]);

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

  /**
   * Begin a free-form live session at an airport. The pilot picks the airport,
   * we set the active frequency to its tower (or first listed facility), and
   * the user can tune from there. We DO NOT auto-call the pilot — the pilot
   * initiates the first transmission, since they're "tuning in" to a freq.
   */
  const startLiveSession = (airport: AirportFrequencies) => {
    setLiveAirport(airport);
    setSelectedScenario("live");
    setMessages([]);
    setError(null);
    setPhraseologyScore(null);
    // Default tune: tower if present, else first facility.
    const tower = airport.facilities.find((f) => f.kind === "TOWER");
    const first = tower ?? airport.facilities[0];
    if (first) setActiveFreq(formatFreq(first.freq));
    const ground = airport.facilities.find((f) => f.kind === "GROUND");
    setStandbyFreq(ground ? formatFreq(ground.freq) : "121.500");
    const intro: ATCMessage = {
      id: crypto.randomUUID(),
      role: "system",
      content: `📡 Live Frequencies — ${airport.icao} (${airport.callName}) · N123AB · Tune your radio and call up.`,
    };
    setMessages([intro]);
  };

  /** Tune the active radio to a published facility instantly. */
  const tuneToFacility = (facility: AtcFacility) => {
    const freqStr = formatFreq(facility.freq);
    setStandbyFreq(activeFreq);
    setActiveFreq(freqStr);
    setSwapAnim(true);
    window.setTimeout(() => setSwapAnim(false), 350);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "system",
        content: `🎚️ Tuned ${facility.name} · ${freqStr}`,
      },
    ]);
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
      await applySinkId(audio);
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
          messages: [{ role: "system", content: buildSystemPrompt() }, ...history],
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
  }, [messages, selectedScenario, voice, buildSystemPrompt]);

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
    setGradingProgress({ phase: "connecting", attempt: 1, chars: 0 });
    setError(null);
    gradingCancelledRef.current = false;
    const abortController = new AbortController();
    gradingAbortRef.current = abortController;
    setCanCancelGrading(true);

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
      // pilot-chat returns a streamed SSE response; supabase.functions.invoke
      // does not parse SSE, so we call the function URL directly and assemble
      // the streamed text ourselves. Wrapped in a retry-with-backoff helper so
      // transient network errors / 5xx / rate limits don't strand the user on
      // "Grading…".
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
      const SUPABASE_ANON = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const MAX_ATTEMPTS = 3;
      const BASE_DELAY_MS = 800;
      const isRetryableStatus = (s: number) => s === 408 || s === 425 || s === 429 || (s >= 500 && s <= 599);
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const fetchAndParse = async (attemptNum: number): Promise<string> => {
        setGradingProgress({ phase: "connecting", attempt: attemptNum, chars: 0 });
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/pilot-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON}`,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: SCORE_PROMPT },
              { role: "user", content: "Grade now. Return only JSON." },
            ],
          }),
          signal: abortController.signal,
        });
        if (!resp.ok || !resp.body) {
          const txt = await resp.text().catch(() => "");
          const err: any = new Error(`Grader request failed (${resp.status}) ${txt}`);
          err.status = resp.status;
          err.retryable = isRetryableStatus(resp.status) || !resp.body;
          throw err;
        }

        setGradingProgress({ phase: "streaming", attempt: attemptNum, chars: 0 });
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";
        let lastUiUpdate = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload);
              const delta = evt?.choices?.[0]?.delta?.content
                ?? evt?.choices?.[0]?.message?.content
                ?? "";
              if (delta) raw += delta;
            } catch { /* ignore malformed chunk */ }
          }
          // Throttle UI updates so we re-render at most every 100ms.
          const now = Date.now();
          if (now - lastUiUpdate > 100) {
            lastUiUpdate = now;
            setGradingProgress({ phase: "streaming", attempt: attemptNum, chars: raw.length });
          }
        }
        // Stream finished — past the cancellable window. Hide Stop / Cancel
        // immediately so the user can't click them while we parse + save.
        setCanCancelGrading(false);
        setGradingProgress({ phase: "parsing", attempt: attemptNum, chars: raw.length });
        if (!raw.trim()) {
          const err: any = new Error("Grader returned empty stream");
          err.retryable = true;
          throw err;
        }
        return raw;
      };

      let raw = "";
      let lastErr: any = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (gradingCancelledRef.current) break;
        try {
          raw = await fetchAndParse(attempt);
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          if (gradingCancelledRef.current || e?.name === "AbortError") break;
          const retryable = e?.retryable !== false; // network errors default to retryable
          if (!retryable || attempt === MAX_ATTEMPTS) break;
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
          console.warn(`[ATCTrainer] grader attempt ${attempt} failed, retrying in ${delay}ms`, e?.message);
          setGradingProgress({ phase: "retrying", attempt: attempt + 1, chars: 0 });
          await sleep(delay);
        }
      }
      if (gradingCancelledRef.current) return;
      if (lastErr) throw lastErr;

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

      // Auto-create a Draft flight log entry when the radio session passes.
      if (result === "PASS") {
        try {
          await supabase.from("flight_logs").insert({
            user_id: user.id,
            status: "draft",
            flight_date: new Date().toISOString().slice(0, 10),
            aircraft_type: "C172",
            tail_number: "N123AB",
            remarks: `ATC Radio Session — ${scenario.label}\nScore: ${score}/${total} (${pct}%)\n${summary}`.slice(0, 2000),
            source: "atc_session",
            source_session_id: inserted?.id ?? null,
          } as any);
          toast.message("Draft logbook entry created", { description: "Open Logbook to finalize times and landings." });
        } catch (logErr) {
          console.warn("Auto-log creation failed", logErr);
        }
      }
      // Achievement tiers — persisted server-side so each toast only fires once per user.
      // Lower-tier (90+) earns Top Tier; a flawless 100 also earns the rare Perfect Score badge.
      const tiersEarned: Array<{ tier: string; title: string; description: string }> = [];
      if (pct >= 90) {
        tiersEarned.push({
          tier: "radio_proficiency_top_tier",
          title: "🏆 Achievement Unlocked",
          description: "Radio Proficiency: Top Tier",
        });
      }
      if (pct >= 100) {
        tiersEarned.push({
          tier: "radio_proficiency_perfect",
          title: "💎 Perfect Score",
          description: "Flawless phraseology — every transmission nailed.",
        });
      }
      // Streak + comeback achievements based on recent ATC results.
      if (result === "PASS") {
        const { data: recent } = await supabase
          .from("exam_scores")
          .select("result")
          .eq("user_id", user.id)
          .eq("exam_type", "atc_phraseology")
          .order("created_at", { ascending: false })
          .limit(10);
        const results = recent ?? [];
        if (results.length >= 3 && results.slice(0, 3).every((r) => r.result === "PASS")) {
          tiersEarned.push({
            tier: "radio_streak_3",
            title: "🔥 On a Roll",
            description: "3 ATC scenarios passed back-to-back.",
          });
        }
        if (results.length >= 10 && results.slice(0, 10).every((r) => r.result === "PASS")) {
          tiersEarned.push({
            tier: "radio_streak_10",
            title: "🥇 Iron Mic",
            description: "10 ATC scenarios passed in a row — elite consistency.",
          });
        }
        // Comeback Kid: latest is PASS and ANY prior ATC attempt was a FAIL.
        if (results.length >= 2 && results.slice(1).some((r) => r.result === "FAIL")) {
          tiersEarned.push({
            tier: "comeback_kid",
            title: "💪 Comeback Kid",
            description: "Bounced back with a PASS after a previous FAIL.",
          });
        }
      }
      for (let i = 0; i < tiersEarned.length; i++) {
        const t = tiersEarned[i];
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("tier", t.tier)
          .maybeSingle();
        if (existing) continue;
        const { error: achErr } = await supabase.from("user_achievements").insert({
          user_id: user.id,
          tier: t.tier,
          exam_type: "atc_phraseology",
          exam_score_id: inserted?.id ?? null,
          percentile: pct,
        });
        if (!achErr) {
          setTimeout(() => {
            toast.success(t.title, { description: t.description, duration: 6500 });
          }, 600 + i * 900); // stagger so both toasts are readable
        }
      }
      // Notify Flight Deck / Recent Activity to refresh instantly
      emitDashboardRefresh({ source: "atc" });
    } catch (e: any) {
      // Hide Stop / Cancel immediately on any error path too.
      setCanCancelGrading(false);
      if (gradingCancelledRef.current || e?.name === "AbortError") {
        toast.message("Grading cancelled.");
      } else {
        console.error("Phraseology scoring failed", e);
        toast.error("Couldn't score this scenario. Try again.");
        setError("Phraseology grading failed. Please try again.");
      }
    } finally {
      setScoring(false);
      setGradingProgress(null);
      setCanCancelGrading(false);
      gradingAbortRef.current = null;
      gradingCancelledRef.current = false;
    }
  }, [messages, selectedScenario, scoring, user, voice]);

  const cancelGrading = useCallback(() => {
    // Guard: only fire while there's a live request and the cancellable window
    // is open. This is the same flag that controls the button visibility, so
    // even if a stale click slips in we won't abort a no-op.
    if (!gradingAbortRef.current) return;
    gradingCancelledRef.current = true;
    setCanCancelGrading(false);
    try { gradingAbortRef.current.abort(); } catch { /* noop */ }
  }, []);

  // Records ~2s of mic audio then plays it back so users can verify their mic works.
  const runMicTest = async () => {
    if (micTestState !== "idle") return;
    setError(null);
    try {
      try {
        if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (status.state === "denied") {
            setError("Microphone blocked. Click the 🔒 icon in your browser's address bar → allow Microphone, then reload this page.");
            return;
          }
        }
      } catch { /* Safari */ }

      const audioConstraints: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : {};
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      micTestStreamRef.current = stream;
      // After first permission grant, device labels become available — refresh list.
      void refreshAudioDevices();

      // Set up analyser for live level metering
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      micTestCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      micTestAnalyserRef.current = analyser;
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!micTestAnalyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        // Normalize: typical voice RMS ~0.05–0.25, scale to 0..1
        setMicTestLevel(Math.min(1, rms * 4));
        micTestRafRef.current = requestAnimationFrame(tick);
      };
      micTestRafRef.current = requestAnimationFrame(tick);

      const stopMeter = () => {
        if (micTestRafRef.current != null) cancelAnimationFrame(micTestRafRef.current);
        micTestRafRef.current = null;
        micTestAnalyserRef.current = null;
        try { ctx.close(); } catch { /* noop */ }
        micTestCtxRef.current = null;
        setMicTestLevel(0);
      };

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      micTestRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stopMeter();
        // Release mic
        stream.getTracks().forEach((t) => t.stop());
        micTestStreamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 200) {
          setMicTestState("idle");
          setError("No audio captured. Check that the right input device is selected and not muted.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        micTestAudioRef.current = audio;
        void applySinkId(audio);
        setMicTestState("playing");
        audio.onended = () => {
          setMicTestState("idle");
          URL.revokeObjectURL(url);
          micTestAudioRef.current = null;
          toast.success("Mic test complete", { description: "If you heard yourself, you're good to go." });
        };
        audio.onerror = () => {
          setMicTestState("idle");
          URL.revokeObjectURL(url);
          setError("Couldn't play back recording.");
        };
        void audio.play().catch(() => {
          setMicTestState("idle");
          URL.revokeObjectURL(url);
          setError("Browser blocked playback. Try again after interacting with the page.");
        });
      };

      setMicTestState("recording");
      recorder.start();
      setTimeout(() => {
        try { recorder.state === "recording" && recorder.stop(); } catch { /* noop */ }
      }, 2000);
    } catch (err: any) {
      setMicTestState("idle");
      if (micTestRafRef.current != null) cancelAnimationFrame(micTestRafRef.current);
      micTestRafRef.current = null;
      micTestAnalyserRef.current = null;
      try { micTestCtxRef.current?.close(); } catch { /* noop */ }
      micTestCtxRef.current = null;
      setMicTestLevel(0);
      micTestStreamRef.current?.getTracks().forEach((t) => t.stop());
      micTestStreamRef.current = null;
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone permission denied. Click the 🔒 icon in your browser's address bar → allow Microphone, then reload.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No microphone detected. Plug in a mic or check your input device.");
      } else if (name === "NotReadableError") {
        setError("Microphone is in use by another app. Close other apps using the mic and try again.");
      } else {
        setError(`Microphone error: ${err?.message || name || "unknown"}`);
      }
    }
  };

  const startPTT = async () => {
    if (speaking || loading) return;
    if (!sttSupported) {
      setError("Speech recognition unavailable in this browser. Use Chrome or Edge.");
      return;
    }

    // Mark hold state immediately so we can auto-recover from spurious onend events
    // (e.g., the SpeechRecognition engine ends right after start when audio capture
    // wasn't fully ready following the permission prompt).
    pttHoldRef.current = true;
    setPttHeld(true);

    // Proactively request microphone permission within the user gesture.
    // This gives a clear, actionable error instead of a silent SpeechRecognition failure.
    try {
      try {
        if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (status.state === "denied") {
            pttHoldRef.current = false;
            setPttHeld(false);
            setError("Microphone blocked. Click the 🔒 icon in your browser's address bar → allow Microphone, then reload this page.");
            return;
          }
        }
      } catch { /* Safari doesn't support permission query for microphone */ }

      const ptAudio: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : {};
      const stream = await navigator.mediaDevices.getUserMedia({ audio: ptAudio });
      // We don't need the stream itself — SpeechRecognition opens its own. Release immediately.
      stream.getTracks().forEach((t) => t.stop());
      void refreshAudioDevices();
    } catch (err: any) {
      pttHoldRef.current = false;
      setPttHeld(false);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone permission denied. Click the 🔒 icon in your browser's address bar → allow Microphone, then reload.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No microphone detected. Plug in a mic or check your input device.");
      } else if (name === "NotReadableError") {
        setError("Microphone is in use by another app. Close other apps using the mic and try again.");
      } else {
        setError(`Microphone error: ${err?.message || name || "unknown"}`);
      }
      return;
    }

    // If user already released during the permission prompt, abort.
    if (!pttHoldRef.current) return;

    audioElRef.current?.pause();
    fxRef.current?.stopHiss();
    fxRef.current?.squelch("down");

    finalBufferRef.current = "";
    setInterim("");
    setPttActive(true);

    const startRecognizer = () => {
      const r = getRecognizer();
      if (!r) return;
      recognizerRef.current = r;
      recognizerStartTsRef.current = Date.now();
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
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          pttHoldRef.current = false;
          setPttHeld(false);
          setError("Microphone permission denied. Click the 🔒 icon in your browser's address bar → allow Microphone, then reload.");
        } else if (ev.error === "no-speech" || ev.error === "aborted") {
          // benign — let onend handle restart if still holding
        } else {
          setError(`Mic error: ${ev.error}`);
        }
      };
      r.onend = () => {
        // Auto-restart if the user is still holding PTT (recovers from spurious ends
        // that happen right after permission grant or during silence).
        // We can't call r.start() synchronously inside onend (throws InvalidStateError
        // because the recognizer is still in 'stopping' state). Instead, schedule a
        // brand-new recognizer on the next tick.
        if (pttHoldRef.current) {
          // Clear handlers on the old instance so it can't fire again.
          try { r.onresult = null; r.onerror = null; r.onend = null; } catch { /* noop */ }
          setTimeout(() => {
            if (!pttHoldRef.current) {
              // User released during the gap — finalize.
              setPttActive(false);
              setInterim("");
              fxRef.current?.squelch("up");
              const transcript = finalBufferRef.current.trim();
              finalBufferRef.current = "";
              if (transcript) void sendPilotTransmission(transcript);
              return;
            }
            startRecognizer();
          }, 50);
          return;
        }
        setPttActive(false);
        setInterim("");
        fxRef.current?.squelch("up");
        const transcript = finalBufferRef.current.trim();
        finalBufferRef.current = "";
        if (transcript) void sendPilotTransmission(transcript);
      };
      try {
        r.start();
        recognizerStartTsRef.current = Date.now();
      } catch (err) {
        // Recognizer threw on start — most often InvalidStateError from a stale
        // instance. Drop hold so the UI reflects reality.
        console.warn("[ATC PTT] recognizer.start() failed:", err);
        pttHoldRef.current = false;
        setPttHeld(false);
        setPttActive(false);
        setError("Could not start microphone. Please try again.");
      }
    };

    startRecognizer();
  };

  const endPTT = () => {
    pttHoldRef.current = false;
    setPttHeld(false);
    if (!pttActive) return;
    try { recognizerRef.current?.stop(); } catch { /* noop */ }
  };

  const activeScenario = scenarios.find((s) => s.id === selectedScenario);
  const isLiveMode = selectedScenario === "live" && !!liveAirport;
  const scenarioLabel = isLiveMode
    ? `${liveAirport!.icao} · ${liveContext?.facility?.name ?? "OFF FREQUENCY"}`
    : activeScenario?.label;
  const facility = isLiveMode
    ? (liveContext?.facility?.kind ?? "OFF FREQ")
    : (activeScenario?.facility ?? "TWR");
  const frequency = isLiveMode ? activeFreq : (activeScenario?.frequency ?? "118.300");
  const micUiActive = pttHeld || pttActive;
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
        ptt={micUiActive}
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
                speaking ? "animate-ping bg-accent" : micUiActive ? "animate-ping bg-[hsl(var(--hud-green))]" : "bg-muted-foreground/30",
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                speaking ? "bg-accent" : micUiActive ? "bg-[hsl(var(--hud-green))]" : "bg-muted-foreground/40",
              )} />
            </span>
            <Radio className="h-4 w-4 text-primary" />
            <span className="font-display text-xs tracking-[0.2em] uppercase">{scenarioLabel}</span>
            <span className="text-xs text-muted-foreground">• N123AB</span>
            {user && streak > 0 && (() => {
              const nextTier = streak < 3 ? 3 : streak < 10 ? 10 : null;
              const accent = streak >= 10 ? "hsl(45 95% 58%)" : streak >= 3 ? "hsl(18 90% 60%)" : "hsl(var(--hud-green))";
              const tierLabel = streak >= 10 ? "Iron Mic" : streak >= 3 ? "On a Roll" : "Building";
              return (
                <div
                  className="ml-2 relative flex items-center gap-2.5 rounded-md border pl-2 pr-3 py-1 overflow-hidden"
                  style={{
                    borderColor: `${accent}88`,
                    background: `linear-gradient(135deg, ${accent}25 0%, hsl(var(--background) / 0.6) 60%, ${accent}15 100%)`,
                    boxShadow: `inset 0 1px 0 ${accent}55, 0 0 14px -4px ${accent}aa`,
                  }}
                  title={nextTier ? `${nextTier - streak} more PASS to reach the next tier` : "Iron Mic — elite consistency"}
                >
                  <Flame
                    className="h-4 w-4 shrink-0"
                    style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent})` }}
                  />
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span
                      className="font-display text-2xl font-bold tabular-nums"
                      style={{ color: accent, textShadow: `0 0 10px ${accent}cc, 0 0 2px ${accent}` }}
                    >
                      {streak}
                    </span>
                    <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                      Streak
                    </span>
                  </div>
                  <div className="flex flex-col items-end leading-none gap-0.5 border-l pl-2" style={{ borderColor: `${accent}33` }}>
                    <span className="font-display text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: accent }}>
                      {tierLabel}
                    </span>
                    <span className="font-display text-[8px] tracking-[0.2em] uppercase text-muted-foreground/80">
                      {nextTier ? `Next ${nextTier}` : "Max Tier"}
                    </span>
                  </div>
                </div>
              );
            })()}
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
              {scoring
                ? (gradingProgress
                    ? (gradingProgress.phase === "connecting"
                        ? `Connecting${gradingProgress.attempt > 1 ? ` (try ${gradingProgress.attempt})` : ""}…`
                        : gradingProgress.phase === "streaming"
                          ? `Grading… ${gradingProgress.chars} chars`
                          : gradingProgress.phase === "retrying"
                            ? `Retrying (try ${gradingProgress.attempt})…`
                            : "Finalizing…")
                    : "Grading…")
                : "End & Score"}
            </Button>
            {/* Stop is only shown while the SSE request is still cancellable. */}
            {canCancelGrading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelGrading}
                disabled={!canCancelGrading}
                title="Stop the grading request"
                className="text-destructive hover:text-destructive"
              >
                <Square className="h-3 w-3 mr-1 fill-current" />
                Stop
              </Button>
            )}
            {lastScenarioId && lastScenarioId !== selectedScenario && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { void startScenario(lastScenarioId); }}
                disabled={loading || speaking || scoring}
                title={`Resume your last scenario: ${scenarios.find((s) => s.id === lastScenarioId)?.label ?? lastScenarioId}`}
              >
                <History className="h-3 w-3 mr-1" />
                Resume Last
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { setSelectedScenario(null); setLiveAirport(null); setMessages([]); setPhraseologyScore(null); }}>
              <RotateCcw className="h-3 w-3 mr-1" /> New Scenario
            </Button>
          </div>
        </div>

        {scoring && gradingProgress && (
          <div className="px-4 py-2 border-b bg-muted/40 flex items-center gap-3 text-xs font-mono">
            <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="uppercase tracking-wider text-muted-foreground">
                  {gradingProgress.phase === "connecting" && `Connecting to grader${gradingProgress.attempt > 1 ? ` · attempt ${gradingProgress.attempt}` : ""}`}
                  {gradingProgress.phase === "streaming" && `Receiving grader response · ${gradingProgress.chars.toLocaleString()} chars`}
                  {gradingProgress.phase === "retrying" && `Retrying (attempt ${gradingProgress.attempt})`}
                  {gradingProgress.phase === "parsing" && "Parsing grader output"}
                </span>
                <span className="text-muted-foreground/70">SSE</span>
              </div>
              <div className="mt-1 h-1 rounded bg-muted overflow-hidden">
                <div
                  className={`h-full bg-primary transition-all duration-200 ${gradingProgress.phase === "streaming" ? "" : "animate-pulse"}`}
                  style={{
                    width: gradingProgress.phase === "streaming"
                      ? `${Math.min(95, 10 + Math.min(gradingProgress.chars, 1500) / 1500 * 85)}%`
                      : gradingProgress.phase === "parsing" ? "100%" : "20%",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[13px] leading-relaxed">
          {!selectedScenario && (
            <div className="h-full flex flex-col gap-5">
              {/* ========= LIVE FREQUENCY MODE (primary) ========= */}
              <div>
                <div className="text-center mb-3">
                  <div className="font-display text-[10px] tracking-[0.3em] uppercase text-primary">
                    Live Frequency Trainer
                  </div>
                  <div className="text-xs text-muted-foreground/80 mt-1">
                    Pick an airport, then dial in any real published frequency. The controller on the other end is determined by the freq you tune.
                  </div>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={airportSearch}
                    onChange={(e) => setAirportSearch(e.target.value)}
                    placeholder="Search by ICAO (e.g. KMYF) or name…"
                    className="w-full pl-8 pr-3 py-2 rounded-md bg-muted/30 border border-border text-sm font-mono uppercase placeholder:normal-case placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
                    aria-label="Search airport"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {(() => {
                    const q = airportSearch.trim().toUpperCase();
                    const list = q
                      ? atcFrequencies.filter((a) => a.icao.includes(q) || a.callName.toUpperCase().includes(q))
                      : atcFrequencies;
                    if (list.length === 0) {
                      return (
                        <div className="col-span-full text-center text-xs text-muted-foreground py-6 font-sans">
                          No airport matches "{airportSearch}". Try ICAO (e.g. KMYF, KJFK).
                        </div>
                      );
                    }
                    return list.map((a) => {
                      const tower = a.facilities.find((f) => f.kind === "TOWER");
                      return (
                        <button
                          key={a.icao}
                          type="button"
                          onClick={() => startLiveSession(a)}
                          className="group text-left rounded-lg border border-border bg-muted/20 hover:bg-primary/5 hover:border-primary/50 hover:shadow-[0_0_18px_-6px_hsl(var(--primary)/0.6)] active:scale-[0.99] p-3 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-display text-[12px] tracking-[0.15em] uppercase text-foreground">
                              {a.icao}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                              {tower ? formatFreq(tower.freq) : "—"}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug font-sans">
                            {a.callName}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {a.facilities.slice(0, 5).map((f, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-background/60 border border-border font-display text-[8px] tracking-[0.15em] uppercase text-muted-foreground"
                              >
                                {f.kind}
                              </span>
                            ))}
                            {a.facilities.length > 5 && (
                              <span className="text-[8px] text-muted-foreground/70 font-mono">+{a.facilities.length - 5}</span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* ========= LEGACY GUIDED SCENARIOS ========= */}
              <div className="border-t border-border pt-4">
                <div className="text-center mb-3">
                  <div className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Or pick a guided scenario
                  </div>
                  <div className="text-xs text-muted-foreground/80 mt-1">
                    Pre-scripted drill — ATC starts the call.
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scenarios.map((s) => {
                    const isLast = lastScenarioId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { void startScenario(s.id); }}
                        disabled={loading}
                        className={cn(
                          "group relative text-left rounded-lg border p-3 transition-all",
                          "bg-muted/20 hover:bg-primary/5 hover:border-primary/50",
                          "hover:shadow-[0_0_18px_-6px_hsl(var(--primary)/0.6)]",
                          "active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed",
                          isLast ? "border-primary/60 bg-primary/5" : "border-border",
                        )}
                        title={s.description}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-display text-[11px] tracking-[0.2em] uppercase text-foreground">
                            {s.label}
                          </span>
                          {isLast && (
                            <span className="font-display text-[8px] tracking-[0.2em] uppercase text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30">
                              Last
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-snug mb-2 font-sans">
                          {s.description}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-background/60 border border-border">
                            {s.facility}
                          </span>
                          <span className="tabular-nums">{s.frequency}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Live-mode in-session frequency chips: tap to tune instantly */}
          {isLiveMode && liveAirport && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display text-[9px] tracking-[0.25em] uppercase text-primary">
                  {liveAirport.icao} Frequencies — tap to tune
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  Active: {activeFreq}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {liveAirport.facilities.map((f, i) => {
                  const tuned = Math.abs(parseFloat(activeFreq) - f.freq) <= 0.015;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => tuneToFacility(f)}
                      disabled={tuned || loading || speaking}
                      className={cn(
                        "px-2 py-1 rounded border text-[10px] font-display tracking-[0.15em] uppercase transition-colors",
                        tuned
                          ? "border-primary bg-primary/15 text-primary cursor-default"
                          : "border-border bg-background/60 hover:border-primary/60 hover:bg-primary/5 text-foreground",
                      )}
                      title={`${f.name} · ${formatFreq(f.freq)}`}
                    >
                      <span className="text-muted-foreground mr-1">{f.kind}</span>
                      <span className="tabular-nums font-mono">{formatFreq(f.freq)}</span>
                    </button>
                  );
                })}
              </div>
              {liveContext && !liveContext.facility && (
                <div className="mt-2 text-[10px] text-amber-500 font-sans flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No facility on {activeFreq} at {liveAirport.icao} — dead air. Tune a published frequency.
                </div>
              )}
            </div>
          )}

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
          {micUiActive && interim && (
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
      <div className="border border-border rounded-lg bg-card p-4 flex flex-col items-center justify-between gap-4 relative">
        {/* One-time onboarding tooltip — explains mic permission requirement */}
        {showMicOnboarding && (
          <div
            role="dialog"
            aria-label="Microphone permission required"
            className="absolute top-2 left-2 right-2 z-20 rounded-md border border-accent/50 bg-card/95 backdrop-blur p-3 shadow-[0_0_24px_-6px_hsl(var(--accent)/0.5)]"
          >
            <button
              onClick={dismissMicOnboarding}
              aria-label="Dismiss"
              className="absolute top-1.5 right-1.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-2 pr-5">
              <Lock className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <div className="font-display text-[11px] tracking-[0.2em] uppercase text-accent">
                  Microphone Required
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  ATC Trainer needs your mic for push-to-talk. When you press PTT, your browser will ask for permission — click <span className="text-foreground font-medium">Allow</span>.
                </p>
                <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                  If blocked, click the 🔒 icon in your address bar → set Microphone to <span className="text-foreground">Allow</span> → reload.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] tracking-[0.15em] uppercase font-display" onClick={() => { dismissMicOnboarding(); void runMicTest(); }}>
                    <Mic className="h-3 w-3 mr-1" /> Test Now
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] tracking-[0.15em] uppercase font-display" onClick={dismissMicOnboarding}>
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="text-center">
          <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            Push To Talk
          </div>
          <div className="text-xs text-muted-foreground">
            Hold the button (or hold <kbd className="px-1 py-0.5 rounded bg-muted text-foreground text-[10px]">Space</kbd>) and speak. Release to transmit.
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={runMicTest}
              disabled={micTestState !== "idle" || pttActive || speaking || loading}
              className="h-7 text-[10px] tracking-[0.2em] uppercase font-display"
              title="Records 2 seconds and plays it back so you can confirm your mic works."
            >
              {micTestState === "recording" ? (
                <>
                  <span className="relative mr-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--hud-green))] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--hud-green))]" />
                  </span>
                  Recording…
                </>
              ) : micTestState === "playing" ? (
                <>
                  <Volume2 className="h-3 w-3 mr-1.5" />
                  Playing back…
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3 mr-1.5" />
                  Test Microphone
                </>
              )}
            </Button>
            {audioDevices.length > 1 && (
              <Select
                value={selectedDeviceId || "default"}
                onValueChange={(v) => handleSelectDevice(v === "default" ? "" : v)}
                disabled={micTestState !== "idle" || pttActive}
              >
                <SelectTrigger
                  className="h-7 w-[180px] text-[10px] tracking-[0.15em] uppercase font-display"
                  title="Choose which microphone to use"
                  aria-label="Select microphone input device"
                >
                  <SelectValue placeholder="System default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">System default</SelectItem>
                  {audioDevices.map((d, i) => (
                    <SelectItem key={d.deviceId || `mic-${i}`} value={d.deviceId || `mic-${i}`} className="text-xs">
                      {d.label || `Microphone ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {audioDevices.length > 1 && !audioDevices.some((d) => d.label) && (
            <div className="text-[9px] text-muted-foreground mt-1 font-mono">
              Tip: run Test Microphone once to reveal device names.
            </div>
          )}
          {/* Output device picker (Chromium only — uses HTMLMediaElement.setSinkId) */}
          {sinkIdSupported && outputDevices.length > 1 && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <Volume2 className="h-3 w-3 text-muted-foreground" aria-hidden />
              <Select
                value={selectedOutputId || "default"}
                onValueChange={(v) => handleSelectOutput(v === "default" ? "" : v)}
                disabled={speaking}
              >
                <SelectTrigger
                  className="h-7 w-[200px] text-[10px] tracking-[0.15em] uppercase font-display"
                  title="Choose which speakers/headphones ATC audio plays through"
                  aria-label="Select audio output device"
                >
                  <SelectValue placeholder="System default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">System default</SelectItem>
                  {outputDevices.map((d, i) => (
                    <SelectItem key={d.deviceId || `out-${i}`} value={d.deviceId || `out-${i}`} className="text-xs">
                      {d.label || `Speaker ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Live input-level meter — visible during mic test */}
          {micTestState === "recording" && (
            <div className="mt-2 w-full max-w-[180px] mx-auto" aria-label="Microphone input level">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[8px] tracking-[0.25em] uppercase text-muted-foreground">Input</span>
                <span className="font-display text-[8px] tracking-[0.25em] uppercase text-muted-foreground tabular-nums">
                  {Math.round(micTestLevel * 100)}%
                </span>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 transition-[width] duration-75"
                  style={{
                    width: `${Math.min(100, micTestLevel * 100)}%`,
                    background: micTestLevel > 0.85
                      ? "hsl(0 80% 55%)"
                      : micTestLevel > 0.6
                      ? "hsl(45 95% 58%)"
                      : "hsl(var(--hud-green))",
                    boxShadow: `0 0 8px ${
                      micTestLevel > 0.85 ? "hsl(0 80% 55%)" : micTestLevel > 0.6 ? "hsl(45 95% 58%)" : "hsl(var(--hud-green))"
                    }`,
                  }}
                />
              </div>
              <div className="text-center text-[9px] text-muted-foreground mt-1 font-mono">
                {micTestLevel < 0.05 ? "Speak now…" : micTestLevel > 0.85 ? "Too loud — back off" : "Good level"}
              </div>
            </div>
          )}
        </div>

        <div className="relative h-48 w-48 flex items-center justify-center">
          {/* Cockpit-style segmented ring around the PTT — reacts to AI voice */}
          <PTTRing
            getAnalyser={() => fxRef.current?.analyser ?? null}
            speaking={speaking}
            pttActive={micUiActive}
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
              void startPTT();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
              endPTT();
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
              endPTT();
            }}
            disabled={speaking || loading}
            className={cn(
              "relative h-40 w-40 rounded-full border-4 transition-all select-none z-10",
              "flex flex-col items-center justify-center gap-1",
              micUiActive
                ? "bg-[hsl(var(--hud-green))]/20 border-[hsl(var(--hud-green))] shadow-[0_0_30px_hsl(var(--hud-green)/0.6)]"
                : speaking
                ? "bg-accent/10 border-accent/60 cursor-not-allowed"
                : "bg-primary/5 border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95",
              (speaking || loading) && "opacity-60",
            )}
          >
            {micUiActive ? (
              <Mic className="h-10 w-10 text-[hsl(var(--hud-green))]" />
            ) : speaking ? (
              <Volume2 className="h-10 w-10 text-accent animate-pulse" />
            ) : (
              <MicOff className="h-10 w-10 text-primary" />
            )}
            <span className="font-display text-[10px] tracking-[0.25em] uppercase mt-1">
              {micUiActive ? "Live" : speaking ? "ATC" : "PTT"}
            </span>
          </button>
        </div>

        {/* Mic status label — shows live armed state under the PTT button */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 font-display text-[10px] tracking-[0.25em] uppercase"
        >
          {micUiActive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--hud-green))] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--hud-green))]" />
              </span>
              <span className="text-[hsl(var(--hud-green))]">Mic Live — Speak Now</span>
            </>
          ) : speaking ? (
            <span className="text-accent">ATC Transmitting…</span>
          ) : loading ? (
            <span className="text-muted-foreground">Processing…</span>
          ) : !sttSupported ? (
            <span className="text-muted-foreground/60">Mic Unavailable</span>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
              <span className="text-muted-foreground">Mic Ready — Hold</span>
              <kbd
                aria-label="Spacebar"
                title="Hold Spacebar to transmit"
                className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 font-display text-[9px] tracking-[0.2em] uppercase text-foreground/80 shadow-sm"
              >
                <span className="inline-block h-[2px] w-3 rounded-full bg-foreground/60" />
                Space
              </kbd>
            </>
          )}
        </div>

        {/* VU meter — pulses with AI voice + hiss bed */}
        <VUMeter getAnalyser={() => fxRef.current?.analyser ?? null} active={speaking} />

        <div className="flex flex-col items-center gap-1.5">
          <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            ATC Voice
          </span>
          <div
            role="radiogroup"
            aria-label="ATC voice"
            className="inline-flex rounded-md border border-border overflow-hidden"
          >
            {(["male", "female"] as const).map((v) => {
              const active = voice === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={speaking || loading}
                  onClick={() => setVoice(v)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-display tracking-[0.25em] uppercase transition-colors",
                    active
                      ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]"
                      : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    (speaking || loading) && "opacity-60 cursor-not-allowed",
                  )}
                  title={`Use ${v} ATC voice`}
                >
                  {v}
                </button>
              );
            })}
          </div>
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
