import { Link, useNavigate, useLocation } from "react-router-dom";
import { Facebook, Instagram, Youtube, Twitter, Linkedin, Music2 } from "lucide-react";
import Logo from "@/components/Logo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { settings } = useSiteSettings();
  const socials = [
    { url: settings.social_facebook_url, Icon: Facebook, label: "Facebook" },
    { url: settings.social_instagram_url, Icon: Instagram, label: "Instagram" },
    { url: settings.social_youtube_url, Icon: Youtube, label: "YouTube" },
    { url: settings.social_x_url, Icon: Twitter, label: "X" },
    { url: settings.social_linkedin_url, Icon: Linkedin, label: "LinkedIn" },
    { url: settings.social_tiktok_url, Icon: Music2, label: "TikTok" },
  ].filter((s) => s.url && s.url.trim().length > 0);
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
            <FooterLink to="/support" title="SimPilot.AI Support & Help Center">Support</FooterLink>
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
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-xs text-muted-foreground order-2 md:order-1">
            © {new Date().getFullYear()} SimPilot.ai — All rights reserved.
          </p>
          <div className="flex flex-col items-center gap-3 order-1 md:order-2 md:flex-row md:gap-4">
            {socials.length > 0 && (
              <div className="flex items-center gap-3">
                {socials.map(({ url, Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Follow SimPilot.AI on ${label}`}
                    aria-label={`Follow SimPilot.AI on ${label}`}
                    className="group relative inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-card/60 border border-border text-muted-foreground hover:text-primary hover:border-primary/70 hover:bg-primary/10 hover:-translate-y-0.5 hover:shadow-[0_0_18px_hsl(var(--cyan-glow)/0.4)] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon className="w-4 h-4 transition-transform duration-300 ease-out group-hover:scale-110" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground tracking-wide">
              Built for pilots, powered by AI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
