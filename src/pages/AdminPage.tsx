import { useEffect, useState, useCallback, Fragment, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, UserPlus, Search, Ban, Trash2, CheckCircle,
  LogOut, Plane, ArrowLeft, Crown, RefreshCw, Mail, Download, Gift, CalendarClock, MoreHorizontal,
  LayoutDashboard, CreditCard, FileBarChart, ScrollText, AlertTriangle, Sparkles, GraduationCap,
  Brain, BookOpen, Globe, Settings,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SEOHead from "@/components/SEOHead";
import AdminEmailDashboard from "@/components/AdminEmailDashboard";
import AdminSupportChats from "@/components/AdminSupportChats";
import AdminAnalytics from "@/components/AdminAnalytics";
import AdminSiteSettings from "@/components/AdminSiteSettings";
import AdminMissingAcsCodes from "@/components/AdminMissingAcsCodes";
import AdminSchoolInquiries from "@/components/AdminSchoolInquiries";
import AdminModelSettings from "@/components/AdminModelSettings";
import AdminOrchestratorTester from "@/components/AdminOrchestratorTester";
import AdminKnowledgeBase from "@/components/AdminKnowledgeBase";
import AdminPayments from "@/components/AdminPayments";
import AdminReports from "@/components/AdminReports";
import AdminAuditLog from "@/components/AdminAuditLog";
import AdminErrorEvents from "@/components/AdminErrorEvents";
import AdminSeo from "@/components/AdminSeo";

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  is_banned: boolean;
  roles: string[];
  display_name: string | null;
  terms_agreed_at: string | null;
  trial_ends_at: string | null;
  last_transmission_at: string | null;
  total_sim_hours: number;
  comp_grant: { plan_tier: string; expires_at: string | null } | null;
  extended_months?: number;
};

type LeadEmail = {
  id: string;
  email: string;
  created_at: string;
  pilot_context: Record<string, string | null> | null;
};

/**
 * Controlled dropdown wrapper: explicitly closes the menu before firing the
 * action so the row never feels "stuck open" on mobile, and any follow-up
 * dialog opens cleanly without focus contention.
 */
