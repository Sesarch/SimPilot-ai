import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TermsContent from "@/components/legal/TermsContent";
import DraftReviewBanner from "@/components/DraftReviewBanner";
import { TERMS_LAST_UPDATED_LABEL, TERMS_VERSION } from "@/lib/termsVersion";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms & Conditions — SimPilot.AI"
        description="Read SimPilot.AI's Terms & Conditions. Important: SimPilot.AI is NOT FAA-approved and is for unofficial, supplemental pilot training purposes only."
        keywords="SimPilot.AI terms and conditions, pilot training disclaimer, not FAA approved, unofficial training, aviation training terms, flight school disclaimer"
        canonical="/terms"
        ogImage="/og-terms.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Terms & Conditions — SimPilot.AI",
          "description": "Terms and conditions for using SimPilot.AI's AI-powered pilot training platform.",
          "url": "https://simpilot.ai/terms",
          "inLanguage": "en-US",
          "isPartOf": { "@type": "WebSite", "name": "SimPilot.AI", "url": "https://simpilot.ai" },
          "about": { "@type": "Thing", "name": "Terms and Conditions" },
          "publisher": { "@type": "Organization", "name": "SimPilot.AI", "url": "https://simpilot.ai" }
        }}
      />
      <Navbar />

      <div className="container mx-auto px-6 py-12 pt-24 max-w-3xl">
        <h1 className="font-display text-3xl text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Last updated: {TERMS_LAST_UPDATED_LABEL}
        </p>
        <p className="text-xs text-muted-foreground/70 mb-8">
          Version <code>{TERMS_VERSION}</code> · See also our{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>

        <TermsContent />
      </div>
      <Footer />
    </div>
  );
};

export default TermsPage;
