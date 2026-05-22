import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What's the difference between the plans?",
    a: "All three plans give you the full SimPilot.AI feature set — multi-brain AI tutor, DPE oral exam simulator, live weather and flight tracking, POH grounding, chart vision, sim bridge, and FAR/AIM citations. The differences are: (1) Pilot Monthly is $39/mo with 500 AI conversations per month — best for short bursts of study. (2) Pilot Annual is $299/year (≈$24.92/mo, saving $169) with 1,000 conversations per month and the pass-the-checkride guarantee. (3) Checkride Lifetime is $399 one-time with 1,500 conversations/month and access until you pass your selected target rating (plus 90 days, up to 24 months max). No subscription, no monthly bill — built for serious checkride prep.",
  },
  {
    q: 'How does "Checkride Lifetime" work? Is it really lifetime?',
    a: "Important: Checkride Lifetime is NOT perpetual access. It is bounded access for one specific FAA certificate or rating that you select at signup (your \"Target Rating\"). Access continues until you pass that rating's practical test plus 90 days, or up to 24 months from purchase if you haven't yet passed. We call it \"Lifetime\" because it lasts the lifetime of your training toward that goal — not forever. See Terms Section 8.4 for the full notice.",
  },
  {
    q: 'What\'s a "conversation" and what happens if I run out?',
    a: "A conversation is one round-trip exchange with the AI tutor (your question + the AI's response). Caps reset on the first of each calendar month. If you hit your cap, we show a modal offering to add 250 more conversations for $9 (one-time purchase) — or you can wait until the next reset. Caps protect us from runaway AI provider costs and keep your monthly price predictable.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly and Annual subscriptions can be cancelled at any time from your account settings; cancellation takes effect at the end of your current paid billing period (you keep access until then). Checkride Lifetime is a one-time purchase — there is no recurring charge to cancel.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, under specific conditions. Monthly/Annual: full refund within 14 days if you've used fewer than 20 AI conversations. Checkride Lifetime: full refund within 14 days if you've used fewer than 50 conversations. After those windows, no automatic refunds. Annual and Lifetime plans also include the pass-the-checkride guarantee (see next question). Full refund policy is in Terms Section 8.6.",
  },
  {
    q: "What's the pass-the-checkride guarantee?",
    a: "Available on Pilot Annual and Checkride Lifetime. If you don't pass your Target Rating's written exam OR practical test on your first attempt, we refund your most recent annual payment or full Lifetime payment — provided you (i) completed all SimPilot.AI study modules for that rating, (ii) maintained an active subscription for at least 90 days, (iii) averaged at least 4 hours of study per week, and (iv) submit official FAA documentation of the failed attempt within 30 days. Full terms: Section 8.6(c).",
  },
];

const PricingFAQ = () => {
  return (
    <section className="py-20 bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-2">
            Questions
          </p>
          <h2 className="font-display text-2xl md:text-3xl text-foreground">
            Frequently asked
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`item-${i}`}
              className="border-border"
            >
              <AccordionTrigger className="text-left font-display text-sm tracking-wide text-foreground hover:text-primary hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-secondary-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default PricingFAQ;
