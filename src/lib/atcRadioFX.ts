/**
 * Static / squelch sound design and Web-Speech recognizer helpers used by
 * the ATC trainer. Extracted from ATCTrainer.tsx to keep that component
 * focused on UI + state wiring.
 *
 * RadioFX is a tiny, self-contained WebAudio mixer:
 *   - .squelch("up"|"down")   short bandpass click
 *   - .startHiss() / stopHiss low filtered noise bed during voice
 *   - .attachMediaElement(el) routes any <audio> through the analyser bus
 *   - .analyser                shared AnalyserNode used by VU + PTT ring
 *
 * No external assets — every sound is synthesized from a noise buffer.
 */

export class RadioFX {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private hissNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** Shared analyser for VU meter — sums voice + hiss bed. */
  public analyser: AnalyserNode | null = null;
  private analyserMix: GainNode | null = null;
  private elementSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  getCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
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

/** Lazily build a Web Speech Recognition instance, or return null when
 *  unsupported (Safari iOS without permissions, etc.). Caller controls
 *  start/stop and result handling. */
export function getRecognizer(): unknown {
  const w = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR() as { continuous: boolean; interimResults: boolean; lang: string };
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}
