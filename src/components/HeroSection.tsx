import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import heroCockpit from "@/assets/hero-cockpit.jpg";
import heroCockpitMorning from "@/assets/hero-cockpit-morning.jpg";
import HeroChatBox from "@/components/HeroChatBox";
import HeroChatBoxBoundary from "@/components/HeroChatBoxBoundary";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PINNED_BRIDGE_VERSION,
  downloadAndVerifyInstaller,
  type DownloadProgress,
} from "@/lib/bridgeDownload";

const HeroSection = () => {
  const { resolvedTheme } = useTheme();
  const heroImage = resolvedTheme === "dark" ? heroCockpit : heroCockpitMorning;
  const heroAlt = resolvedTheme === "dark"
    ? "Aircraft cockpit view at sunset during flight — SimPilot.AI AI-powered pilot training platform hero image"
    : "Aircraft cockpit view on a bright morning flight — SimPilot.AI AI-powered pilot training platform hero image";

  // Verified-download state for the Hero CTA. Mirrors the BridgeSetupPage
  // flow so users can grab the pinned v1.0.0 installer without leaving the
  // home page (no new tab, no GitHub host UI).
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const isBusy =
    progress != null && progress.phase !== "done" && progress.phase !== "error" && progress.phase !== "idle";

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={heroAlt}
          title="Experience AI-powered pilot training with SimPilot.AI"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        <div className="absolute inset-0 scanline-overlay" />
      </div>

      {/* HUD decorative lines */}
      <div className="absolute top-1/4 left-0 right-0 hud-line opacity-40" />
      <div className="absolute top-3/4 left-0 right-0 hud-line opacity-20" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="font-display text-xs md:text-sm tracking-[0.3em] uppercase text-primary mb-6 text-glow-cyan">
            AI-Powered Flight Training
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4"
        >
          <span className="text-foreground">Your AI </span>
          <span className="text-primary text-glow-cyan">Co-Pilot</span>
          <br />
          <span className="text-foreground">for </span>
          <span className="text-accent text-glow-amber">Flight Mastery</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
        >
          Ask our AI flight instructor anything — ground school, checkride prep,
          ATC phraseology. Try it right now, no signup needed.
        </motion.p>

        {/* Embedded AI Chat */}
        <HeroChatBoxBoundary>
          <HeroChatBox />
        </HeroChatBoxBoundary>

        {/* SimPilot Bridge — verified direct download */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              disabled={isBusy}
              onClick={() => {
                setProgress({ phase: "resolving", percent: 0, message: "Starting…" });
                downloadAndVerifyInstaller({ onProgress: setProgress });
              }}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all font-semibold"
            >
              {isBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {isBusy ? "Preparing…" : "Download SimPilot Bridge"}
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-display text-[11px] font-semibold tracking-[0.18em] uppercase text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              v{PINNED_BRIDGE_VERSION} Stable
            </span>
          </div>

          {progress && progress.phase !== "idle" && (
            <div
              className={`w-full max-w-md rounded-md border p-3 text-left space-y-1.5 ${
                progress.phase === "error"
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border/60 bg-card/70 backdrop-blur-sm"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{progress.message}</span>
                <span className="font-mono text-muted-foreground">{progress.percent}%</span>
              </div>
              <Progress
                value={progress.phase === "error" ? 100 : progress.percent}
                className={`h-1.5 ${progress.phase === "error" ? "[&>div]:bg-destructive" : ""}`}
              />
              <p className="text-[10px] text-muted-foreground">
                Pinned v{PINNED_BRIDGE_VERSION} · SHA-512 verified in your browser · saved straight to your downloads folder
              </p>
            </div>
          )}
        </motion.div>


        {/* HUD-style stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-12 grid grid-cols-3 max-w-lg mx-auto gap-6"
        >
          {[
            { value: "500+", label: "Pilots Trained" },
            { value: "98%", label: "Success Rate" },
            { value: "24/7", label: "AI Support" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl font-bold text-primary text-glow-cyan">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
