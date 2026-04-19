import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import PilotIdentityChip from "./PilotIdentityChip";
import { useAuth } from "@/hooks/useAuth";
import { Plane } from "lucide-react";

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#101217] flex items-center justify-center">
        <Plane className="w-6 h-6 text-[#04C3EC] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="g3000 min-h-screen">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3">
              <SidebarTrigger className="self-center text-muted-foreground hover:text-primary" />
              <div className="h-5 w-px self-center bg-border" />
              <span className="flex items-center self-center font-display text-[10px] leading-none tracking-[0.25em] uppercase text-muted-foreground">
                SimPilot Avionics Suite
              </span>
              <div className="ml-auto flex h-full items-center gap-3 self-center">
                <div className="hidden items-center gap-2 md:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--hud-green))] animate-pulse" />
                  <span className="flex items-center font-display text-[10px] leading-none tracking-[0.2em] uppercase text-muted-foreground">
                    System Nominal
                  </span>
                </div>
                <div className="hidden h-5 w-px self-center bg-border md:block" />
                <PilotIdentityChip />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;
