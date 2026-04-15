import { Check, X, Minus, Zap, Shield, Brain, BookOpen, Target, Award, Clock, TrendingUp, Mic, Cloud, Plane, GraduationCap, Users, Gamepad2, ChevronDown, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

/* ── Competitor data ── */
const competitors = [
  { name: "SimPilot.AI", tag: "All-in-One AI Platform", highlight: true },
  { name: "Sporty's", tag: "Video Course + AI" },
  { name: "King Schools", tag: "Video Course" },
  { name: "AI CFI", tag: "Mobile App" },
  { name: "TakeFlight", tag: "Sim Plugin" },
  { name: "Navi AI", tag: "Airline Focus" },
];

type FeatureVal = true | false | "partial";

interface FeatureRow {
  label: string;
  desc: string;
  icon: React.ElementType;
  values: FeatureVal[]; // order matches competitors array
}

//                                                   SimPilot  Sporty's  King   AI CFI  TakeFlight  Navi
const features: FeatureRow[] = [
  { label: "AI CFI Persona (Socratic Teaching)", desc: "Dedicated instructor persona that teaches — not just answers", icon: Brain, values: [true, "partial", false, "partial", false, false] },
  { label: "DPE Oral Exam Simulation", desc: "Structured checkride sim with scoring, debrief & pass/fail", icon: Target, values: [true, "partial", "partial", "partial", false, false] },
  { label: "HD Video Ground School", desc: "Professional video lessons with instructor-led content", icon: Video, values: [false, true, true, false, false, false] },
  { label: "Ground School Lessons (Text/AI)", desc: "Progressive structured lessons with AI-powered teaching", icon: BookOpen, values: [true, "partial", false, false, false, false] },
  { label: "FAR/AIM & ACS References", desc: "Cites specific regulations and ACS task codes in every answer", icon: Shield, values: [true, true, "partial", "partial", false, false] },
  { label: "FAA Written Test Prep", desc: "Practice questions and test prep for FAA knowledge exams", icon: GraduationCap, values: [true, true, true, true, false, false] },
  { label: "ATC Communication Training", desc: "Practice real radio phraseology and procedures", icon: Mic, values: [true, "partial", false, true, false, false] },
  { label: "Real-Time Weather Briefing", desc: "Live METAR/TAF integration with AI analysis", icon: Cloud, values: [true, false, false, false, false, false] },
  { label: "Flight Tracker (Live Sky)", desc: "Live flight tracking with real-world data", icon: Plane, values: [true, false, false, false, false, false] },
  { label: "Progress & Score Tracking", desc: "Track readiness across topics and mock exams over time", icon: TrendingUp, values: [true, true, "partial", false, false, false] },
  { label: "Session History & Review", desc: "Revisit past conversations and study sessions", icon: Clock, values: [true, false, false, false, false, false] },
  { label: "POH / Aircraft-Specific Grounding", desc: "Upload your POH for aircraft-specific answers", icon: Award, values: [true, false, false, false, false, false] },
  { label: "AI-Adaptive Learning", desc: "AI adjusts to your knowledge gaps — not static content", icon: Brain, values: [true, "partial", false, "partial", false, false] },
  { label: "Web-Based (No Install Required)", desc: "Works on any device with a browser — plus PWA support", icon: Zap, values: [true, true, true, false, false, true] },
  { label: "GA / Student Pilot Focus", desc: "Built specifically for general aviation training", icon: GraduationCap, values: [true, true, true, true, true, false] },
];

const CellIcon = ({ value }: { value: FeatureVal }) => {
  if (value === true)
    return (
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
      </div>
    );
  if (value === "partial")
    return (
      <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
        <Minus className="w-3.5 h-3.5 text-accent" strokeWidth={3} />
      </div>
    );
  return (
    <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center">
      <X className="w-3.5 h-3.5 text-destructive" strokeWidth={3} />
    </div>
  );
};

/* ── Advantage cards ── */
const advantages = [
  {
    icon: Brain,
    title: "Patient, Socratic CFI Voice",
    desc: "Unlike competitors that just spit out answers, SimPilot.AI uses the Socratic method — guiding you to discover answers yourself, just like a real CFI debrief.",
  },
  {
    icon: Target,
    title: "Only True Oral Exam Simulator",
    desc: "No other platform offers a full DPE-style oral exam simulation with adaptive questioning, real-time scoring, pass/fail determination, and detailed debriefs.",
  },
  {
    icon: Shield,
    title: "All-in-One Aviation Platform",
    desc: "Ground school, oral exam prep, ATC training, weather briefings, flight tracking, and progress analytics — all in one place. Competitors only cover one or two of these.",
  },
  {
    icon: Award,
    title: "Aircraft-Specific with POH Upload",
    desc: "Upload your Pilot's Operating Handbook and get answers grounded in your specific aircraft. No other AI training tool offers this level of personalization.",
  },
];

/* ── Who uses what ── */
const audiences = [
  {
    icon: GraduationCap,
    title: "Student Pilots",
    problem: "Need affordable, always-available ground training",
    solution: "SimPilot.AI provides 24/7 CFI-quality AI coaching at a fraction of the cost of extra dual instruction",
    competitors: "Sporty's & King Schools offer great video courses but no interactive AI coaching. AI CFI covers basics but lacks depth and structured exams",
  },
  {
    icon: Users,
    title: "Flight Schools",
    problem: "Students arrive unprepared to ground lessons",
    solution: "Assign SimPilot.AI as supplemental prep — students come ready, CFIs teach more efficiently",
    competitors: "Sporty's is course-locked with no institutional tools. King Schools is pure video. Neither offers adaptive AI for individual student gaps",
  },
  {
    icon: Gamepad2,
    title: "Sim Enthusiasts",
    problem: "Want realistic procedures without the price tag of real training",
    solution: "Turn your home sim into a learning tool with real procedures, ATC practice, and achievement tracking",
    competitors: "TakeFlight does maneuvers only; Sporty's & King require buying full courses just for ground knowledge",
  },
];

/* ── JSON-LD ── */
const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "SimPilot.AI vs Competitors — AI Pilot Training Comparison",
  url: "https://simpilot.ai/competitors",
  description: "Compare SimPilot.AI against Sporty's, King Schools, AI CFI, TakeFlight & Navi AI. See why SimPilot.AI is the most complete AI pilot training platform.",
};

