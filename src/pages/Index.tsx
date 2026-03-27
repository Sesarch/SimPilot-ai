import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import FeaturesSection from "@/components/FeaturesSection";
import AudiencesSection from "@/components/AudiencesSection";
import CTASection from "@/components/CTASection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <AudiencesSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
      <Footer />
      <AIChatWidget />
      <CookieConsent />
    </div>
  );
};

export default Index;