const RowActionsMenu = ({ children }: { children: (run: (fn: () => void) => () => void) => ReactNode }) => {
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => () => {
    setOpen(false);
    requestAnimationFrame(() => fn());
  };
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Actions">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {children(run)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AdminPage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "unban" | "delete" | "role";
    userId: string;
    email: string;
    role?: string;
  } | null>(null);
  const [grantDialog, setGrantDialog] = useState<{ userId: string; email: string } | null>(null);
  const [grantTier, setGrantTier] = useState("pro");
  const [grantReason, setGrantReason] = useState("");
  const [grantExpires, setGrantExpires] = useState("");
  const [granting, setGranting] = useState(false);
  const [extendDialog, setExtendDialog] = useState<{ userId: string; email: string; currentEndsAt: string | null } | null>(null);
  const [extendMonths, setExtendMonths] = useState<string>("1");
  const [extendReason, setExtendReason] = useState("");
  const [extending, setExtending] = useState(false);
  const [leads, setLeads] = useState<LeadEmail[]>([]);
  const [leadsFetching, setLeadsFetching] = useState(false);

  const validTabs = ["overview","payments","reports","users","audit","leads","schools","emails","models","kb","seo","settings"];
  const getInitialTab = () => {
    if (typeof window === "undefined") return "overview";
    const params = new URLSearchParams(window.location.search);
    const q = params.get("tab");
    if (q && validTabs.includes(q)) return q;
    const h = window.location.hash.replace("#", "");
    return validTabs.includes(h) ? h : "overview";
  };
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    const onChange = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("tab");
      if (q && validTabs.includes(q)) { setActiveTab(q); return; }
      const h = window.location.hash.replace("#", "");
      if (validTabs.includes(h)) setActiveTab(h);
    };
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const current = params.get("tab");
      params.set("tab", v);
      const newUrl = `${window.location.pathname}?${params.toString()}#${v}`;
      // Use pushState on real tab changes so browser back/forward navigates
      // between tabs; replaceState only when initializing/normalizing the URL.
      if (current === v) {
        history.replaceState(null, "", newUrl);
      } else {
        history.pushState(null, "", newUrl);
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { state: { redirectTo: "/admin" } });
      return;
    }
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsAdmin(true);
        else {
          setIsAdmin(false);
          navigate("/dashboard");
          toast.error("Access denied: admin privileges required");
        }
      });
  }, [user, loading, navigate]);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setUsers(result.users || []);
    } catch (err: any) {
      toast.error("Failed to load users: " + err.message);
    }
    setFetching(false);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLeadsFetching(true);
    try {
      const { data, error } = await supabase
        .from("lead_emails")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads((data as any) || []);
    } catch (err: any) {
      toast.error("Failed to load leads: " + err.message);
    }
    setLeadsFetching(false);
  }, []);

  useEffect(() => {
    if (isAdmin) { fetchUsers(); fetchLeads(); }
  }, [isAdmin, fetchUsers, fetchLeads]);

  const callAdmin = async (action: string, body: Record<string, any>) => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await callAdmin("invite", { email: inviteEmail.trim() });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
    setInviting(false);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "ban") {
        await callAdmin("ban", { userId: confirmAction.userId });
        toast.success(`${confirmAction.email} has been suspended`);
      } else if (confirmAction.type === "unban") {
        await callAdmin("unban", { userId: confirmAction.userId });
        toast.success(`${confirmAction.email} has been reactivated`);
      } else if (confirmAction.type === "delete") {
        await callAdmin("delete", { userId: confirmAction.userId });
        toast.success(`${confirmAction.email} has been deleted`);
      } else if (confirmAction.type === "role") {
        await callAdmin("set-role", { userId: confirmAction.userId, role: confirmAction.role });
        toast.success(`Role updated for ${confirmAction.email}`);
      }
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
    setConfirmAction(null);
  };

  const handleGrant = async () => {
    if (!grantDialog) return;
    setGranting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payments?action=grant-comp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: grantDialog.userId,
            plan_tier: grantTier,
            reason: grantReason.trim() || null,
            expires_at: grantExpires ? new Date(grantExpires).toISOString() : null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant comp");
      toast.success(`Granted ${grantTier} access to ${grantDialog.email}`);
      setGrantDialog(null);
      setGrantReason("");
      setGrantExpires("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setGranting(false);
  };

  const handleExtendTrial = async () => {
    if (!extendDialog) return;
    const months = Number(extendMonths);
    if (!Number.isFinite(months) || months <= 0 || months > 120) {
      toast.error("Enter 1–120 months");
      return;
    }
    setExtending(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payments?action=extend-trial`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: extendDialog.userId,
            months,
            reason: extendReason.trim() || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend trial");
      toast.success(
        `Extended trial for ${extendDialog.email} by ${months} month${months === 1 ? "" : "s"}. New end: ${new Date(data.trial_ends_at).toLocaleDateString()}`
      );
      setExtendDialog(null);
      setExtendReason("");
      setExtendMonths("1");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setExtending(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Single source of truth for per-user row actions.
   * Both the desktop icon strip AND the mobile dropdown render from this list,
   * so any future role/permission change only needs to be made here.
   *
   * Add gating logic (e.g. `if (!hasPermission("ban")) return;`) inside this
   * function and both UIs will update automatically.
   */
  type RowAction = {
    key: string;
    label: string;
    icon: LucideIcon;
    iconClassName?: string;
    tone?: "default" | "success" | "warning" | "info" | "destructive";
    destructive?: boolean;
    separatorBefore?: boolean;
    onSelect: () => void;
  };

  const userRowActions = (u: AdminUser): RowAction[] => {
    const actions: RowAction[] = [];

    // Role toggle
    if (!u.roles.includes("admin")) {
      actions.push({
        key: "make-admin",
        label: "Make Admin",
        icon: Crown,
        onSelect: () => setConfirmAction({ type: "role", userId: u.id, email: u.email, role: "admin" }),
      });
    } else {
      actions.push({
        key: "remove-admin",
        label: "Remove Admin",
        icon: Crown,
        iconClassName: "text-muted-foreground",
        onSelect: () => setConfirmAction({ type: "role", userId: u.id, email: u.email, role: "user" }),
      });
    }

    // Ban / unban
    if (u.is_banned) {
      actions.push({
        key: "unban",
        label: "Reactivate",
        icon: CheckCircle,
        tone: "success",
        iconClassName: "text-green-500",
        onSelect: () => setConfirmAction({ type: "unban", userId: u.id, email: u.email }),
      });
    } else {
      actions.push({
        key: "ban",
        label: "Suspend",
        icon: Ban,
        tone: "warning",
        iconClassName: "text-amber-500",
        onSelect: () => setConfirmAction({ type: "ban", userId: u.id, email: u.email }),
      });
    }

    // Trial extension
    actions.push({
      key: "extend-trial",
      label: "Extend trial",
      icon: CalendarClock,
      tone: "info",
      iconClassName: "text-cyan-500",
      onSelect: () => {
        setExtendMonths("1");
        setExtendReason("");
        setExtendDialog({ userId: u.id, email: u.email, currentEndsAt: u.trial_ends_at });
      },
    });

    // Comp grant
    actions.push({
      key: "grant-comp",
      label: "Grant comp access",
      icon: Gift,
      tone: "warning",
      iconClassName: "text-amber-500",
      onSelect: () => {
        setGrantTier("pro");
        setGrantReason("");
        setGrantDialog({ userId: u.id, email: u.email });
      },
    });

    // Delete (always last, separated)
    actions.push({
      key: "delete",
      label: "Delete user",
      icon: Trash2,
      tone: "destructive",
      iconClassName: "text-destructive",
      destructive: true,
      separatorBefore: true,
      onSelect: () => setConfirmAction({ type: "delete", userId: u.id, email: u.email }),
    });

    return actions;
  };

  // Tooltip labels for the desktop icon strip (longer than the dropdown label
  // when it adds useful context).
  const desktopActionTitle = (action: RowAction): string => {
    if (action.key === "extend-trial") return "Extend free trial (full access)";
    return action.label;
  };

  // Tailwind class for desktop icon button text colour, derived from tone.
  const toneToClass = (tone?: RowAction["tone"]): string => {
    switch (tone) {
      case "success": return "text-green-500";
      case "warning": return "text-amber-500";
      case "info": return "text-cyan-500";
      case "destructive": return "text-destructive";
      default: return "";
    }
  };


  const exportLeadsCSV = () => {
    if (!leads.length) return;
    const headers = ["Email", "Date", "Pilot Context"];
    const rows = leads.map(l => [
      l.email,
      new Date(l.created_at).toLocaleDateString(),
      l.pilot_context ? Object.entries(l.pilot_context).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "lead_emails.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Plane className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="admin-scope min-h-screen bg-background">
      <SEOHead title="Admin Dashboard — SimPilot.AI" description="Admin management" keywords="admin" noIndex />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b-2 border-primary/50 bg-background shadow-[0_4px_20px_-6px_hsl(var(--primary)/0.4)]">
        <div className="container mx-auto px-6 py-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" title="Return to your SimPilot.AI pilot training dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link to="/" title="SimPilot.AI home" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Shield className="w-8 h-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] shrink-0 translate-y-[1px]" />
              <span className="font-display text-3xl leading-[1] text-foreground tracking-[0.18em] drop-shadow-[0_2px_8px_hsl(var(--primary)/0.4)]">
                ADMIN<span className="text-primary">PANEL</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-xs gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/*
            Breakpoint-based grid:
            - ultra-narrow (default, <640px): 3 per row — small phones
            - sm (≥640px):                    2 per row — bigger touch targets
            - md (≥768px):                    7 per row — tablet, two rows
            - lg (≥1024px):                  13 per row — full strip on desktop
            h-auto so the TabsList grows with multi-row layouts.
          */}
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1 h-auto mb-8 p-1.5 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm">
            {[
              ["overview", "Overview"],
              ["payments", "Payments"],
              ["reports", "Reports"],
              ["users", "Users"],
              ["audit", "Audit"],
              ["errors", "Errors"],
              ["leads", "Leads"],
              ["schools", "Schools"],
              ["emails", "Emails"],
              ["models", "Models"],
              ["kb", "Knowledge"],
              ["seo", "SEO"],
              ["settings", "Settings"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-2.5 py-1.5 text-[13px] font-medium tracking-normal text-muted-foreground rounded-md transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-8">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-display text-foreground">{users.length}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-display text-foreground">{users.filter(u => !u.is_banned).length}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="text-2xl font-display text-foreground">{users.filter(u => u.is_banned).length}</p>
                      <p className="text-xs text-muted-foreground">Suspended</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-2xl font-display text-foreground">{leads.length}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                  </div>
                </div>
              </div>

              <AdminAnalytics />
              <AdminSupportChats />
            </div>
          </TabsContent>

          <TabsContent value="payments"><AdminPayments /></TabsContent>
          <TabsContent value="reports"><AdminReports /></TabsContent>
          <TabsContent value="audit"><AdminAuditLog /></TabsContent>
          <TabsContent value="errors"><AdminErrorEvents /></TabsContent>

          <TabsContent value="users">
            {/* Invite */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5 mb-6">
              <h2 className="font-display text-sm text-foreground mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Invite New User
              </h2>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </div>

            {/* Search & Refresh */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchUsers} disabled={fetching}>
                <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Users Table */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden">
              <div className="admin-table-wrap overflow-x-auto">
                <table className="admin-table w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">User</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Plan/Role</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Last Tx</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Sim Hrs</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Joined</th>
                      <th className="text-right p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="p-3">
                          <p className="text-foreground">{u.display_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="p-3">
                          {u.is_banned ? (
                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                          ) : u.email_confirmed_at ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Pending</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {u.roles.includes("admin") ? (
                              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs w-fit">
                                <Crown className="w-3 h-3 mr-1" /> Admin
                              </Badge>
                            ) : u.roles.includes("moderator") ? (
                              <Badge variant="secondary" className="text-xs w-fit">Moderator</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">User</span>
                            )}
                            {u.comp_grant && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] w-fit">
                                <Gift className="w-2.5 h-2.5 mr-1" /> Comp: {u.comp_grant.plan_tier}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {u.last_transmission_at ? new Date(u.last_transmission_at).toLocaleDateString() : "Never"}
                        </td>
                        <td className="p-3 text-xs">{u.total_sim_hours.toFixed(1)}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {u.id !== user?.id ? (
                            <>
                              {(() => {
                                const actions = userRowActions(u);
                                return (
                                  <>
                                    {/* Desktop / tablet: inline icon strip */}
                                    <div className="hidden sm:flex items-center justify-end gap-1">
                                      {actions.map((action) => {
                                        const Icon = action.icon;
                                        const toneClass = toneToClass(action.tone);
                                        const extMonths = action.key === "extend-trial" ? (u.extended_months ?? 0) : 0;
                                        const showExtBadge = extMonths > 0;
                                        return (
                                          <Button
                                            key={action.key}
                                            variant="ghost"
                                            size="sm"
                                            className={`relative text-xs h-7 ${toneClass}`}
                                            title={showExtBadge ? `${desktopActionTitle(action)} — extended ${extMonths} mo` : desktopActionTitle(action)}
                                            onClick={action.onSelect}
                                          >
                                            <Icon className={`w-3 h-3 ${action.iconClassName ?? ""}`} />
                                            {showExtBadge && (
                                              <span
                                                aria-label={`Extended ${extMonths} months`}
                                                className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full bg-green-500 text-[9px] font-semibold leading-[14px] text-white text-center shadow-sm border border-background"
                                              >
                                                {extMonths % 1 === 0 ? extMonths : extMonths.toFixed(1)}
                                              </span>
                                            )}
                                          </Button>
                                        );
                                      })}
                                    </div>

                                    {/* Mobile: collapsed dropdown menu (auto-closes on select) */}
                                    <div className="flex sm:hidden justify-end">
                                      <RowActionsMenu>
                                        {(run) => (
                                          <>
                                            {actions.map((action, idx) => {
                                              const Icon = action.icon;
                                              return (
                                                <Fragment key={action.key}>
                                                  {action.separatorBefore && idx > 0 && <DropdownMenuSeparator />}
                                                  <DropdownMenuItem
                                                    className={action.destructive ? "text-destructive focus:text-destructive" : ""}
                                                    onSelect={run(action.onSelect)}
                                                  >
                                                    <Icon className={`w-4 h-4 mr-2 ${action.iconClassName ?? ""}`} />
                                                    {action.label}
                                                  </DropdownMenuItem>
                                                </Fragment>
                                              );
                                            })}
                                          </>
                                        )}
                                      </RowActionsMenu>
                                    </div>
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic block text-right">You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          {fetching ? "Loading users..." : "No users found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Lead Emails
                <Badge variant="secondary" className="ml-2 text-xs">{leads.length}</Badge>
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportLeadsCSV} disabled={!leads.length}>
                  <Download className="w-4 h-4 mr-1.5" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={fetchLeads} disabled={leadsFetching}>
                  <RefreshCw className={`w-4 h-4 ${leadsFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Pilot Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="p-3 text-foreground">{lead.email}</td>
                        <td className="p-3 text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleString()}</td>
                        <td className="p-3">
                          {lead.pilot_context ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(lead.pilot_context).filter(([, v]) => v).map(([k, v]) => (
                                <Badge key={k} variant="secondary" className="text-[10px]">
                                  {k.replace(/_/g, " ")}: {v}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-muted-foreground">
                          {leadsFetching ? "Loading leads..." : "No lead emails collected yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Schools Tab */}
          <TabsContent value="schools">
            <AdminSchoolInquiries />
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails">
            <AdminEmailDashboard />
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <AdminModelSettings />
            <div className="mt-6">
              <AdminOrchestratorTester />
            </div>
          </TabsContent>

          <TabsContent value="kb">
            <AdminKnowledgeBase />
          </TabsContent>

          <TabsContent value="seo">
            <AdminSeo />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <AdminSiteSettings />
              <AdminMissingAcsCodes />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "ban" && "Suspend User"}
              {confirmAction?.type === "unban" && "Reactivate User"}
              {confirmAction?.type === "delete" && "Delete User"}
              {confirmAction?.type === "role" && `Change Role to ${confirmAction.role}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "ban" && `Are you sure you want to suspend ${confirmAction.email}?`}
              {confirmAction?.type === "unban" && `Reactivate ${confirmAction?.email}?`}
              {confirmAction?.type === "delete" && `Permanently delete ${confirmAction?.email}? This cannot be undone.`}
              {confirmAction?.type === "role" && `Set ${confirmAction?.email}'s role to "${confirmAction.role}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Comp Dialog */}
      <Dialog open={!!grantDialog} onOpenChange={(o) => !o && setGrantDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" /> Grant Comp Access
            </DialogTitle>
            <DialogDescription>
              Give {grantDialog?.email} free access to a paid plan tier. This bypasses Stripe and is logged to the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="grant-tier">Plan Tier</Label>
              <Select value={grantTier} onValueChange={setGrantTier}>
                <SelectTrigger id="grant-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="gold_seal">Gold Seal CFI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-reason">Reason (optional)</Label>
              <Input
                id="grant-reason"
                placeholder="Beta tester, partner, support credit…"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-expires">Expires (optional)</Label>
              <Input
                id="grant-expires"
                type="date"
                value={grantExpires}
                onChange={(e) => setGrantExpires(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank for no expiration.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog(null)} disabled={granting}>Cancel</Button>
            <Button onClick={handleGrant} disabled={granting}>
              {granting ? "Granting…" : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={(o) => !o && setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-cyan-500" /> Extend Free Trial
            </DialogTitle>
            <DialogDescription>
              Extend <span className="text-foreground">{extendDialog?.email}</span>'s
              free trial by any number of months. While the trial is active, the user has full
              access (equivalent to Ultra). This bypasses Stripe and is logged to the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Current trial ends:{" "}
              <span className="text-foreground">
                {extendDialog?.currentEndsAt
                  ? new Date(extendDialog.currentEndsAt).toLocaleDateString()
                  : "—"}
              </span>
              {extendDialog?.currentEndsAt &&
                new Date(extendDialog.currentEndsAt).getTime() < Date.now() && (
                  <span className="ml-2 text-amber-500">(expired — extension starts from today)</span>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="extend-months">Months to add</Label>
              <Input
                id="extend-months"
                type="number"
                min={1}
                max={120}
                step={1}
                value={extendMonths}
                onChange={(e) => setExtendMonths(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter any whole number from 1 to 120.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extend-reason">Reason (optional)</Label>
              <Input
                id="extend-reason"
                placeholder="Beta tester, partner, customer goodwill…"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)} disabled={extending}>
              Cancel
            </Button>
            <Button onClick={handleExtendTrial} disabled={extending}>
              {extending ? "Extending…" : "Extend Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
