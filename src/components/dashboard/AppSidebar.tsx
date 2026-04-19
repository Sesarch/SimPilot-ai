import { Gauge, BookOpen, Mic, Radio, ClipboardList, LineChart, LogOut, Plane, Cable } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const navItems = [
  { title: "Flight Deck", url: "/dashboard", icon: Gauge },
  { title: "Ground School", url: "/ground-school", icon: BookOpen },
  { title: "Oral Exam Sim", url: "/oral-exam", icon: Mic },
  { title: "ATC Radio", url: "/live-tools", icon: Radio },
  { title: "Logbook", url: "/logbook", icon: ClipboardList },
  { title: "Analytics", url: "/progress", icon: LineChart },
];

const bridgeItem = { title: "SimConnect Bridge", url: "/flight-deck/bridge", icon: Cable };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/30">
            <Plane className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-display text-sm font-bold tracking-[0.18em] text-foreground">
              SIM<span className="text-accent">PILOT</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
            {!collapsed && "Avionics"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active =
                  item.url === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 font-display text-[12px] tracking-wider uppercase"
                        activeClassName="text-accent"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SimConnect Bridge — framed for visual emphasis */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith(bridgeItem.url)}
                  tooltip={bridgeItem.title}
                  className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/20 hover:bg-sidebar-accent/40"
                >
                  <NavLink
                    to={bridgeItem.url}
                    className="flex items-center gap-3 font-display text-[12px] tracking-wider uppercase"
                    activeClassName="text-accent"
                  >
                    <bridgeItem.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{bridgeItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              tooltip="Sign Out"
              className="font-display text-[12px] tracking-wider uppercase text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
