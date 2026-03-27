import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Mail, User, MessageSquare, FileText, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ContactPage = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Contact Us</h1>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Have a question, feedback, or need help? Fill out the form below and our team will get back to you as soon as possible.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                maxLength={255}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-1.5 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Subject
            </Label>
            <Input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="How can we help?"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-1.5 text-sm">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Message
            </Label>
            <Textarea
              id="message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Tell us more about your question or feedback..."
              maxLength={2000}
              rows={6}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto gap-2">
            <Send className="h-4 w-4" />
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              {
                q: "Is SimPilot.AI a replacement for flight school?",
                a: "No. SimPilot.AI is a supplemental study tool only. It is NOT FAA-approved and cannot replace training from certified flight instructors and accredited flight schools.",
              },
              {
                q: "What topics does the Ground School cover?",
                a: "Our AI tutor covers all major ground school subjects including aerodynamics, weather, regulations, navigation, aircraft systems, and flight operations — aligned with the FAA knowledge test areas.",
              },
              {
                q: "How does the Oral Exam simulator work?",
                a: "The oral exam simulator uses AI to ask you checkride-style questions, evaluate your responses, and provide a score with detailed feedback — just like a real DPE oral exam.",
              },
              {
                q: "Is my data and chat history private?",
                a: "Yes. Your conversations, scores, and progress are tied to your account and are not shared with anyone. Please review our Privacy Policy for full details.",
              },
              {
                q: "Can I cancel my subscription anytime?",
                a: "Absolutely. You can cancel your subscription at any time with no penalties. Your access will continue until the end of your current billing period.",
              },
              {
                q: "How do I reset my password?",
                a: "Click 'Forgot Password' on the sign-in page and follow the instructions sent to your email to reset your password.",
              },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-12 p-4 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can also reach us at{" "}
            <a href="mailto:support@simpilot.ai" className="text-primary hover:underline">
              support@simpilot.ai
            </a>
            . We typically respond within 24–48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
