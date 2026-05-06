import { Link, useNavigate, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";

const FooterLink = ({ to, title, children }: { to: string; title: string; children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    if (pathname === to) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link to={to} title={title} onClick={handleClick} className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider">
      {children}
    </Link>
  );
};

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border bg-background">
      <div className="mx-auto px-6 md:px-0" style={{ maxWidth: "70%" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start text-center md:text-left">
          {/* Brand */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <Link to="/" className="inline-flex" title="SimPilot.AI — AI-Powered Pilot Training Platform">
              <Logo height={28} />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              AI-powered supplemental training for student pilots.
              Not FAA-affiliated — for study use only. AI may produce errors; verify everything against current FAA publications and your POH/AFM.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h4 className="font-display text-xs tracking-[0.2em] uppercase text-foreground mb-1">
              Quick Links
            </h4>
            {["Services", "Features"].map((item) => (
              <Link
                key={item}
                to={`/#${item.toLowerCase()}`}
                title={`View SimPilot.AI ${item} — AI aviation training`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider"
              >
                {item}
              </Link>
            ))}
            <FooterLink to="/contact" title="Contact SimPilot.AI support team">Contact</FooterLink>
            <FooterLink to="/competitors#comparison-matrix" title="Compare SimPilot.AI vs competitors">Competitors</FooterLink>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h4 className="font-display text-xs tracking-[0.2em] uppercase text-foreground mb-1">
              Legal
            </h4>
            <FooterLink to="/terms" title="SimPilot.AI Terms & Conditions">Terms &amp; Conditions</FooterLink>
            <FooterLink to="/privacy" title="SimPilot.AI Privacy Policy">Privacy Policy</FooterLink>
            <FooterLink to="/cookie-preferences" title="Manage your SimPilot.AI cookie preferences">Cookie Preferences</FooterLink>
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
