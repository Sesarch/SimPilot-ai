import logoUrl from "@/assets/logo.svg";

interface LogoProps {
  className?: string;
  /** Height in pixels. Width is auto from the SVG aspect ratio (~3.62:1). */
  height?: number;
  alt?: string;
}

/**
 * SimPilot.AI brand logo (full wordmark SVG).
 * Use this everywhere the brand needs to be displayed — never re-introduce
 * the Plane lucide icon next to the wordmark.
 */
const Logo = ({ className = "", height = 32, alt = "SimPilot.AI" }: LogoProps) => (
  <img
    src={logoUrl}
    alt={alt}
    height={height}
    style={{ height: `${height}px`, width: "auto" }}
    className={className}
    draggable={false}
  />
);

export default Logo;
