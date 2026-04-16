import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import MaintenancePage from "@/components/MaintenancePage";

const BYPASS_ROUTES = ["/admin", "/auth", "/contact"];

const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { settings, loading } = useSiteSettings();
  const location = useLocation();

  if (loading) return <>{children}</>;

  const isBypassed = BYPASS_ROUTES.some((r) => location.pathname.startsWith(r));

  if (settings.maintenance_mode && !isBypassed) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
};

export default MaintenanceGate;
