import { Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const MaintenancePage = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
    <Wrench className="w-16 h-16 text-primary mb-6 animate-pulse" />
    <h1 className="font-display text-3xl font-bold text-foreground mb-3">
      We'll Be Right Back
    </h1>
    <p className="text-muted-foreground max-w-md mb-6">
      SimPilot.AI is currently undergoing scheduled maintenance. We'll be back online shortly. Thank you for your patience!
    </p>
    <Link to="/contact" title="Contact SimPilot.AI support" className="text-primary hover:underline text-sm">
      Need help? Contact us
    </Link>
  </div>
);

export default MaintenancePage;
