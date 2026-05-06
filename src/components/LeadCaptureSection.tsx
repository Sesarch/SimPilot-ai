import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, GraduationCap, Plane } from "lucide-react";

type Audience = "pilot" | "school";

const schema = z.object({
  audience: z.enum(["pilot", "school"]),
  contact_name: z.string().trim().min(1, "Required").max(120),
  school_name: z.string().trim().max(160).optional().or(z.literal("")),
  contact_email: z.string().trim().email("Invalid email").max(255),
  training_goals: z.string().trim().min(1, "Tell us your goal").max(1000),
});

const LeadCaptureSection = () => {
  const { toast } = useToast();
  const [audience, setAudience] = useState<Audience>("pilot");
  const [form, setForm] = useState({
    contact_name: "",
    school_name: "",
    contact_email: "",
    training_goals: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ audience, ...form });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({ title: "Please check the form", description: first.message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const id = crypto.randomUUID();
      const isSchool = audience === "school";
      const { error } = await supabase.from("intakes").insert({
        id,
        audience,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim().toLowerCase(),
        school_name: isSchool ? form.school_name.trim() || null : null,
        training_goals: form.training_goals.trim(),
      });
      if (error) throw error;

      // Notify the SimPilot team (fire-and-forget)
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "intake-team-notification",
            recipientEmail: "support@simpilot.ai",
            idempotencyKey: `intake-notify-${id}`,
            templateData: {
              audience,
              contactName: form.contact_name.trim(),
              contactEmail: form.contact_email.trim().toLowerCase(),
              schoolName: isSchool ? form.school_name.trim() : undefined,
              trainingGoals: form.training_goals.trim(),
              source: "homepage-lead",
            },
          },
        })
        .catch(() => undefined);

      setDone(true);
    } catch (err) {
      console.error("Lead submit failed", err);
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
    <section id="get-in-touch" className="py-20 bg-background">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="font-orbitron text-3xl md:text-4xl text-foreground mb-3">
            Talk to SimPilot.AI
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you're a student pilot or a flight school, tell us your training goals and we'll be in touch.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 md:p-10 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center text-center py-10">
              <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-orbitron text-2xl mb-2">Thanks — we got it.</h3>
              <p className="text-muted-foreground max-w-md">
                Our team will follow up shortly. In the meantime, explore the platform or finish a more detailed intake.
              </p>
              <Link to="/intake" className="text-primary hover:underline mt-4 text-sm">
                Open the full intake form →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAudience("pilot")}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    audience === "pilot"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                  aria-pressed={audience === "pilot"}
                >
                  <Plane className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm">Individual Pilot</div>
                    <div className="text-xs text-muted-foreground">Student or rated</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("school")}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    audience === "school"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                  aria-pressed={audience === "school"}
                >
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm">Flight School</div>
                    <div className="text-xs text-muted-foreground">Onboard students</div>
                  </div>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Your name</Label>
                  <Input
                    id="lead-name"
                    value={form.contact_name}
                    onChange={update("contact_name")}
                    placeholder="Jane Doe"
                    maxLength={120}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={form.contact_email}
                    onChange={update("contact_email")}
                    placeholder="you@example.com"
                    maxLength={255}
                    required
                  />
                </div>
              </div>

              {audience === "school" && (
                <div className="grid gap-2">
                  <Label htmlFor="lead-school">Flight school</Label>
                  <Input
                    id="lead-school"
                    value={form.school_name}
                    onChange={update("school_name")}
                    placeholder="Skyline Aviation"
                    maxLength={160}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="lead-goals">Training goals</Label>
                <Textarea
                  id="lead-goals"
                  value={form.training_goals}
                  onChange={update("training_goals")}
                  placeholder={
                    audience === "school"
                      ? "e.g. Onboard 25 PPL students for ground school this fall."
                      : "e.g. Pass my PPL written and practice oral exam scenarios."
                  }
                  rows={4}
                  maxLength={1000}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  We'll email{" "}
                  <span className="text-foreground">support@simpilot.ai</span> and follow up with you.
                </p>
                <Button type="submit" disabled={submitting} className="sm:min-w-[180px]">
                  {submitting ? "Sending…" : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default LeadCaptureSection;
