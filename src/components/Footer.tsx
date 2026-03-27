import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-display text-lg font-bold text-primary text-glow-cyan tracking-wider" title="SimPilot.AI — AI-Powered Pilot Training Platform">
            SIM<span className="text-accent">PILOT</span>.AI
          </span>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {["Services", "Features"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                title={`View SimPilot.AI ${item} — AI aviation training`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
              >
                {item}
              </a>
            ))}
            <Link to="/contact" title="Contact SimPilot.AI support team" className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
              Contact
            </Link>
            <Link to="/terms" title="SimPilot.AI Terms & Conditions — not FAA-approved, supplemental training only" className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
              Terms
            </Link>
            <Link to="/privacy" title="SimPilot.AI Privacy Policy — how we protect your pilot training data" className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
              Privacy
            </Link>
            <Link to="/cookie-preferences" className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
              Cookies
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SimPilot.ai — All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
