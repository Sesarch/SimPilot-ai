import { Gauge, BookOpen, Mic, Radio, ClipboardList, LineChart, LogOut, Cable, Radar } from "lucide-react";
import Logo from "@/components/Logo";
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
  { title: "ATC Training", url: "/live-tools?tab=atc", icon: Radio },
  { title: "Flight Tracking", url: "/live-tools?tab=tracker", icon: Radar },
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
        <Link to="/dashboard" title="SimPilot.AI pilot training dashboard" className="flex min-h-14 items-center gap-2.5 px-2 pt-1 pb-2.5 -mt-1">
          {collapsed ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-gradient-to-br from-primary/30 to-accent/20 overflow-hidden">
              <Logo height={20} alt="SimPilot" />
            </div>
          ) : (
            <Logo height={28} />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
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
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-10">
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 font-display text-[13px] font-semibold tracking-[0.1em] uppercase"
                        activeClassName="text-accent"
                      >
                        <item.icon className="w-[18px] h-[18px] shrink-0" />
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
          <SidebarGroupContent className="px-2">
            <div className="rounded-md border-2 border-primary/40 bg-sidebar-accent/10 p-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith(bridgeItem.url)}
                    tooltip={bridgeItem.title}
                    className="h-10"
                  >
                    <NavLink
                      to={bridgeItem.url}
                      className="flex items-center gap-3 font-display text-[13px] font-semibold tracking-[0.1em] uppercase"
                      activeClassName="text-accent"
                    >
                      <bridgeItem.icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>{bridgeItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
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
              className="h-10 font-display text-[13px] font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
