import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ArrowLeft, ChevronRight, Flame, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TrainingChat } from "@/components/TrainingChat";
import SEOHead from "@/components/SEOHead";
import type { CheckrideWeakArea } from "@/lib/checkrideReport";

const EXAM_TYPES = [
  {
    id: "ppl",
    title: "Private Pilot (PPL)",
    description: "Full oral exam simulation covering all ACS knowledge areas for the Private Pilot certificate.",
    icon: "🎓",
    prompt: "I'm preparing for my Private Pilot checkride oral exam. Act as a DPE and conduct a complete oral examination following the Private Pilot ACS. Start with introductions and preflight planning, then systematically cover all knowledge areas. Ask one question at a time and evaluate my answers. Begin now.",
  },
  {
    id: "instrument",
    title: "Instrument Rating (IR)",
    description: "Instrument rating oral exam covering IFR procedures, approaches, regulations, and weather.",
    icon: "🌐",
    prompt: "I'm preparing for my Instrument Rating checkride. Conduct a DPE oral exam following the Instrument Rating ACS. Cover IFR flight planning, regulations (91.167-91.193), approach procedures, lost comms, alternate requirements, and instrument failure scenarios. Be thorough and realistic.",
  },
  {
    id: "commercial",
    title: "Commercial Pilot (CPL)",
    description: "Commercial pilot oral exam covering advanced aerodynamics, operations, and commercial regulations.",
    icon: "💼",
    prompt: "I'm preparing for my Commercial Pilot checkride. Conduct a DPE oral exam following the Commercial Pilot ACS. Cover commercial privileges and limitations (Part 119, 135), advanced performance, complex/high-performance aircraft systems, emergency procedures, and commercial operations. Be strict but fair.",
  },
  {
    id: "cfi",
    title: "Flight Instructor (CFI)",
    description: "CFI oral exam simulation covering FOI, teaching methods, endorsements, and instructional knowledge.",
    icon: "👨‍✈️",
    prompt: "I'm preparing for my CFI Initial checkride. Conduct a DPE oral exam covering the Fundamentals of Instruction (FOI), teaching methods, learning theory, endorsement requirements, spin awareness, and instructional knowledge areas. Ask me to explain concepts as if I'm teaching a student. This is the hardest checkride — be thorough.",
  },
  {
    id: "quick-10",
    title: "Quick 10-Question Quiz",
    description: "A focused 10-question oral quiz on random FAA knowledge areas. Great for daily practice.",
    icon: "⚡",
    prompt: "Give me a quick 10-question oral exam quiz covering random Private Pilot ACS knowledge areas. Mix regulation questions, scenario-based questions, and 'what would you do' situations. Ask one question at a time. After all 10, give me a score and debrief. Start now.",
  },
  {
    id: "weak-areas",
    title: "Weak Area Drill",
    description: "Tell the examiner your weak areas and get targeted questioning to strengthen them.",
    icon: "🎯",
    prompt: "I want to practice my weak areas. Before we begin, ask me which specific topics or ACS areas I feel weakest in, and which certificate level I'm studying for. Then conduct a focused oral exam specifically targeting those areas with increasing difficulty.",
  },
];

type DrillState = {
  certificate?: string;
  stress_mode?: boolean;
  weak_areas: CheckrideWeakArea[];
};

const OralExamPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedExam, setSelectedExam] = useState<typeof EXAM_TYPES[0] | null>(null);
  const [stressMode, setStressMode] = useState(false);
  const [stressTimerSeconds, setStressTimerSeconds] = useState<30 | 60 | 90>(60);

  // Auto-launch a weak-areas drill if arriving from a Checkride Readiness Report
  useEffect(() => {
    const drill = (location.state as { drill?: DrillState } | null)?.drill;
    if (!drill || !drill.weak_areas?.length) return;

    const codeList = drill.weak_areas
      .map((w) => `[${w.acs_code}] ${w.topic} — prior issue: ${w.issue}`)
      .join("\n");

    const certLine = drill.certificate && drill.certificate !== "MIXED"
      ? `Certificate level: ${drill.certificate}.`
      : "";

    setSelectedExam({
      id: "weak-areas-drill",
      title: "Weak Area Drill (from prior report)",
      description: "Targeted DPE drill on the ACS task codes flagged in your last Checkride Readiness Report.",
      icon: "🎯",
      prompt: `Conduct a focused DPE oral drill targeting ONLY the following FAA ACS task codes the student previously struggled with. ${certLine} Ask 2–3 progressively harder questions per task code, including realistic scenarios. Hold the student strictly to ACS standards and demand "why" reasoning. At the end, generate a fresh Checkride Readiness Report (with the structured checkride-report JSON block) scoring ONLY these task codes.\n\nWeak ACS Task Codes:\n${codeList}`,
    });

    if (drill.stress_mode) setStressMode(true);
    // Clear state so refresh doesn't re-trigger
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
       <SEOHead
        title="AI Oral Exam Simulator — SimPilot.AI Checkride Prep"
        description="Practice your FAA checkride oral exam with SimPilot.AI's realistic AI examiner. Covers PPL, instrument, commercial, and CFI oral exams. Build confidence before your DPE appointment."
        keywords="oral exam simulator, checkride prep, DPE oral exam practice, private pilot oral, instrument rating oral, commercial pilot checkride, CFI oral exam, FAA practical test"
        canonical="/oral-exam"
        ogImage="/og-oral-exam.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          "name": "AI Oral Exam Simulator — SimPilot.AI",
          "description": "Practice FAA checkride oral exams with a realistic AI DPE examiner covering PPL, IR, CPL, and CFI certificates.",
          "url": "https://simpilot.ai/oral-exam",
          "provider": { "@type": "Organization", "name": "SimPilot.AI", "url": "https://simpilot.ai" },
          "educationalLevel": "Intermediate to Advanced",
          "about": [
            { "@type": "Thing", "name": "FAA Checkride Oral Exam" },
            { "@type": "Thing", "name": "DPE Oral Examination" }
          ]
        }}
      />
      <Navbar />

      {/* Content */}
      <div className="pt-20 flex-1 flex flex-col">
      {selectedExam ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border bg-secondary/30 px-6 py-3 shrink-0">
            <div className="container mx-auto flex items-center gap-3">
              <span className="text-2xl">{selectedExam.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-sm font-bold text-foreground">{selectedExam.title}</h2>
                  {stressMode && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 text-[10px] font-semibold uppercase tracking-wider">
                      <Flame className="w-3 h-3" /> Stress Mode · {stressTimerSeconds}s
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">DPE Oral Examination Simulation</p>
              </div>
              <button
                onClick={() => { setSelectedExam(null); }}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                ← Change exam
              </button>
            </div>
          </div>
          <div className="flex-1 container mx-auto max-w-3xl min-h-0">
            <TrainingChat
              mode="oral_exam"
              placeholder="Answer the examiner's question..."
              welcomeMessage={`Ready for your ${selectedExam.title} oral exam?${stressMode ? ` Stress Mode is ON — expect aggressive 'Why?' follow-ups with a ${stressTimerSeconds}s answer window.` : ""} The DPE will evaluate your knowledge against ACS standards.`}
              initialPrompt={selectedExam.prompt}
              stressMode={stressMode}
              stressTimerSeconds={stressTimerSeconds}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8 max-w-3xl">
            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Oral Exam Prep
              </h1>
              <p className="text-sm text-muted-foreground">
                Practice with a simulated DPE who will grill you on FAA knowledge areas just like the real checkride. 
                Choose your certificate level or try a quick quiz.
              </p>
            </div>

            {/* Stress Mode toggle + timer length */}
            <div
              className={`w-full mb-6 rounded-xl border transition-all ${
                stressMode
                  ? "bg-accent/10 border-accent/40 shadow-[0_0_20px_hsl(var(--amber-instrument)/0.15)]"
                  : "bg-secondary/30 border-border hover:border-accent/30"
              }`}
            >
              <button
                type="button"
                onClick={() => setStressMode((v) => !v)}
                className="w-full flex items-start gap-3 text-left p-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stressMode ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"}`}>
                  <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-foreground">Stress Mode</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${stressMode ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                      {stressMode ? "ON" : "OFF"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    DPE drills aggressive "Why?" follow-ups after every answer. Simulates worst-case checkride pressure so you're over-prepared.
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${stressMode ? "bg-accent" : "bg-muted"}`}>
                  <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform mt-0.5 ${stressMode ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </div>
              </button>

              {stressMode && (
                <div className="px-4 pb-4 -mt-1 flex items-center gap-3 flex-wrap border-t border-accent/20 pt-3">
                  <span className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
                    Answer Window
                  </span>
                  <div className="inline-flex rounded-lg border border-accent/30 bg-background/40 p-0.5">
                    {([30, 60, 90] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStressTimerSeconds(s)}
                        className={`px-3 py-1.5 text-xs font-display font-semibold tracking-wider uppercase rounded-md transition-all ${
                          stressTimerSeconds === s
                            ? "bg-accent text-accent-foreground shadow-[0_0_10px_hsl(var(--amber-instrument)/0.4)]"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-pressed={stressTimerSeconds === s}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {stressTimerSeconds === 30 ? "Brutal — instant recall only" : stressTimerSeconds === 60 ? "Realistic checkride pace" : "Generous — time to reason"}
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {EXAM_TYPES.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className="text-left bg-gradient-card rounded-xl border border-border hover:border-accent/40 p-5 transition-all group hover:shadow-[0_0_20px_hsl(var(--amber-instrument)/0.1)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{exam.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-bold text-foreground group-hover:text-accent transition-colors mb-1">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {exam.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
      <Footer />
    </div>
  );
};

export default OralExamPage;
