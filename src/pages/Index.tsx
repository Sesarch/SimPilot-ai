import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import FeaturesSection from "@/components/FeaturesSection";
import AudiencesSection from "@/components/AudiencesSection";
import CTASection from "@/components/CTASection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";
import CookieConsent from "@/components/CookieConsent";
import SEOHead from "@/components/SEOHead";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SimPilot.AI",
  url: "https://simpilot.ai",
  description: "AI-powered pilot training platform for ground school, oral exam prep, and flight knowledge. Not FAA-approved — for supplemental study only.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "15",
    highPrice: "199",
    priceCurrency: "USD",
  },
};

const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is SimPilot.AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SimPilot.AI is an AI-powered pilot training platform that helps student pilots study for ground school and practice oral exam scenarios with a 24/7 AI flight instructor. It is NOT FAA-approved and is for supplemental study only.",
      },
    },
    {
      "@type": "Question",
      name: "Who is SimPilot.AI for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SimPilot.AI is designed for student pilots preparing for private, instrument, and commercial certificates, as well as flight schools looking to supplement their training programs with AI-powered study tools.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI oral exam simulator work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The oral exam simulator uses AI to ask checkride-style questions, evaluate your responses in real time, and provide a score with detailed feedback — simulating a real DPE oral examination experience.",
      },
    },
    {
      "@type": "Question",
      name: "What ground school topics are covered?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SimPilot.AI covers all major FAA knowledge test areas including aerodynamics, weather theory, federal aviation regulations, navigation, aircraft systems, flight operations, and human factors.",
      },
    },
    {
      "@type": "Question",
      name: "Is SimPilot.AI FAA-approved?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. SimPilot.AI is not FAA-approved. It is a supplemental training tool designed to complement — not replace — instruction from certified flight instructors and accredited flight schools.",
      },
    },
  ],
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="SimPilot.AI — AI-Powered Pilot Training | Ground School & Oral Exam Prep"
        description="Train smarter with SimPilot.AI — the AI co-pilot for ground school study, oral exam simulation, and flight knowledge. 24/7 AI flight instructor. Not FAA-approved; supplemental training only."
        keywords="AI pilot training, ground school study, oral exam prep, flight simulator training, checkride preparation, private pilot, instrument rating, commercial pilot, aviation training, AI flight instructor, pilot knowledge test, FAA written exam prep"
        canonical="/"
        jsonLd={[homeJsonLd, homeFaqJsonLd]}
      />
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <AudiencesSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
      <AIChatWidget />
      <CookieConsent />
    </div>
  );
};

export default Index;
