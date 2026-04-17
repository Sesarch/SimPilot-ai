import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "simpilot-voice-mode";

/** Strip markdown / structured-report blocks so the TTS only reads the spoken question. */
const sanitizeForSpeech = (raw: string): string => {
  if (!raw) return "";
  let text = raw;
  // Remove fenced code blocks (e.g. ```checkride-report ... ```)
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, "$1");
  // Remove markdown headings/asterisks/underscores
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
  // Remove markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove ACS code chips like [PA.I.A.K1] -> "ACS code PA I A K1"
  text = text.replace(/\[([A-Z]{2,3}(?:\.[A-Z0-9]+){2,})\]/g, "ACS code $1");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
};

export const useSpeech = () => {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [speaking, setSpeaking] = useState(false);
  const lastSpokenRef = useRef<string>("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    }
    if (!v && supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const pickVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!supported) return undefined;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return undefined;
    // Prefer a deep US English male voice for the DPE
    const preferred = [
      /Daniel/i, /Google US English/i, /Microsoft Guy/i, /Microsoft David/i, /Alex/i, /Fred/i,
    ];
    for (const re of preferred) {
      const v = voices.find((x) => re.test(x.name) && /en[-_]/i.test(x.lang));
      if (v) return v;
    }
    return voices.find((v) => /^en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  }, [supported]);

  const speak = useCallback((raw: string) => {
    if (!supported || !enabled) return;
    const text = sanitizeForSpeech(raw);
    if (!text || text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.98;
    u.pitch = 0.9;
    u.volume = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, [supported, enabled, pickVoice]);

  // Warm up voices list (some browsers load asynchronously)
  useEffect(() => {
    if (!supported) return;
    const handler = () => { /* triggers re-pick on next speak */ };
    window.speechSynthesis.onvoiceschanged = handler;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  // Stop on unmount
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, enabled, setEnabled, speak, cancel, speaking };
};
