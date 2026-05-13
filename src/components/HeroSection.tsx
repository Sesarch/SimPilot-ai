import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Info, ExternalLink } from "lucide-react";
import heroCockpit from "@/assets/hero-cockpit.jpg";
import heroCockpitMorning from "@/assets/hero-cockpit-morning.jpg";
import HeroChatBox from "@/components/HeroChatBox";
import HeroChatBoxBoundary from "@/components/HeroChatBoxBoundary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const HeroSection = () => {
  const { resolvedTheme } = useTheme();
  const heroImage = resolvedTheme === "dark" ? heroCockpit : heroCockpitMorning;
  const heroAlt = resolvedTheme === "dark"
    ? "Aircraft cockpit view at sunset during flight — SimPilot.AI AI-powered pilot training platform hero image"
    : "Aircraft cockpit view on a bright morning flight — SimPilot.AI AI-powered pilot training platform hero image";

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
          className="font-display text-4xl md:text-6xl lg:text-7xl leading-tight mb-4"
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

        {/* HUD-style stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-12 grid grid-cols-3 max-w-lg mx-auto gap-6"
        >
          {[
            {
              value: "674K",
              label: "Pilots Needed by 2043",
              source: "Boeing Pilot & Technician Outlook 2024",
              href: "https://www.boeing.com/commercial/market/pilot-technician-outlook",
              definition:
                "New commercial pilots Boeing forecasts the global civil aviation industry will need to hire over the 20-year period from 2024 through 2043 to crew its growing widebody, narrowbody, regional, and freighter fleet.",
              population: "Global commercial airline pilots",
              timeframe: "2024–2043 (20-year forecast)",
            },
            {
              value: "90%",
              label: "FAA Written Pass Rate",
              source: "FAA Airman Testing Statistics",
              href: "https://www.faa.gov/training_testing/testing/airman_test_statistics",
              definition:
                "Approximate first-attempt pass rate published by the FAA for the Private Pilot Airplane (PAR) airman knowledge test, where a score of 70% or higher is required to pass.",
              population: "U.S. private pilot knowledge-test applicants",
              timeframe: "Most recent FAA reporting period (rolling 12 months)",
            },
            {
              value: "24/7",
              label: "AI Support",
              source: "SimPilot.AI service availability",
              href: null as string | null,
              definition:
                "SimPilot.AI's AI flight instructor is available around the clock, every day of the year, subject to scheduled maintenance windows.",
              population: "All SimPilot.AI users",
              timeframe: "Continuous service",
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl text-primary text-glow-cyan">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {stat.label}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`What does ${stat.value} ${stat.label} mean?`}
                    className="inline-flex items-center gap-1 mt-1 text-[10px] tracking-wider uppercase text-muted-foreground/70 hover:text-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded px-1 transition-colors duration-200"
                  >
                    <Info className="w-3 h-3" aria-hidden="true" />
                    <span>Source</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="center"
                  sideOffset={8}
                  collisionPadding={12}
                  avoidCollisions
                  className="w-[calc(100vw-1.5rem)] max-w-[20rem] sm:w-80 text-left p-3 sm:p-4 max-h-[70vh] overflow-y-auto break-words"
                >
                  <div className="space-y-2">
                    <p className="font-display text-[11px] sm:text-xs tracking-wider uppercase text-primary break-words">
                      {stat.value} — {stat.label}
                    </p>
                    <p className="text-xs text-foreground leading-relaxed normal-case">
                      {stat.definition}
                    </p>
                    <dl className="text-[11px] text-muted-foreground space-y-1 normal-case">
                      <div className="flex flex-col sm:flex-row sm:gap-1">
                        <dt className="font-medium text-foreground/80 shrink-0">Population:</dt>
                        <dd className="break-words">{stat.population}</dd>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:gap-1">
                        <dt className="font-medium text-foreground/80 shrink-0">Timeframe:</dt>
                        <dd className="break-words">{stat.timeframe}</dd>
                      </div>
                    </dl>
                    {stat.href ? (
                      <a
                        href={stat.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1 text-xs text-accent hover:underline underline-offset-2 normal-case pt-1 break-words"
                      >
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        {stat.source}
                      </a>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic normal-case pt-1">
                        {stat.source}
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
