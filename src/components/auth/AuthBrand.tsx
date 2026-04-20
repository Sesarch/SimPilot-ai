import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const AuthBrand = () => (
  <Link
    to="/"
    title="SimPilot.AI — AI-Powered Pilot Training Home"
    className="flex items-center justify-center mb-8"
  >
    <Logo height={40} />
  </Link>
);

export default AuthBrand;
