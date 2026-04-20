import logoUrl from "@/assets/logo.svg";

interface LogoProps {
  className?: string;
  /**
   * Base height in pixels. The logo automatically scales:
   * - Mobile (<768px): 1.5× the base height
   * - Desktop (≥768px): 1.8× the base height
   * Width auto-derives from the SVG aspect ratio (~3.62:1).
   */
  height?: number;
  alt?: string;
}

/**
 * SimPilot.AI brand logo (full wordmark SVG).
 * Use this everywhere the brand needs to be displayed — never re-introduce
 * the Plane lucide icon next to the wordmark.
 */
const Logo = ({ className = "", height = 32, alt = "SimPilot.AI" }: LogoProps) => {
  const mobileHeight = Math.round(height * 1.5);
  const desktopHeight = Math.round(height * 1.8);
  return (
    <img
      src={logoUrl}
      alt={alt}
      style={
        {
          height: `${mobileHeight}px`,
          width: "auto",
          // Desktop override via CSS custom property + media query
          ["--logo-h-desktop" as any]: `${desktopHeight}px`,
        } as React.CSSProperties
      }
      className={`md:!h-[var(--logo-h-desktop)] ${className}`}
      draggable={false}
    />
  );
};

export default Logo;
