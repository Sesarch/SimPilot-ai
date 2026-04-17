import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "simpilot.stressTickEnabled";

/**
 * Generates a short, subtle tick sound via Web Audio (no asset needed).
 * Persists user's preference in localStorage. Defaults to ON.
 */
export function useTickSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    }
  }, [enabled]);

  const setEnabled = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setEnabledState(v);
  }, []);

  const playTick = useCallback((urgent = false) => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Subtle, dry mechanical tick. Higher pitch + slightly louder when urgent.
      osc.type = "square";
      osc.frequency.value = urgent ? 1400 : 1100;

      const peak = urgent ? 0.05 : 0.03;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  return { enabled, setEnabled, playTick };
}
