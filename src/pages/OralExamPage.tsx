import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ArrowLeft, ChevronRight } from "lucide-react";
import { TrainingChat } from "@/components/TrainingChat";

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

const OralExamPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<typeof EXAM_TYPES[0] | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => selectedExam ? setSelectedExam(null) : navigate(user ? "/dashboard" : "/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
                SIM<span className="text-accent">PILOT</span>.AI
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <span className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">
              Oral Exam Prep
            </span>
          </div>
        </div>
      </nav>

      {/* Content */}
      {selectedExam ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border bg-secondary/30 px-6 py-3 shrink-0">
            <div className="container mx-auto flex items-center gap-3">
              <span className="text-2xl">{selectedExam.icon}</span>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">{selectedExam.title}</h2>
                <p className="text-xs text-muted-foreground">DPE Oral Examination Simulation</p>
              </div>
            </div>
          </div>
          <div className="flex-1 container mx-auto max-w-3xl min-h-0">
            <TrainingChat
              mode="oral_exam"
              placeholder="Answer the examiner's question..."
              welcomeMessage={`Ready for your ${selectedExam.title} oral exam? The DPE will evaluate your knowledge against ACS standards. Answer thoroughly and accurately.`}
              initialPrompt={selectedExam.prompt}
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
  );
};

export default OralExamPage;
