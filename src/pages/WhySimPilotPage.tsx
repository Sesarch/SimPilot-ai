import { Check, X, Zap, Brain, Target, Shield, BookOpen, Award, GraduationCap, Clock, Users, Plane, MessageSquare, TrendingUp, HeadphonesIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import AnimatedChatDemo from "@/components/AnimatedChatDemo";

/* ── Comparison data ── */
const comparisonFeatures = [
  { label: "Dedicated CFI Persona", desc: "8,000+ hr Gold Seal instructor who teaches — not just answers", simpilot: true, general: false, icon: Award },
  { label: "Socratic Teaching Method", desc: "Guides you to discover answers, just like a real CFI debrief", simpilot: true, general: false, icon: Brain },
  { label: "FAR/AIM & ACS References", desc: "Every answer cites specific regulations and ACS task codes", simpilot: true, general: false, icon: BookOpen },
  { label: "DPE Oral Exam Simulation", desc: "Structured checkride sim with scoring, debrief & pass/fail", simpilot: true, general: false, icon: Target },
  { label: "Ground School Lessons", desc: "Progressive lessons with progress tracking & comprehension checks", simpilot: true, general: false, icon: Zap },
  { label: "Aviation Safety Focus", desc: "Never compromises on accuracy; redirects medical/legal questions", simpilot: true, general: false, icon: Shield },
  { label: "Progress & Score Tracking", desc: "Track your readiness across topics and mock exams over time", simpilot: true, general: false, icon: TrendingUp },
  { label: "Session History & Review", desc: "Revisit past conversations and study sessions anytime", simpilot: true, general: false, icon: Clock },
];

/* ── Use cases ── */
const useCases = [
  {
    icon: GraduationCap,
    title: "Student Pilots",
    description: "Preparing for your private, instrument, or commercial certificate? SimPilot.AI walks you through every ACS area of operation — aerodynamics, weather, regulations, navigation, and more — at your own pace, 24/7.",
    highlight: "Pass your checkride on the first attempt",
  },
  {
    icon: Plane,
    title: "CFI Candidates",
    description: "Sharpen your ability to explain complex concepts. SimPilot.AI challenges your fundamentals of instructing knowledge and helps you practice scenario-based teaching before your CFI checkride.",
    highlight: "Practice teaching before your students do",
  },
  {
    icon: Users,
    title: "Flight Schools",
    description: "Supplement your ground school curriculum with AI-powered study tools. Students come to lessons better prepared, and your CFIs spend less time re-teaching fundamentals.",
    highlight: "Boost student pass rates and reduce re-takes",
  },
  {
    icon: HeadphonesIcon,
    title: "Busy Professionals",
    description: "Juggling a full-time job and flight training? Study at 2 AM, on your lunch break, or whenever you have a free moment. SimPilot.AI fits your schedule — not the other way around.",
    highlight: "Train on your schedule, not your CFI's",
  },
  {
    icon: MessageSquare,
    title: "Oral Exam Prep",
    description: "The oral exam is the most stressful part of the checkride. SimPilot.AI simulates realistic DPE-style questioning, scores your performance, and delivers a detailed debrief with areas to improve.",
    highlight: "Walk into your checkride confident",
  },
  {
    icon: TrendingUp,
    title: "Continuous Learning",
    description: "Already rated? Stay sharp with scenario-based reviews, regulation refreshers, and new topics. Aviation knowledge is perishable — keep yours current without booking extra dual time.",
    highlight: "Stay proficient between flight reviews",
  },
];

/* ── Testimonials (extended set) ── */
const testimonials = [
  { name: "Marcus T.", role: "Private Pilot Student", content: "SimPilot.AI completely changed how I prepare for my oral exam. The AI tutor explains complex aerodynamics concepts in a way that finally clicks. I passed my checkride on the first attempt!", rating: 5, initials: "MT" },
  { name: "Sarah K.", role: "Instrument Rating Candidate", content: "The oral exam simulator is incredibly realistic. It threw curveballs at me just like my actual DPE did. I felt so much more confident walking into my checkride.", rating: 5, initials: "SK" },
  { name: "James R.", role: "Commercial Pilot Student", content: "Being able to drill into weather theory and regulations at 2 AM when I can't sleep is priceless. The ground school module is a lifesaver for busy schedules.", rating: 5, initials: "JR" },
  { name: "Emily W.", role: "CFI Candidate", content: "I use SimPilot.AI to practice explaining concepts to students. The AI challenges my understanding and helps me find gaps in my knowledge before my students do.", rating: 4, initials: "EW" },
  { name: "David L.", role: "Sport Pilot", content: "Even as a sport pilot, the fundamentals training here is top-notch. The bite-sized lessons fit perfectly into my busy schedule, and the progress tracking keeps me motivated.", rating: 5, initials: "DL" },
  { name: "Patricia N.", role: "Flight School Owner", content: "I recommend SimPilot.AI to all my students as a supplemental study tool. It reinforces what we cover in ground school and helps them come to lessons better prepared.", rating: 5, initials: "PN" },
  { name: "Robert H.", role: "ATP Candidate", content: "The depth of knowledge SimPilot.AI covers is impressive. From complex systems to high-altitude aerodynamics, it helped me prepare for the most advanced certificate level.", rating: 5, initials: "RH" },
  { name: "Lisa M.", role: "Private Pilot Student", content: "I was terrified of the oral exam. After a week of practicing with SimPilot.AI, I actually started to enjoy the process. The Socratic method really makes you think.", rating: 5, initials: "LM" },
];

/* ── JSON-LD ── */
const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Why SimPilot.AI — Purpose-Built AI for Pilot Training",
  url: "https://simpilot.ai/why-simpilot",
  description: "Discover why SimPilot.AI is different from general AI chatbots. Purpose-built for pilot training with FAA references, oral exam simulation, and Socratic teaching.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "How is SimPilot.AI different from ChatGPT for pilot training?", acceptedAnswer: { "@type": "Answer", text: "SimPilot.AI is purpose-built for aviation training with a dedicated CFI persona, Socratic teaching method, FAR/AIM references, and structured oral exam simulations — features that general AI chatbots don't offer." } },
    { "@type": "Question", name: "Can I use SimPilot.AI for checkride preparation?", acceptedAnswer: { "@type": "Answer", text: "Yes. SimPilot.AI simulates realistic DPE-style oral exams with scoring, pass/fail determinations, and detailed debriefs to help you prepare for your checkride." } },
    { "@type": "Question", name: "Is SimPilot.AI a replacement for a real flight instructor?", acceptedAnswer: { "@type": "Answer", text: "No. SimPilot.AI is a supplemental training tool designed to complement instruction from certified flight instructors. It is not FAA-approved." } },
  ],
};

const WhySimPilotPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Why SimPilot.AI — Purpose-Built AI Pilot Training vs General AI"
        description="See why SimPilot.AI beats general AI chatbots for pilot training. Dedicated CFI persona, Socratic teaching, FAR/AIM references, oral exam simulation, and more."
        keywords="SimPilot.AI vs ChatGPT, AI pilot training comparison, why SimPilot.AI, aviation AI, pilot training tool, checkride prep AI"
        canonical="/why-simpilot"
        jsonLd={[pageJsonLd, faqJsonLd]}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[140px]" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 mb-6"
          >
            Why SimPilot.AI
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6"
          >
            General AI Answers Questions.{" "}
            <span className="text-primary">SimPilot.AI Teaches You to Fly.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8"
          >
            ChatGPT, Gemini, and Claude are powerful — but they weren't designed
            to train pilots. SimPilot.AI is the only AI built from the ground up
            as your personal CFI.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/auth"
              title="Start your free SimPilot.AI pilot training trial"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.3)] transition-all"
            >
              <Zap className="w-4 h-4" /> Get Started Free
            </Link>
            <a
              href="#comparison-detail"
              title="View detailed comparison between SimPilot.AI and general AI"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg border border-border text-foreground font-semibold text-sm hover:border-primary/40 transition-colors"
            >
              See the Comparison
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Animated Demo ── */}
      <AnimatedChatDemo />

      {/* ── Detailed Comparison ── */}
      <section id="comparison-detail" className="py-20 bg-secondary/20" aria-labelledby="comparison-detail-heading">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 id="comparison-detail-heading" className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Feature-by-Feature Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Here's exactly what you get with SimPilot.AI that general-purpose AI simply can't deliver.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_140px_140px] gap-2 md:gap-4 items-end mb-3 px-4">
              <div />
              <div className="text-center">
                <div className="inline-flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30">
                  <span className="font-display text-xs md:text-sm font-bold text-primary tracking-wide">SimPilot.AI</span>
                </div>
              </div>
              <div className="text-center">
                <div className="inline-flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-secondary/60 border border-border/40">
                  <span className="font-display text-xs md:text-sm font-medium text-muted-foreground tracking-wide">General AI</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {comparisonFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.06 * i }}
                    className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_140px_140px] gap-2 md:gap-4 items-center rounded-xl px-4 py-3 bg-card/60 border border-border/30 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{f.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{f.desc}</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center" aria-label="SimPilot.AI includes this feature">
                        <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center" aria-label="General AI does not include this feature">
                        <X className="w-4 h-4 text-destructive" strokeWidth={3} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="py-20" aria-labelledby="use-cases-heading">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 id="use-cases-heading" className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Built for Every Pilot's Journey
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're a first-time student or a flight school owner, SimPilot.AI adapts to your needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <motion.div
                  key={uc.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.08 * i }}
                >
                  <Card className="h-full bg-card border-border hover:border-primary/30 transition-colors group">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground">{uc.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{uc.description}</p>
                      <p className="text-xs font-semibold text-primary">{uc.highlight}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-secondary/30" aria-labelledby="testimonials-heading">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 id="testimonials-heading" className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pilots Who Made the Switch
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hear from students and instructors who chose purpose-built AI over generic chatbots.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.06 * i }}
              >
                <Card className="h-full bg-card border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <Quote className="h-5 w-5 text-primary/40" />
                    <p className="text-secondary-foreground text-xs leading-relaxed flex-1">"{t.content}"</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s < t.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">{t.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Train with a Real AI CFI?
            </h2>
            <p className="text-muted-foreground mb-8">
              Stop asking generic AI about aviation. Start training with an AI that was built to teach pilots.
            </p>
            <Link
              to="/auth"
              title="Sign up for SimPilot.AI — purpose-built AI pilot training"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_30px_hsl(var(--cyan-glow)/0.3)] transition-all"
            >
              <Zap className="w-5 h-5" /> Start Training Free
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WhySimPilotPage;
