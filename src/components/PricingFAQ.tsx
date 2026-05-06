import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does the 7-day free trial work?",
    a: "Every plan includes a full-featured 7-day free trial — no credit card required. You get complete access to all features in your chosen tier so you can experience the value before committing.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade or downgrade at any time from your account dashboard. When upgrading, you'll get immediate access to the new features. Downgrades take effect at the start of your next billing cycle.",
  },
  {
    q: "What's the difference between monthly and annual billing?",
    a: "Annual billing saves you 20% compared to monthly. You're billed once per year at the discounted rate, and you can cancel anytime — your access continues until the end of the paid period.",
  },
  {
    q: "Is SimPilot.AI a replacement for a CFI?",
    a: "SimPilot.AI is a powerful supplement to traditional instruction, not a replacement. Think of it as having a knowledgeable study partner available 24/7 who can quiz you, explain concepts, and help you prepare — but official flight training and checkrides still require a certified instructor.",
  },
  {
    q: "What happens when my trial ends?",
    a: "You'll be prompted to choose a plan. If you don't subscribe, your account reverts to limited access. Your progress and session history are saved, so you can pick up right where you left off when you're ready.",
  },
  {
    q: "How many students can the Flight School plan support?",
    a: "The Flight School plan supports up to 20 student accounts with a single subscription. Need more seats? Contact our sales team for custom enterprise pricing tailored to your organization.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a full refund within the first 14 days of any paid subscription if you're not satisfied. After that, you can cancel anytime and retain access through the end of your billing period.",
  },
  {
    q: "What AI models power SimPilot.AI?",
    a: "We use state-of-the-art large language models fine-tuned for aviation training. Our AI references FAA publications (FAR/AIM, ACS standards) and uses the Socratic method to help you truly understand concepts rather than just memorize answers.",
  },
];

const PricingFAQ = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-3xl mx-auto mt-16"
    >
      <h3 className="font-display text-2xl md:text-3xl text-foreground text-center mb-2">
        Frequently Asked <span className="text-primary text-glow-cyan">Questions</span>
      </h3>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Everything you need to know about our plans and billing.
      </p>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="rounded-lg border border-border bg-gradient-card px-5 data-[state=open]:border-primary/30"
          >
            <AccordionTrigger className="font-display text-sm tracking-wide text-foreground hover:text-primary hover:no-underline py-4">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
};

export default PricingFAQ;
