import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, ArrowLeft, ChevronRight } from "lucide-react";
import { TrainingChat } from "@/components/TrainingChat";
import SEOHead from "@/components/SEOHead";
import groundSchoolLight from "@/assets/ground-school-light.jpg";
import groundSchoolDark from "@/assets/ground-school-dark.jpg";

const LESSON_AREAS = [
  {
    id: "regulations",
    title: "Regulations & Pilot Qualifications",
    acs: "PA.I.A",
    description: "14 CFR Parts 1, 61, 91 — Airman certificates, privileges, limitations, and regulatory requirements.",
    icon: "📋",
    prompt: "I want to study FAA regulations and pilot qualifications for my Private Pilot certificate. Start with an overview of 14 CFR Part 61 and Part 91, then quiz me using Socratic questioning. Cover certificates, privileges, limitations, currency requirements, and required documents (ARROW).",
  },
  {
    id: "airworthiness",
    title: "Airworthiness Requirements",
    acs: "PA.I.B",
    description: "Aircraft documentation, required inspections (AVIATE/AV1ATES), MEL, and airworthiness directives.",
    icon: "🔧",
    prompt: "Teach me about airworthiness requirements for the private pilot ACS. Cover required aircraft documents, inspection requirements (Annual, 100-hour, ADs, VOR checks, Transponder, ELT, Static system), and when an aircraft is considered airworthy. Use the ARROW and AV1ATES mnemonics.",
  },
  {
    id: "weather",
    title: "Weather Theory & Services",
    acs: "PA.I.C",
    description: "Atmospheric science, weather hazards, METARs, TAFs, AIRMETs/SIGMETs, and weather decision making.",
    icon: "🌦️",
    prompt: "Let's study aviation weather for my Private Pilot ground school. Cover atmospheric stability, cloud formation, fronts, thunderstorms, icing, fog types, and how to read METARs and TAFs. Use Socratic method — ask me questions as we go. Reference ACS area PA.I.C.",
  },
  {
    id: "performance",
    title: "Performance & Limitations",
    acs: "PA.I.E",
    description: "Weight and balance, takeoff/landing performance, density altitude, and aircraft limitations.",
    icon: "📊",
    prompt: "Teach me aircraft performance and limitations. Cover weight and balance calculations, density altitude effects, takeoff and landing performance charts, and how to interpret the POH performance section. Start with why density altitude matters and quiz me on calculations.",
  },
  {
    id: "navigation",
    title: "Navigation & Flight Planning",
    acs: "PA.I.F",
    description: "Pilotage, dead reckoning, VOR/GPS navigation, sectional charts, and cross-country planning.",
    icon: "🧭",
    prompt: "I want to learn navigation and cross-country flight planning. Cover pilotage, dead reckoning, VOR navigation, GPS basics, how to read sectional charts, and the complete cross-country planning process. Use the Socratic method and reference ACS area PA.I.F.",
  },
  {
    id: "aerodynamics",
    title: "Aerodynamics & Principles of Flight",
    acs: "PA.I.G",
    description: "Four forces, lift theory, stalls, load factor, turning tendency, ground effect, and stability.",
    icon: "✈️",
    prompt: "Let's study aerodynamics and principles of flight. Cover the four forces, how lift is generated, angle of attack, stalls (types and recovery), load factor, maneuvering speed, left turning tendencies (PLAT), ground effect, and aircraft stability. Use Socratic questioning throughout.",
  },
  {
    id: "airport-ops",
    title: "Airport Operations & Airspace",
    acs: "PA.I.H / PA.I.I",
    description: "Airport signs, markings, lighting, CTAF procedures, and National Airspace System.",
    icon: "🛬",
    prompt: "Teach me airport operations and the National Airspace System. Cover runway markings, taxiway signs, airport lighting (VASI/PAPI), CTAF procedures, and then all airspace classes (A through G) with their VFR weather minimums (3-152 / 1-SCT). Use mnemonics and quiz me.",
  },
  {
    id: "adm",
    title: "Aeronautical Decision Making",
    acs: "PA.I.J",
    description: "ADM process, DECIDE model, PAVE checklist, IMSAFE, hazardous attitudes, CRM, and risk management.",
    icon: "🧠",
    prompt: "Let's study Aeronautical Decision Making (ADM) and risk management. Cover the DECIDE model, PAVE checklist, IMSAFE checklist, 5 hazardous attitudes and their antidotes, CRM principles, and scenario-based risk assessment. This is critical for the ACS — use real scenarios to teach.",
  },
  {
    id: "emergencies",
    title: "Emergency Procedures",
    acs: "PA.IX",
    description: "Engine failures, system malfunctions, emergency equipment, lost procedures, and survival.",
    icon: "🚨",
    prompt: "Teach me emergency procedures for the private pilot. Cover engine failure (during takeoff, cruise, approach), electrical failures, vacuum system failure, emergency landings, lost procedures, emergency communications (121.5), and ELT operation. Present scenarios and ask what I would do.",
  },
  {
    id: "atc-comms",
    title: "ATC Communications",
    acs: "PA.I.K",
    description: "Radio phraseology, phonetic alphabet, frequency management, and proper ATC communication procedures.",
    icon: "📻",
    prompt: "I want to practice ATC communications and radio phraseology. Teach me the phonetic alphabet, proper call-up procedures, how to communicate at towered and non-towered airports, flight following requests, and ATIS interpretation. Give me practice scripts and scenarios.",
  },
];

const GroundSchoolPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [selectedLesson, setSelectedLesson] = useState<typeof LESSON_AREAS[0] | null>(null);
  const heroImage = resolvedTheme === "dark" ? groundSchoolDark : groundSchoolLight;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="AI Ground School — SimPilot.AI Flight Training"
        description="Study for your FAA knowledge test with SimPilot.AI's AI-powered ground school. Covers aerodynamics, regulations, weather, navigation, and all ACS areas. Not FAA-approved — supplemental training only."
        keywords="AI ground school, FAA knowledge test prep, pilot ground school online, aerodynamics study, aviation weather training, ACS study guide, private pilot ground school"
        canonical="/ground-school"
      />
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => selectedLesson ? setSelectedLesson(null) : navigate(user ? "/dashboard" : "/")}
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
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">
              Ground School
            </span>
          </div>
        </div>
      </nav>

      {/* Content */}
      {selectedLesson ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border bg-secondary/30 px-6 py-3 shrink-0">
            <div className="container mx-auto flex items-center gap-3">
              <span className="text-2xl">{selectedLesson.icon}</span>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">{selectedLesson.title}</h2>
                <p className="text-xs text-muted-foreground">ACS: {selectedLesson.acs}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 container mx-auto max-w-3xl min-h-0">
            <TrainingChat
              mode="ground_school"
              placeholder="Type your answer or ask a question..."
              welcomeMessage={`Ready to study ${selectedLesson.title}? Your CFI-AI instructor will guide you through this ACS knowledge area using the Socratic method.`}
              initialPrompt={selectedLesson.prompt}
              topicId={selectedLesson.id}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8 max-w-3xl">
            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Ground School Lessons
              </h1>
              <p className="text-sm text-muted-foreground">
                Select a knowledge area to begin an interactive lesson with your CFI-AI instructor. 
                Each lesson follows FAA Airman Certification Standards (ACS).
              </p>
            </div>

            <div className="space-y-3">
              {LESSON_AREAS.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className="w-full text-left bg-gradient-card rounded-xl border border-border hover:border-primary/40 p-5 transition-all group hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.1)]"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{lesson.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {lesson.title}
                        </h3>
                        <span className="text-[10px] font-display tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {lesson.acs}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {lesson.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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

export default GroundSchoolPage;
