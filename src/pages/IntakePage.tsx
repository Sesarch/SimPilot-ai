import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, GraduationCap, Plane, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

type Audience = "pilot" | "school";

interface FormState {
  audience: Audience | null;
  // contact
  contact_name: string;
  contact_email: string;
  phone: string;
  // school
  school_name: string;
  estimated_seats: string;
  preferred_start_date: string;
  // training
  certificate_type: string;
  rating_focus: string;
  aircraft_type: string;
  flight_hours: string;
  region: string;
  proficiency: string;
  training_goals: string;
  timeline: string;
}

const initial: FormState = {
  audience: null,
  contact_name: "",
  contact_email: "",
  phone: "",
  school_name: "",
  estimated_seats: "",
  preferred_start_date: "",
  certificate_type: "",
  rating_focus: "",
  aircraft_type: "",
  flight_hours: "",
  region: "",
  proficiency: "",
  training_goals: "",
  timeline: "",
};

const certificateOptions = ["Student", "Sport/Recreational", "Private (PPL)", "Instrument (IR)", "Commercial (CPL)", "ATP", "CFI/CFII"];
const ratingOptions = ["PPL", "Instrument", "Commercial", "Multi-Engine", "CFI", "ATP", "Type Rating"];
const proficiencyOptions = [
  { value: "beginner", label: "Just starting" },
  { value: "building", label: "Building hours" },
  { value: "proficient", label: "Proficient" },
  { value: "checkride-ready", label: "Checkride ready" },
];
const timelineOptions = ["< 1 month", "1–3 months", "3–6 months", "6–12 months", "Exploring"];

const intakeSchema = z.object({
  audience: z.enum(["pilot", "school"]),
  contact_name: z.string().trim().min(1, "Name is required").max(100),
  contact_email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  school_name: z.string().trim().max(120).optional().or(z.literal("")),
  estimated_seats: z.string().optional(),
  preferred_start_date: z.string().optional(),
  certificate_type: z.string().max(60).optional().or(z.literal("")),
  rating_focus: z.string().max(60).optional().or(z.literal("")),
  aircraft_type: z.string().trim().max(80).optional().or(z.literal("")),
  flight_hours: z.string().optional(),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  proficiency: z.string().max(40).optional().or(z.literal("")),
  training_goals: z.string().trim().max(2000, "Keep under 2000 chars").optional().or(z.literal("")),
  timeline: z.string().max(40).optional().or(z.literal("")),
});

const IntakePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isSchool = form.audience === "school";

  const steps = useMemo(() => {
    const base = ["Audience", "Contact", "Training profile", "Goals", "Review"];
    return base;
  }, []);

  const canProceed = useMemo(() => {
    if (step === 0) return form.audience !== null;
    if (step === 1) {
      if (!form.contact_name.trim() || !form.contact_email.trim()) return false;
      if (isSchool && !form.school_name.trim()) return false;
      return true;
    }
    return true;
  }, [step, form, isSchool]);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const parsed = intakeSchema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Please review your answers",
        description: parsed.error.errors[0]?.message ?? "Some fields look invalid.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const id = crypto.randomUUID();
      const seats = form.estimated_seats ? parseInt(form.estimated_seats, 10) : null;
      const hours = form.flight_hours ? parseInt(form.flight_hours, 10) : null;

      const { error } = await supabase.from("intakes").insert({
        id,
        user_id: user?.id ?? null,
        audience: form.audience!,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        school_name: isSchool ? form.school_name.trim() || null : null,
        estimated_seats: isSchool ? (Number.isFinite(seats!) ? seats : null) : null,
        preferred_start_date: isSchool && form.preferred_start_date ? form.preferred_start_date : null,
        certificate_type: form.certificate_type || null,
        rating_focus: form.rating_focus || null,
        aircraft_type: form.aircraft_type.trim() || null,
        flight_hours: Number.isFinite(hours!) ? hours : null,
        region: form.region.trim() || null,
        proficiency: form.proficiency || null,
        training_goals: form.training_goals.trim() || null,
        timeline: form.timeline || null,
      });
      if (error) throw error;

      // Prefill profile for logged-in pilots
      if (user && form.audience === "pilot") {
        const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (form.certificate_type) profileUpdate.certificate_type = form.certificate_type;
        if (form.aircraft_type.trim()) profileUpdate.aircraft_type = form.aircraft_type.trim();
        if (form.rating_focus) profileUpdate.rating_focus = form.rating_focus;
        if (form.region.trim()) profileUpdate.region = form.region.trim();
        if (Number.isFinite(hours!)) profileUpdate.flight_hours = hours;
        if (Object.keys(profileUpdate).length > 1) {
          await supabase.from("profiles").update(profileUpdate).eq("user_id", user.id);
        }
      }

      // Send confirmation email (fire-and-forget; don't block UX on errors)
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "intake-confirmation",
            recipientEmail: form.contact_email.trim().toLowerCase(),
            idempotencyKey: `intake-confirm-${id}`,
            templateData: {
              name: form.contact_name.trim().split(" ")[0],
              audience: form.audience,
              schoolName: isSchool ? form.school_name.trim() : undefined,
            },
          },
        })
        .catch(() => {
          // Non-blocking
        });

      // Notify the SimPilot team
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "intake-team-notification",
            recipientEmail: "support@simpilot.ai",
            idempotencyKey: `intake-notify-${id}`,
            templateData: {
              audience: form.audience,
              contactName: form.contact_name.trim(),
              contactEmail: form.contact_email.trim().toLowerCase(),
              schoolName: isSchool ? form.school_name.trim() : undefined,
              trainingGoals: form.training_goals.trim() || undefined,
              source: "intake-page",
            },
          },
        })
        .catch(() => {
          // Non-blocking
        });

      setDone(true);
    } catch (err) {
      console.error("Intake submit failed", err);
      toast({
        title: "Submission failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Get Started — SimPilot.AI Intake"
        description="Tell us your training goals, aircraft, and proficiency. Tailored AI flight training for individual pilots and flight schools."
        keywords="pilot intake, flight school onboarding, AI flight training, training goals"
        canonical="/intake"
      />
      <Navbar />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="mb-8 text-center">
            <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">Intake</p>
            <h1 className="font-display text-3xl md:text-4xl text-foreground">
              Tell us about your <span className="text-primary text-glow-cyan">training</span>
            </h1>
            <p className="text-muted-foreground mt-3">
              A few quick questions so your CFI-AI is tuned to you (or your school) from day one.
            </p>
          </div>

          {!done && (
            <ol className="flex items-center justify-between mb-10" aria-label="Progress">
              {steps.map((label, i) => {
                const active = i === step;
                const complete = i < step;
                return (
                  <li key={label} className="flex-1 flex items-center">
                    <div
                      className={`flex items-center gap-2 ${
                        active ? "text-primary" : complete ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 inline-flex items-center justify-center rounded-full border text-xs font-display tracking-wider ${
                          active
                            ? "border-primary bg-primary/10"
                            : complete
                            ? "border-accent bg-accent/10"
                            : "border-border"
                        }`}
                      >
                        {complete ? <Check size={14} /> : i + 1}
                      </span>
                      <span className="hidden sm:inline text-xs uppercase tracking-widest">{label}</span>
                    </div>
                    {i < steps.length - 1 && <div className="flex-1 h-px bg-border mx-3" />}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-6 md:p-8">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/40 text-accent mb-4">
                    <Check size={28} />
                  </div>
                  <h2 className="font-display text-2xl text-foreground mb-2">You're cleared for takeoff ✈️</h2>
                  <p className="text-muted-foreground mb-6">
                    We've received your intake and emailed a confirmation to{" "}
                    <span className="text-foreground">{form.contact_email}</span>. Our crew will follow up shortly.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => navigate("/chat")} className="font-display tracking-widest uppercase text-xs">
                      Start chatting
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/")}
                      className="font-display tracking-widest uppercase text-xs"
                    >
                      Back home
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`step-${step}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 0 && (
                    <div>
                      <h2 className="font-display text-xl text-foreground mb-1">Who is this for?</h2>
                      <p className="text-sm text-muted-foreground mb-6">Choose the option that fits best.</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => set("audience", "pilot")}
                          className={`text-left p-5 rounded-lg border transition-all ${
                            form.audience === "pilot"
                              ? "border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--cyan-glow)/0.15)]"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <Plane className="text-primary mb-3" size={22} />
                          <div className="font-display text-foreground">Individual pilot</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Personalized AI training for your certificate, aircraft, and goals.
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => set("audience", "school")}
                          className={`text-left p-5 rounded-lg border transition-all ${
                            form.audience === "school"
                              ? "border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--cyan-glow)/0.15)]"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <GraduationCap className="text-primary mb-3" size={22} />
                          <div className="font-display text-foreground">Flight school</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Equip your students with AI ground school, oral exam prep, and progress tracking.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4">
                      <h2 className="font-display text-xl text-foreground mb-1">Contact details</h2>
                      <p className="text-sm text-muted-foreground mb-4">How should we reach you?</p>
                      {isSchool && (
                        <div>
                          <Label htmlFor="school_name">School name *</Label>
                          <Input
                            id="school_name"
                            value={form.school_name}
                            onChange={(e) => set("school_name", e.target.value)}
                            placeholder="Skyline Aviation Academy"
                            maxLength={120}
                            className="mt-1"
                          />
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contact_name">{isSchool ? "Primary contact" : "Your name"} *</Label>
                          <Input
                            id="contact_name"
                            value={form.contact_name}
                            onChange={(e) => set("contact_name", e.target.value)}
                            placeholder="Jane Doe"
                            maxLength={100}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact_email">Email *</Label>
                          <Input
                            id="contact_email"
                            type="email"
                            value={form.contact_email}
                            onChange={(e) => set("contact_email", e.target.value)}
                            placeholder="you@example.com"
                            maxLength={255}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          placeholder="+1 (555) 555-5555"
                          maxLength={40}
                          className="mt-1"
                        />
                      </div>
                      {isSchool && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="estimated_seats">Estimated seats</Label>
                            <Input
                              id="estimated_seats"
                              type="number"
                              min={1}
                              value={form.estimated_seats}
                              onChange={(e) => set("estimated_seats", e.target.value)}
                              placeholder="25"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="preferred_start_date">Preferred start date</Label>
                            <Input
                              id="preferred_start_date"
                              type="date"
                              value={form.preferred_start_date}
                              onChange={(e) => set("preferred_start_date", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <h2 className="font-display text-xl text-foreground mb-1">Training profile</h2>
                      <p className="text-sm text-muted-foreground mb-2">
                        {isSchool ? "Tell us about your typical student cohort." : "Tell us about you as a pilot."}
                      </p>
                      <div>
                        <Label>Current certificate</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {certificateOptions.map((opt) => (
                            <Chip
                              key={opt}
                              active={form.certificate_type === opt}
                              onClick={() => set("certificate_type", form.certificate_type === opt ? "" : opt)}
                            >
                              {opt}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Rating focus</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ratingOptions.map((opt) => (
                            <Chip
                              key={opt}
                              active={form.rating_focus === opt}
                              onClick={() => set("rating_focus", form.rating_focus === opt ? "" : opt)}
                            >
                              {opt}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="aircraft_type">Aircraft type</Label>
                          <Input
                            id="aircraft_type"
                            value={form.aircraft_type}
                            onChange={(e) => set("aircraft_type", e.target.value)}
                            placeholder="C172, PA-28, DA40…"
                            maxLength={80}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="flight_hours">{isSchool ? "Avg student hours" : "Total flight hours"}</Label>
                          <Input
                            id="flight_hours"
                            type="number"
                            min={0}
                            value={form.flight_hours}
                            onChange={(e) => set("flight_hours", e.target.value)}
                            placeholder="0"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="region">Region / Country</Label>
                        <Input
                          id="region"
                          value={form.region}
                          onChange={(e) => set("region", e.target.value)}
                          placeholder="USA, EU, UK…"
                          maxLength={80}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Current proficiency</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {proficiencyOptions.map((opt) => (
                            <Chip
                              key={opt.value}
                              active={form.proficiency === opt.value}
                              onClick={() => set("proficiency", form.proficiency === opt.value ? "" : opt.value)}
                            >
                              {opt.label}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-5">
                      <h2 className="font-display text-xl text-foreground mb-1">Goals & timeline</h2>
                      <p className="text-sm text-muted-foreground mb-2">What are you trying to achieve?</p>
                      <div>
                        <Label htmlFor="training_goals">Training goals</Label>
                        <Textarea
                          id="training_goals"
                          value={form.training_goals}
                          onChange={(e) => set("training_goals", e.target.value)}
                          placeholder={
                            isSchool
                              ? "e.g. Standardize ground school across cohorts, improve checkride pass rate…"
                              : "e.g. Pass my IR checkride, build IFR confidence in IMC, master my G1000…"
                          }
                          maxLength={2000}
                          rows={5}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Target timeline</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {timelineOptions.map((opt) => (
                            <Chip
                              key={opt}
                              active={form.timeline === opt}
                              onClick={() => set("timeline", form.timeline === opt ? "" : opt)}
                            >
                              {opt}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div>
                      <h2 className="font-display text-xl text-foreground mb-1">Review & submit</h2>
                      <p className="text-sm text-muted-foreground mb-5">
                        Quick check before we file your flight plan.
                      </p>
                      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <Row label="Audience" value={isSchool ? "Flight school" : "Individual pilot"} />
                        {isSchool && <Row label="School" value={form.school_name} />}
                        <Row label="Contact" value={form.contact_name} />
                        <Row label="Email" value={form.contact_email} />
                        {form.phone && <Row label="Phone" value={form.phone} />}
                        {isSchool && form.estimated_seats && <Row label="Seats" value={form.estimated_seats} />}
                        {isSchool && form.preferred_start_date && (
                          <Row label="Start date" value={form.preferred_start_date} />
                        )}
                        {form.certificate_type && <Row label="Certificate" value={form.certificate_type} />}
                        {form.rating_focus && <Row label="Rating" value={form.rating_focus} />}
                        {form.aircraft_type && <Row label="Aircraft" value={form.aircraft_type} />}
                        {form.flight_hours && <Row label="Hours" value={form.flight_hours} />}
                        {form.region && <Row label="Region" value={form.region} />}
                        {form.proficiency && <Row label="Proficiency" value={form.proficiency} />}
                        {form.timeline && <Row label="Timeline" value={form.timeline} />}
                      </dl>
                      {form.training_goals && (
                        <div className="mt-4">
                          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Goals</div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{form.training_goals}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-6">
                        By submitting, you agree to our{" "}
                        <Link to="/terms" className="underline hover:text-foreground">
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy" className="underline hover:text-foreground">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </div>
                  )}

                  {/* Footer nav */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                    <Button
                      variant="ghost"
                      onClick={back}
                      disabled={step === 0 || submitting}
                      className="font-display tracking-widest uppercase text-xs"
                    >
                      <ChevronLeft size={16} className="mr-1" /> Back
                    </Button>
                    {step < steps.length - 1 ? (
                      <Button
                        onClick={next}
                        disabled={!canProceed}
                        className="font-display tracking-widest uppercase text-xs"
                      >
                        Next <ChevronRight size={16} className="ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="font-display tracking-widest uppercase text-xs"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" /> Submitting…
                          </>
                        ) : (
                          "Submit intake"
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
    <dd className="text-foreground">{value}</dd>
  </div>
);

export default IntakePage;
