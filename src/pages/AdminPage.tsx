import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, UserPlus, Search, Ban, Trash2, CheckCircle,
  LogOut, Plane, ArrowLeft, Crown, RefreshCw, Mail, Download, Gift,
} from "lucide-react";
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
import AdminKnowledgeBase from "@/components/AdminKnowledgeBase";
import AdminPayments from "@/components/AdminPayments";
import AdminReports from "@/components/AdminReports";
import AdminAuditLog from "@/components/AdminAuditLog";

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
  last_transmission_at: string | null;
  total_sim_hours: number;
  comp_grant: { plan_tier: string; expires_at: string | null } | null;
};

type LeadEmail = {
  id: string;
  email: string;
  created_at: string;
  pilot_context: Record<string, string | null> | null;
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
  const [leads, setLeads] = useState<LeadEmail[]>([]);
  const [leadsFetching, setLeadsFetching] = useState(false);

  const validTabs = ["overview","payments","reports","users","audit","leads","schools","emails","models","kb","settings"];
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

  const filteredUsers = users.filter(
    (u) =>
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-background">
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
              <span className="font-display text-3xl font-black leading-[1] text-foreground tracking-[0.18em] drop-shadow-[0_2px_8px_hsl(var(--primary)/0.4)]">
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
          <TabsList className="w-full grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 mb-8">
            <TabsTrigger value="overview" className="font-display text-xs tracking-wider">Overview</TabsTrigger>
            <TabsTrigger value="payments" className="font-display text-xs tracking-wider">Payments</TabsTrigger>
            <TabsTrigger value="reports" className="font-display text-xs tracking-wider">Reports</TabsTrigger>
            <TabsTrigger value="users" className="font-display text-xs tracking-wider">Users</TabsTrigger>
            <TabsTrigger value="audit" className="font-display text-xs tracking-wider">Audit</TabsTrigger>
            <TabsTrigger value="leads" className="font-display text-xs tracking-wider">Leads</TabsTrigger>
            <TabsTrigger value="schools" className="font-display text-xs tracking-wider">Schools</TabsTrigger>
            <TabsTrigger value="emails" className="font-display text-xs tracking-wider">Emails</TabsTrigger>
            <TabsTrigger value="models" className="font-display text-xs tracking-wider">Models</TabsTrigger>
            <TabsTrigger value="kb" className="font-display text-xs tracking-wider">Knowledge</TabsTrigger>
            <TabsTrigger value="settings" className="font-display text-xs tracking-wider">Settings</TabsTrigger>
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
                      <p className="text-2xl font-display font-bold text-foreground">{users.length}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{users.filter(u => !u.is_banned).length}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{users.filter(u => u.is_banned).length}</p>
                      <p className="text-xs text-muted-foreground">Suspended</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{leads.length}</p>
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

          <TabsContent value="users">
            {/* Invite */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5 mb-6">
              <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
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
                          <p className="font-medium text-foreground">{u.display_name || "—"}</p>
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
                          <div className="flex items-center justify-end gap-1">
                            {u.id !== user?.id ? (
                              <>
                                {!u.roles.includes("admin") ? (
                                  <Button variant="ghost" size="sm" className="text-xs h-7" title="Make Admin"
                                    onClick={() => setConfirmAction({ type: "role", userId: u.id, email: u.email, role: "admin" })}>
                                    <Crown className="w-3 h-3" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" className="text-xs h-7" title="Remove Admin"
                                    onClick={() => setConfirmAction({ type: "role", userId: u.id, email: u.email, role: "user" })}>
                                    <Crown className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                )}
                                {u.is_banned ? (
                                  <Button variant="ghost" size="sm" className="text-xs text-green-500 h-7" title="Reactivate"
                                    onClick={() => setConfirmAction({ type: "unban", userId: u.id, email: u.email })}>
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" className="text-xs text-amber-500 h-7" title="Suspend"
                                    onClick={() => setConfirmAction({ type: "ban", userId: u.id, email: u.email })}>
                                    <Ban className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="text-xs text-amber-500 h-7" title="Grant comp access"
                                  onClick={() => { setGrantTier("pro"); setGrantReason(""); setGrantDialog({ userId: u.id, email: u.email }); }}>
                                  <Gift className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" title="Delete"
                                  onClick={() => setConfirmAction({ type: "delete", userId: u.id, email: u.email })}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">You</span>
                            )}
                          </div>
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
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
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
                        <td className="p-3 font-medium text-foreground">{lead.email}</td>
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
          </TabsContent>

          <TabsContent value="kb">
            <AdminKnowledgeBase />
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
    </div>
  );
};

export default AdminPage;
