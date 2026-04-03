import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border bg-background">
      <div className="mx-auto px-6 md:px-0" style={{ maxWidth: "70%" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start text-center md:text-left">
          {/* Brand */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <span
              className="font-display text-lg font-bold text-primary text-glow-cyan tracking-wider"
              title="SimPilot.AI — AI-Powered Pilot Training Platform"
            >
              SIM<span className="text-accent">PILOT</span>.AI
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              AI-powered supplemental training for student pilots.
              Not FAA-approved — for study use only.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h4 className="font-display text-xs font-semibold tracking-[0.2em] uppercase text-foreground mb-1">
              Quick Links
            </h4>
            {["Services", "Features"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                title={`View SimPilot.AI ${item} — AI aviation training`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider"
              >
                {item}
              </a>
            ))}
            <Link to="/contact" title="Contact SimPilot.AI support team" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider">
              Contact
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h4 className="font-display text-xs font-semibold tracking-[0.2em] uppercase text-foreground mb-1">
              Legal
            </h4>
            <Link to="/terms" title="SimPilot.AI Terms & Conditions" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider">
              Terms &amp; Conditions
            </Link>
            <Link to="/privacy" title="SimPilot.AI Privacy Policy" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider">
              Privacy Policy
            </Link>
            <Link to="/cookie-preferences" title="Manage your SimPilot.AI cookie preferences" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider">
              Cookie Preferences
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SimPilot.ai — All rights reserved.
          </p>
           <div className="flex items-center gap-4">
            <p className="text-[10px] text-muted-foreground/60 tracking-wide">
              Built for pilots, powered by AI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
