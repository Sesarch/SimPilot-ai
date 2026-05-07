import { useEffect, useState } from "react";
import { Play, Pause, Rewind } from "lucide-react";
import { Slider } from "@/components/ui/slider";

/**
 * LiveAtisSeekBar — Compact transport for the live ATIS <audio> element.
 *
 * Live HTTP shoutcast/icecast streams typically expose `duration = Infinity`
 * and an empty `seekable` range, so true seeking isn't possible. However,
 * `audio.buffered` usually retains the most recently downloaded seconds,
 * which lets the pilot scrub backwards a short window to replay something
 * they missed (e.g. after a buffer hiccup). When `seekable` IS available
 * (some proxied/recorded sources), the slider becomes fully scrubbable.
 *
 * Falls back gracefully: if no buffered window exists, only Play/Pause +
 * "Live" indicator render — never a broken / empty slider.
 */
export const LiveAtisSeekBar = ({ audioRef }: { audioRef: React.MutableRefObject<HTMLAudioElement | null> }) => {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);

  // Re-render on time/buffer/state changes from the underlying <audio>.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const bump = () => setTick((t) => (t + 1) % 1_000_000);
    const onPause = () => { setPaused(true); bump(); };
    const onPlay = () => { setPaused(false); bump(); };
    audio.addEventListener("timeupdate", bump);
    audio.addEventListener("progress", bump);
    audio.addEventListener("durationchange", bump);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    setPaused(audio.paused);
    return () => {
      audio.removeEventListener("timeupdate", bump);
      audio.removeEventListener("progress", bump);
      audio.removeEventListener("durationchange", bump);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [audioRef, tick === 0]);

  const audio = audioRef.current;
  if (!audio) return null;

  let windowStart = 0;
  let windowEnd = 0;
  let isSeekable = false;
  try {
    if (audio.seekable && audio.seekable.length > 0) {
      const lastIdx = audio.seekable.length - 1;
      const s = audio.seekable.start(lastIdx);
      const e = audio.seekable.end(lastIdx);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        windowStart = s;
        windowEnd = e;
        isSeekable = true;
      }
    }
    if (!isSeekable && audio.buffered && audio.buffered.length > 0) {
      const lastIdx = audio.buffered.length - 1;
      const s = audio.buffered.start(lastIdx);
      const e = audio.buffered.end(lastIdx);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        windowStart = s;
        windowEnd = e;
        isSeekable = true;
      }
    }
  } catch { /* some browsers throw when reading buffered too early */ }

  const windowSize = Math.max(0, windowEnd - windowStart);
  const current = Math.min(Math.max(audio.currentTime || 0, windowStart), windowEnd);
  const fmt = (sec: number) => {
    if (!Number.isFinite(sec)) return "--:--";
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };
  const fromLive = Math.max(0, windowEnd - current);

  const togglePlay = () => {
    if (audio.paused) {
      void audio.play().catch(() => { /* ignored */ });
    } else {
      audio.pause();
    }
  };
  const jumpToLive = () => {
    try { audio.currentTime = windowEnd; } catch { /* ignored */ }
    if (audio.paused) void audio.play().catch(() => { /* noop */ });
  };
  const onSlide = (vals: number[]) => {
    if (!isSeekable) return;
    const next = vals[0];
    if (typeof next !== "number" || !Number.isFinite(next)) return;
    try { audio.currentTime = Math.min(Math.max(next, windowStart), windowEnd); } catch { /* ignored */ }
  };

  const hasWindow = windowSize >= 2;

  return (
    <div className="mt-1.5 rounded border border-border/60 bg-background/40 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="shrink-0 rounded border border-border bg-background/60 hover:border-primary/60 hover:bg-primary/5 p-1 transition-colors"
          title={paused ? "Resume live ATIS (Space)" : "Pause live ATIS (Space)"}
          aria-label={paused ? "Resume live ATIS" : "Pause live ATIS"}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
        {hasWindow && isSeekable ? (
          <>
            <Slider
              value={[current]}
              min={windowStart}
              max={windowEnd}
              step={0.25}
              onValueChange={onSlide}
              className="flex-1"
              aria-label="Replay buffered ATIS audio"
            />
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
              -{fmt(fromLive)} / {fmt(windowSize)}
            </span>
            <button
              type="button"
              onClick={jumpToLive}
              disabled={fromLive < 1}
              className="shrink-0 rounded border border-border bg-background/60 hover:border-primary/60 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-default p-1 transition-colors"
              title="Jump back to live"
              aria-label="Jump back to live"
            >
              <Rewind className="h-3 w-3 rotate-180" />
            </button>
          </>
        ) : (
          <span className="flex-1 font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
            Live · buffering replay window…
          </span>
        )}
      </div>
      <div
        className="mt-1 font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground/80 select-none"
        title="Keyboard shortcuts active while tuned to ATIS"
      >
        <span className="hidden sm:inline">Shortcuts · </span>
        <kbd className="px-1 rounded border border-border/60 bg-background/60 font-mono text-[9px]">Space</kbd> Play/Pause
        <span className="mx-1 opacity-50">·</span>
        <kbd className="px-1 rounded border border-border/60 bg-background/60 font-mono text-[9px]">M</kbd> Mute
        <span className="mx-1 opacity-50">·</span>
        <kbd className="px-1 rounded border border-border/60 bg-background/60 font-mono text-[9px]">↑↓</kbd> Volume
      </div>
    </div>
  );
};
