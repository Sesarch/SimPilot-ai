import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
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
            <header className="h-12 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-3 gap-3 sticky top-0 z-40">
              <SidebarTrigger className="text-muted-foreground hover:text-primary" />
              <div className="h-4 w-px bg-border" />
              <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                SimPilot Avionics Suite
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--hud-green))] animate-pulse" />
                <span className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  System Nominal
                </span>
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
