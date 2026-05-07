import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** 16-bar VU meter driven by an AnalyserNode (frequency-domain). */
export const VUMeter = ({
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
        const prev = peaksRef.current[i] ?? 0;
        const next = level > prev ? level : Math.max(0, prev - PEAK_DECAY);
        peaksRef.current[i] = next;

        const h = Math.max(2, next * cssH);
        const x = i * (barW + gap);
        const y = cssH - h;
        ctx2d.fillStyle = active ? `hsl(${accent})` : `hsl(${muted} / 0.35)`;
        ctx2d.fillRect(x, y, barW, h);
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
