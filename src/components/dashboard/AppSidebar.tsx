import { Gauge, BookOpen, Mic, Radio, ClipboardList, LineChart, LogOut, Cable, Radar, Zap, Cloud } from "lucide-react";
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
  { title: "Quick Answer", url: "/quick-answer", icon: Zap },
  { title: "Ground One-on-One", url: "/ground-school", icon: BookOpen },
  { title: "Oral Exam Sim", url: "/oral-exam", icon: Mic },
  { title: "ATC Training", url: "/live-tools?tab=atc", icon: Radio },
  { title: "Flight Tracking", url: "/live-tools?tab=tracker", icon: Radar },
  { title: "Weather Briefing", url: "/weather-briefing", icon: Cloud },
  { title: "Logbook", url: "/logbook", icon: ClipboardList },
  { title: "Analytics", url: "/progress", icon: LineChart },
];

const bridgeItem = { title: "SimConnect Bridge", url: "/flight-deck/bridge", icon: Cable };

const glowTooltip = (label: string) => ({
  children: (
    <span className="font-display text-[11px] font-semibold tracking-[0.18em] uppercase text-white drop-shadow-[0_0_6px_hsl(var(--accent))]">
      {label}
    </span>
  ),
  className: "max-w-[min(260px,calc(100vw-1.5rem))] whitespace-normal break-words border-accent/40 bg-background/95",
  sideOffset: 12,
  collisionPadding: 12,
  avoidCollisions: true,
});

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
                const [pathOnly, queryStr = ""] = item.url.split("?");
                const itemTab = new URLSearchParams(queryStr).get("tab");
                const currentTab = new URLSearchParams(location.search).get("tab");
                const active =
                  pathOnly === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : itemTab
                      ? location.pathname === pathOnly && currentTab === itemTab
                      : location.pathname.startsWith(pathOnly);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={glowTooltip(item.title)} className="h-10">
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
                    disabled
                    aria-disabled="true"
                    tooltip={glowTooltip(`${bridgeItem.title} — Coming soon!`)}
                    className="h-10 cursor-not-allowed opacity-100 hover:bg-transparent hover:text-current"
                  >
                    <div className="flex w-full items-center gap-3 font-display text-[13px] font-semibold tracking-[0.1em] uppercase">
                      <bridgeItem.icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>{bridgeItem.title}</span>}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {!collapsed && (
                <div className="px-2 pb-1 pt-0.5 pl-[38px] text-[10px] font-display tracking-[0.15em] uppercase text-white drop-shadow-[0_0_6px_hsl(var(--accent))]">
                  Coming soon!
                </div>
              )}
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
