import { Link } from "react-router-dom";
import { Plane } from "lucide-react";

const AuthBrand = () => (
  <Link
    to="/"
    title="SimPilot.AI — AI-Powered Pilot Training Home"
    className="flex items-center justify-center gap-2 mb-8"
  >
    <Plane className="w-8 h-8 text-primary" aria-hidden="true" />
    <span className="font-display text-2xl font-bold text-primary text-glow-cyan tracking-wider">
      SIM<span className="text-accent">PILOT</span>.AI
    </span>
  </Link>
);

export default AuthBrand;
