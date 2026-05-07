import { useEffect, useRef, useState } from "react";

/** Circular segmented waveform ring around the PTT button. Lights segment-by-
 *  segment based on AI voice analyser amplitude. */
export const PTTRing = ({
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
        const HALF = SEGMENTS / 2;
        const slice = Math.max(1, Math.floor(usable / HALF));
        for (let i = 0; i < HALF; i++) {
          let sum = 0;
          const from = start + i * slice;
          const to = Math.min(bins.length, from + slice);
          for (let j = from; j < to; j++) sum += bins[j];
          const avg = (to - from) > 0 ? sum / (to - from) / 255 : 0;
          next[i] = avg;
          next[SEGMENTS - 1 - i] = avg;
        }
      }
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

  const SIZE = 192;
  const CENTER = SIZE / 2;
  const RADIUS = 88;
  const SEG_LEN = 10;
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
        const colorVar = speaking
          ? "var(--accent)"
          : pttActive
          ? "var(--hud-green)"
          : "var(--primary)";
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
