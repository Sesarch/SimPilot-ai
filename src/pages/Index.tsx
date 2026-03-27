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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="SimPilot.AI — AI-Powered Pilot Training | Ground School & Oral Exam Prep"
        description="Train smarter with SimPilot.AI — the AI co-pilot for ground school study, oral exam simulation, and flight knowledge. 24/7 AI flight instructor. Not FAA-approved; supplemental training only."
        keywords="AI pilot training, ground school study, oral exam prep, flight simulator training, checkride preparation, private pilot, instrument rating, commercial pilot, aviation training, AI flight instructor, pilot knowledge test, FAA written exam prep"
        canonical="/"
        jsonLd={homeJsonLd}
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
