import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  CreditCard,
  Shield,
  BookOpen,
  Plane,
  Settings,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Set up your pilot profile, explore Ground One-on-One, and run your first AI session.",
  },
  {
    icon: Plane,
    title: "Training & Exams",
    description: "Ground school modules, Oral Exam simulator, ATC scenarios, and checkride prep.",
  },
  {
    icon: CreditCard,
    title: "Billing & Subscriptions",
    description: "Plans, upgrades, trial questions, invoices, and cancellations.",
  },
  {
    icon: Settings,
    title: "Account & Profile",
    description: "Login issues, password resets, MFA, and pilot context settings.",
  },
  {
    icon: Shield,
    title: "Privacy & Compliance",
    description: "Data handling, FAA disclaimers, and our safety-first AI guardrails.",
  },
  {
    icon: LifeBuoy,
    title: "Technical Issues",
    description: "Bridge desktop app, sim integrations (.FLT uploads), PWA install, and bug reports.",
  },
];

const faqs = [
  {
    q: "How do I contact a human support agent?",
    a: "Use the support chat widget in the bottom-right of any page, or email us via the Contact page. We typically respond within one business day.",
  },
  {
    q: "Is SimPilot.AI FAA-approved?",
    a: "No. SimPilot.AI is a supplemental study tool only. It does not replace certified instruction or FAA-approved curricula. Always verify against current FAA publications and your POH/AFM.",
  },
  {
    q: "How do I cancel or change my subscription?",
    a: "Open your Account page, choose Manage Billing, and you will be sent to the secure customer portal where you can change plans or cancel. Access continues until the end of your billing period.",
  },
  {
    q: "I forgot my password — what now?",
    a: "Use the Forgot Password link on the sign-in page. A reset link will be emailed to you. If it does not arrive within a few minutes, check spam or contact support.",
  },
  {
    q: "Why does the AI ask me questions instead of giving answers?",
    a: "The AI uses a Socratic CFI persona — it guides you to the answer rather than handing it to you. This mirrors how real instructors train pilots and improves long-term retention.",
  },
  {
    q: "Can I upload my aircraft's POH?",
    a: "Yes. On supported plans you can upload your Pilot Operating Handbook so the AI grounds aircraft-specific answers (V-speeds, limitations, procedures) in your actual aircraft.",
  },
  {
    q: "How do trial messages and limits work?",
    a: "Anonymous visitors get 5 messages, signed-in users get a higher allowance, and paid plans unlock the full experience. Limits reset based on your plan's billing cycle.",
  },
  {
    q: "Something is broken or wrong — how do I report it?",
    a: "Open the support chat widget, describe the issue, and include the page URL and a screenshot if possible. Bug reports go directly to the engineering team.",
  },
];

const supportJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Support & Help Center — SimPilot.AI"
        description="Get help with SimPilot.AI. Browse FAQs, help categories, billing, training, and technical support for the AI pilot training platform."
        keywords="SimPilot support, pilot training help, AI flight instructor FAQ, ground school help, billing support, account help"
        canonical="/support"
        jsonLd={[supportJsonLd]}
      />
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* Header */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <LifeBuoy className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4">
              Support & Help Center
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Answers to common questions, help categories, and direct ways to reach our team.
            </p>
          </header>

          {/* Help Categories */}
          <section aria-labelledby="categories-heading" className="mb-20">
            <h2
              id="categories-heading"
              className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6"
            >
              Browse Help Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group p-5 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-colors"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 border border-primary/20 mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display text-base text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section aria-labelledby="faq-heading" className="mb-20">
            <h2
              id="faq-heading"
              className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6"
            >
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Still need help */}
          <section
            aria-labelledby="contact-heading"
            className="rounded-xl border border-border bg-card/50 p-8 md:p-10 text-center"
          >
            <h2 id="contact-heading" className="font-display text-2xl mb-3">
              Still need help?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Our team responds within one business day. Use live chat for the fastest reply, or
              send us a detailed message.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/contact">
                  <Mail className="w-4 h-4 mr-2" /> Contact Us
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("simpilot:open-support"));
                }}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Open Live Chat
                </a>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportPage;
