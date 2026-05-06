import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Users, KeyRound, BarChart3, ShieldCheck, Loader2, CheckCircle2, CalendarIcon } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const inquirySchema = z.object({
  school_name: z.string().trim().min(2, "School name is required").max(150),
  contact_name: z.string().trim().min(2, "Your name is required").max(100),
  contact_email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  estimated_seats: z.coerce.number().int().min(1, "At least 1 seat").max(10000).optional().or(z.nan()),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

const benefits = [
  {
    icon: Users,
    title: "Individual Student Logins",
    body: "Every student gets their own private account, progress dashboard, and logbook — not a shared classroom seat.",
  },
  {
    icon: KeyRound,
    title: "Bulk Redemption Codes",
    body: "Pre-pay for N seats on a single invoice. We generate unique codes you distribute to students. They activate at signup.",
  },
  {
    icon: BarChart3,
    title: "Tiered Volume Discounts",
    body: "5+ seats save 15%, 11+ save 20%, 26+ save 25% — applied automatically at checkout.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-First by Design",
    body: "Students own their accounts and data. You pay the bill; they keep their progress if they leave the program.",
  },
];

const ForSchoolsSection = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      school_name: String(fd.get("school_name") || ""),
      contact_name: String(fd.get("contact_name") || ""),
      contact_email: String(fd.get("contact_email") || ""),
      phone: String(fd.get("phone") || ""),
      estimated_seats: fd.get("estimated_seats") ? Number(fd.get("estimated_seats")) : undefined,
      message: String(fd.get("message") || ""),
    };

    const parsed = inquirySchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("school_inquiries").insert({
      school_name: parsed.data.school_name,
      contact_name: parsed.data.contact_name,
      contact_email: parsed.data.contact_email,
      phone: parsed.data.phone || null,
      estimated_seats: Number.isFinite(parsed.data.estimated_seats as number)
        ? (parsed.data.estimated_seats as number)
        : null,
      message: parsed.data.message || null,
      preferred_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Couldn't send inquiry. Please try again.");
      return;
    }
    setSubmitted(true);
    toast.success("Thanks! Our team will be in touch within 1 business day.");
  };

  return (
    <section id="for-schools" className="py-20 relative scroll-mt-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            For Flight Schools
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">
            Equip Your Whole Program — <span className="text-primary text-glow-cyan">One Invoice, Individual Accounts</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Pre-pay for student seats in bulk and get unique signup codes. Every student keeps their own login,
            progress, and logbook. You get one clean invoice and volume pricing.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
          {/* Benefits column */}
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-5 rounded-xl border border-border bg-gradient-card hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm tracking-wider uppercase text-foreground mb-1">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{b.body}</p>
                </div>
              </motion.div>
            ))}

            <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-display text-xs tracking-widest uppercase text-primary mb-1">
                    Self-Service Available
                  </p>
                  <p className="text-muted-foreground">
                    Already know how many seats you need?{" "}
                    <a href="/for-schools" className="text-primary underline hover:text-primary/80">
                      Buy seats instantly &rarr;
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-primary/40 border-glow-cyan bg-gradient-card p-6 md:p-8"
          >
            {submitted ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
                <h3 className="font-display text-xl text-foreground mb-2">Inquiry Received</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Thanks — our team will reach out within 1 business day with pricing tailored to your program.
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-display text-lg text-foreground mb-1">
                  Talk to Bulk Sales
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Tell us about your program. We'll reply within 1 business day with a custom quote.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="school_name" className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                        School Name *
                      </label>
                      <input
                        id="school_name"
                        name="school_name"
                        required
                        maxLength={150}
                        className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
                        placeholder="Skyhigh Aviation Academy"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact_name" className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                        Your Name *
                      </label>
                      <input
                        id="contact_name"
                        name="contact_name"
                        required
                        maxLength={100}
                        className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
                        placeholder="Jane Smith"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact_email" className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                        Email *
                      </label>
                      <input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        required
                        maxLength={255}
                        className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
                        placeholder="jane@school.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                        Phone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        maxLength={40}
                        className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="estimated_seats" className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                        Estimated Student Seats
                      </label>
                      <input
                        id="estimated_seats"
                        name="estimated_seats"
                        type="number"
                        min={1}
                        max={10000}
                        className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                        Preferred Start Date
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-sm text-left flex items-center justify-between hover:border-primary/50 transition-colors",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            {startDate ? format(startDate, "PPP") : "Pick a date"}
                            <CalendarIcon className="w-4 h-4 opacity-60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-display tracking-widest uppercase text-muted-foreground mb-1.5">
                      Tell Us About Your Program
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      maxLength={1000}
                      className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 resize-none"
                      placeholder="Part 61 / Part 141, ratings offered, timeline, etc."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 rounded font-display text-xs tracking-widest uppercase bg-primary text-primary-foreground hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Request Bulk Quote"
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    No commitment. We typically respond within 1 business day.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ForSchoolsSection;
