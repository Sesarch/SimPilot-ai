import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, ArrowLeft, ChevronRight } from "lucide-react";
import { TrainingChat } from "@/components/TrainingChat";
import SEOHead from "@/components/SEOHead";
import groundSchoolLight from "@/assets/ground-school-light.jpg";
import groundSchoolDark from "@/assets/ground-school-dark.jpg";
import { LESSON_AREAS, type LessonArea } from "@/data/groundSchoolLessons";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import FeatureDisabledPage from "@/components/FeatureDisabledPage";
import { usePilotContext } from "@/hooks/usePilotContext";
import { TOPIC_TO_CATEGORY, type ReadinessCategoryKey } from "@/hooks/useReadiness";

const CATEGORY_LABELS: Record<ReadinessCategoryKey, string> = {
  regulations: "Regulations",
  weather: "Weather",
  navigation: "Navigation",
  aerodynamics: "Aerodynamics",
};

type CertLevel = "PPL" | "IR" | "CPL" | "ATP";
const CERT_OPTIONS: { value: CertLevel; label: string; sub: string; profile: string }[] = [
  { value: "PPL", label: "PPL", sub: "Private", profile: "Private Pilot (PPL)" },
  { value: "IR", label: "IR", sub: "Instrument", profile: "Instrument Rating (IR)" },
  { value: "CPL", label: "CPL", sub: "Commercial", profile: "Commercial Pilot (CPL)" },
  { value: "ATP", label: "ATP", sub: "Airline Transport", profile: "Airline Transport Pilot (ATP)" },
];

/** Map any profile certificate_type string back to one of our toggle values. */
function profileToCertLevel(value: string | null | undefined): CertLevel | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("atp") || v.includes("airline transport")) return "ATP";
  if (v.includes("instrument") || v === "ir") return "IR";
  if (v.includes("commercial") || v === "cpl") return "CPL";
  if (v.includes("private") || v === "ppl" || v.includes("student") || v.includes("sport") || v.includes("recreational")) return "PPL";
  return null;
}

