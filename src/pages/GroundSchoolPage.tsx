import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, ArrowLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TrainingChat } from "@/components/TrainingChat";
import SEOHead from "@/components/SEOHead";
import groundSchoolLight from "@/assets/ground-school-light.jpg";
import groundSchoolDark from "@/assets/ground-school-dark.jpg";
import { LESSON_AREAS, type LessonArea } from "@/data/groundSchoolLessons";

const GroundSchoolPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [selectedLesson, setSelectedLesson] = useState<LessonArea | null>(null);
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
        ogImage="/og-ground-school.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          "name": "AI Ground School — SimPilot.AI",
          "description": "AI-powered ground school covering all FAA ACS knowledge areas for the Private Pilot certificate.",
          "url": "https://simpilot.ai/ground-school",
          "provider": { "@type": "Organization", "name": "SimPilot.AI", "url": "https://simpilot.ai" },
          "educationalLevel": "Beginner to Intermediate",
          "about": [
            { "@type": "Thing", "name": "FAA Knowledge Test" },
            { "@type": "Thing", "name": "Private Pilot Ground School" }
          ]
        }}
      />
      <Navbar />

      {/* Content */}
      <div className="pt-20 flex-1 flex flex-col">
      {selectedLesson ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border bg-secondary/30 px-6 py-3 shrink-0">
            <div className="container mx-auto flex items-center gap-3">
              <button onClick={() => setSelectedLesson(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
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
        <div className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Aviation study materials — Ground School background"
              width={1920}
              height={1080}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/75 to-background" />
          </div>
          <div className="container mx-auto px-6 py-8 max-w-3xl relative z-10">
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
      <Footer />
  );
};

export default GroundSchoolPage;