const CompetitorsPage = () => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="SimPilot.AI vs Sporty's, King Schools & More — AI Pilot Training Comparison"
        description="Compare SimPilot.AI against Sporty's, King Schools, AI CFI, TakeFlight & Navi AI. The most complete AI-powered pilot training platform for GA pilots."
        keywords="SimPilot.AI competitors, AI pilot training comparison, SimPilot vs Sportys, SimPilot vs King Schools, AI CFI vs SimPilot, flight training AI tools, best AI for pilot training"
        canonical="/competitors"
        jsonLd={[pageJsonLd]}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 mb-6"
          >
            Market Comparison
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6"
          >
            How SimPilot.AI{" "}
            <span className="text-primary">Stacks Up</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8"
          >
            The AI pilot training market is growing — but no one else combines everything you need in a single platform. Here's the proof.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.3)] transition-all"
            >
              <Zap className="w-4 h-4" /> Try SimPilot.AI Free
            </Link>
            <a
              href="#comparison-matrix"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg border border-border text-foreground font-semibold text-sm hover:border-primary/40 transition-colors"
            >
              <ChevronDown className="w-4 h-4" /> View Full Comparison
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Key Advantages ── */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Makes SimPilot.AI <span className="text-primary">Different</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four capabilities no competitor can match — all in one platform.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {advantages.map((adv, i) => {
              const Icon = adv.icon;
              return (
                <motion.div
                  key={adv.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card/80 rounded-xl p-6 border border-border hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{adv.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{adv.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison Matrix ── */}
      <section id="comparison-matrix" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-5 py-2 rounded-full text-sm md:text-base font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 mb-6">
              Feature-by-Feature Competitor Comparison
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Feature-by-Feature <span className="text-primary">Comparison</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              <Check className="w-4 h-4 text-primary inline -mt-0.5" /> = Full support&nbsp;&nbsp;
              <Minus className="w-4 h-4 text-accent inline -mt-0.5" /> = Partial&nbsp;&nbsp;
              <X className="w-4 h-4 text-destructive inline -mt-0.5" /> = Not available
            </p>
          </motion.div>

          {/* Desktop table */}
          <div className="hidden lg:block max-w-6xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-[68px] z-40 bg-background/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-3 text-muted-foreground font-medium">Feature</th>
                  {competitors.map((c) => (
                    <th key={c.name} className="py-4 px-2 text-center">
                      <div className={`inline-flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${c.highlight ? "bg-primary/10 border border-primary/30" : "bg-secondary/60 border border-border/40"}`}>
                        <span className={`font-display text-xs font-bold tracking-wide ${c.highlight ? "text-primary" : "text-foreground"}`}>{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.tag}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.tr
                      key={f.label}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/30 hover:bg-secondary/10 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{f.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                          </div>
                        </div>
                      </td>
                      {f.values.map((v, vi) => (
                        <td key={vi} className="py-3 px-2 text-center">
                          <div className="flex justify-center">
                            <CellIcon value={v} />
                          </div>
                        </td>
                      ))}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile accordion */}
          <div className="lg:hidden max-w-lg mx-auto space-y-2">
            {features.map((f, i) => {
              const Icon = f.icon;
              const isOpen = expandedRow === i;
              return (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-xl border border-border/40 bg-card/60 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedRow(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{f.label}</p>
                    </div>
                    <CellIcon value={f.values[0]} />
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          <p className="text-xs text-muted-foreground">{f.desc}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {competitors.slice(1).map((c, ci) => (
                              <div key={c.name} className="flex items-center gap-2 text-xs">
                                <CellIcon value={f.values[ci + 1]} />
                                <span className="text-muted-foreground">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Audience Fit ── */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Right Tool for <span className="text-primary">Your Mission</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See why pilots, flight schools, and sim enthusiasts all choose SimPilot.AI.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {audiences.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card/80 rounded-xl p-6 border border-border hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">{a.title}</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-destructive/80 text-xs uppercase tracking-wider mb-1">The Problem</p>
                      <p className="text-muted-foreground">{a.problem}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">SimPilot.AI Solution</p>
                      <p className="text-muted-foreground">{a.solution}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-accent text-xs uppercase tracking-wider mb-1">Why Not Others?</p>
                      <p className="text-muted-foreground">{a.competitors}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Train Smarter?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of pilots who chose the most complete AI training platform. Start your free trial today — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.3)] transition-all"
              >
                <Zap className="w-4 h-4" /> Get Started Free
              </Link>
              <Link
                to="/why-simpilot"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:border-primary/40 transition-colors"
              >
                Learn More About SimPilot.AI
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CompetitorsPage;