const GroundSchoolPage = () => {
  const { settings } = useSiteSettings();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const pilotCtx = usePilotContext();
  const [selectedLesson, setSelectedLesson] = useState<LessonArea | null>(null);
  const [onlyRelevant, setOnlyRelevant] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") as ReadinessCategoryKey | null;
  const activeCategory: ReadinessCategoryKey | null =
    categoryParam && CATEGORY_LABELS[categoryParam] ? categoryParam : null;
  const clearCategory = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    setSearchParams(next, { replace: true });
  };

  // Auto-open a lesson via ?topic=<id> deep link
  useEffect(() => {
    const topicId = searchParams.get("topic");
    if (!topicId) return;
    const lesson = LESSON_AREAS.find((l) => l.id === topicId);
    if (lesson) {
      setSelectedLesson(lesson);
      const next = new URLSearchParams(searchParams);
      next.delete("topic");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive the active toggle value from the synced pilot context (profile + localStorage).
  // Defaults to PPL until the user picks one.
  const certLevel: CertLevel = useMemo(
    () => profileToCertLevel(pilotCtx.context.certificate_type) ?? "PPL",
    [pilotCtx.context.certificate_type]
  );

  const setCertLevel = (next: CertLevel) => {
    const opt = CERT_OPTIONS.find((o) => o.value === next)!;
    // Writes to localStorage always, and to profiles.certificate_type when signed in.
    pilotCtx.updateField("certificate_type", opt.profile);
  };

  const heroImage = resolvedTheme === "dark" ? groundSchoolDark : groundSchoolLight;

  if (!settings.ground_school_enabled) return <FeatureDisabledPage feature="Ground One-on-One" />;

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
        title="AI Ground One-on-One — SimPilot.AI Flight Training"
        description="Study for your FAA knowledge test with SimPilot.AI's AI-powered ground school. Covers aerodynamics, regulations, weather, navigation, and all ACS areas. Not FAA-approved — supplemental training only."
        keywords="AI ground school, FAA knowledge test prep, pilot ground school online, aerodynamics study, aviation weather training, ACS study guide, private pilot ground school"
        canonical="/ground-school"
        ogImage="/og-ground-school.jpg"
        noIndex
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          "name": "AI Ground One-on-One — SimPilot.AI",
          "description": "AI-powered ground school covering all FAA ACS knowledge areas for the Private Pilot certificate.",
          "url": "https://simpilot.ai/ground-school",
          "provider": { "@type": "Organization", "name": "SimPilot.AI", "url": "https://simpilot.ai" },
          "educationalLevel": "Beginner to Intermediate",
          "about": [
            { "@type": "Thing", "name": "FAA Knowledge Test" },
            { "@type": "Thing", "name": "Private Pilot Ground One-on-One" }
          ]
        }}
      />
      {/* Content */}
      <div className="flex-1 flex flex-col">
      {selectedLesson ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border bg-secondary/30 px-6 py-3 shrink-0">
            <div className="container mx-auto flex items-center gap-3">
              <button onClick={() => setSelectedLesson(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-2xl">{selectedLesson.icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-sm font-bold text-foreground">{selectedLesson.title}</h2>
                <p className="text-xs text-muted-foreground">ACS: {selectedLesson.acs} · Track: {certLevel}</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-display tracking-widest uppercase text-primary bg-primary/10 border border-primary/30 px-2 py-1 rounded">
                {certLevel} Depth
              </span>
            </div>
          </div>
          <div className="flex-1 container mx-auto max-w-3xl min-h-0">
            <TrainingChat
              key={`${selectedLesson.id}-${certLevel}`}
              mode="ground_school"
              placeholder="Type your answer or ask a question..."
              welcomeMessage={`Ready to study ${selectedLesson.title} at the ${certLevel} level? Your CFI-AI instructor will guide you through this ACS knowledge area using the Socratic method.`}
              initialPrompt={`${selectedLesson.prompt}\n\n(Tailor depth and examples to a ${certLevel} candidate.)`}
              topicId={selectedLesson.id}
              certificateOverride={certLevel}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Aviation study materials — Ground One-on-One background"
              width={1920}
              height={1080}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/75 to-background" />
          </div>
          <div className="container mx-auto px-6 py-8 max-w-3xl relative z-10">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Ground One-on-One Lessons
              </h1>
              <p className="text-sm text-muted-foreground">
                Select a knowledge area to begin an interactive lesson with your CFI-AI instructor.
                Each lesson follows FAA Airman Certification Standards (ACS).
              </p>
            </div>

            {/* Certificate Level Toggle — global state shared across all 19 lessons */}
            <div className="mb-6 bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4">
              <div className="mb-3">
                <p className="font-display text-xs font-bold tracking-widest uppercase text-foreground">
                  Study Track
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sets the ACS depth your CFI-AI uses for every lesson.
                </p>
              </div>
              <div role="radiogroup" aria-label="Certificate level" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CERT_OPTIONS.map((opt) => {
                  const active = certLevel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setCertLevel(opt.value)}
                      className={`px-3 py-2.5 rounded-lg border transition-all text-center ${
                        active
                          ? "bg-primary/15 border-primary text-foreground shadow-[0_0_15px_hsl(var(--cyan-glow)/0.2)]"
                          : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      <div className="font-display text-sm font-bold tracking-wider">{opt.label}</div>
                      <div className="text-[10px] uppercase tracking-widest opacity-80">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeCategory && (
              <div className="mb-3 flex items-center justify-between gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-display text-[10px] tracking-[0.25em] uppercase text-primary">
                    Filtered
                  </span>
                  <span className="text-sm text-foreground truncate">
                    {CATEGORY_LABELS[activeCategory]} topics only
                  </span>
                </div>
                <button
                  onClick={clearCategory}
                  className="font-display text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  Clear ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Items not in your <span className="text-foreground font-display tracking-wider">{certLevel}</span> track are dimmed.
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyRelevant}
                  onChange={(e) => setOnlyRelevant(e.target.checked)}
                  className="accent-primary"
                />
                Only show {certLevel}
              </label>
            </div>

            <div className="space-y-3">
              {LESSON_AREAS
                .filter((l) => !onlyRelevant || l.levels.includes(certLevel))
                .filter((l) => !activeCategory || TOPIC_TO_CATEGORY[l.id] === activeCategory)
                .map((lesson) => {
                const relevant = lesson.levels.includes(certLevel);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left bg-gradient-card rounded-xl border p-5 transition-all group ${
                      relevant
                        ? "border-border hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.1)]"
                        : "border-border/50 opacity-50 hover:opacity-90 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{lesson.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {lesson.title}
                          </h3>
                          <span className="text-[10px] font-display tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {lesson.acs}
                          </span>
                          <div className="flex items-center gap-1">
                            {lesson.levels.map((lvl) => (
                              <span
                                key={lvl}
                                className={`text-[10px] font-display tracking-widest px-1.5 py-0.5 rounded border ${
                                  lvl === certLevel
                                    ? "bg-primary/15 text-primary border-primary/40"
                                    : "bg-secondary/50 text-muted-foreground border-border"
                                }`}
                              >
                                {lvl}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {lesson.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GroundSchoolPage;
