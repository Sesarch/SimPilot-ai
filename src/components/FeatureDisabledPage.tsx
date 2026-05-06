import { Link } from "react-router-dom";
import { Ban } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FeatureDisabledPage = ({ feature }: { feature: string }) => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <Ban className="w-14 h-14 text-muted-foreground mb-5" />
      <h1 className="font-display text-2xl text-foreground mb-2">
        {feature} is Temporarily Unavailable
      </h1>
      <p className="text-muted-foreground max-w-md mb-6">
        This feature has been temporarily disabled by the site administrator. Please check back later.
      </p>
      <Link to="/dashboard" title="Return to your SimPilot.AI pilot training dashboard" className="text-primary hover:underline text-sm">
        ← Back to Dashboard
      </Link>
    </div>
    <Footer />
  </div>
);

export default FeatureDisabledPage;
