import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, UserPlus, Search, Ban, Trash2, CheckCircle,
  LogOut, Plane, ArrowLeft, Crown, RefreshCw, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

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
  const [leads, setLeads] = useState<LeadEmail[]>([]);
  const [leadsFetching, setLeadsFetching] = useState(false);

  // Check admin role
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!user) return;
    supabase
      .from("user_roles" as any)
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
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });
      // Use fetch directly for GET with query params
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

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

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
    } catch (err: any) {
      toast.error(err.message);
    }
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
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmAction(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Plane className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Admin Dashboard — SimPilot.AI" description="Admin user management" keywords="admin, user management" noIndex />

      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display text-xl font-bold text-primary tracking-wider">
                ADMIN<span className="text-accent">PANEL</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <button
              onClick={() => { signOut(); navigate("/"); }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {users.filter((u) => !u.is_banned).length}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {users.filter((u) => u.is_banned).length}
                </p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invite */}
        <div className="bg-gradient-card rounded-xl border border-border p-5 mb-6">
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
        <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Joined</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-foreground">{u.display_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
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
                      {u.roles.includes("admin") ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                          <Crown className="w-3 h-3 mr-1" /> Admin
                        </Badge>
                      ) : u.roles.includes("moderator") ? (
                        <Badge variant="secondary" className="text-xs">Moderator</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">User</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Role toggle */}
                        {u.id !== user?.id && (
                          <>
                            {!u.roles.includes("admin") ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => setConfirmAction({ type: "role", userId: u.id, email: u.email, role: "admin" })}
                                title="Make Admin"
                              >
                                <Crown className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => setConfirmAction({ type: "role", userId: u.id, email: u.email, role: "user" })}
                                title="Remove Admin"
                              >
                                <Crown className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            )}
                            {/* Ban/Unban */}
                            {u.is_banned ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-green-500 h-7"
                                onClick={() => setConfirmAction({ type: "unban", userId: u.id, email: u.email })}
                                title="Reactivate"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-amber-500 h-7"
                                onClick={() => setConfirmAction({ type: "ban", userId: u.id, email: u.email })}
                                title="Suspend"
                              >
                                <Ban className="w-3 h-3" />
                              </Button>
                            )}
                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive h-7"
                              onClick={() => setConfirmAction({ type: "delete", userId: u.id, email: u.email })}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {u.id === user?.id && (
                          <span className="text-xs text-muted-foreground italic">You</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {fetching ? "Loading users..." : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
              {confirmAction?.type === "ban" && `Are you sure you want to suspend ${confirmAction.email}? They will not be able to sign in.`}
              {confirmAction?.type === "unban" && `Reactivate ${confirmAction?.email}? They will be able to sign in again.`}
              {confirmAction?.type === "delete" && `Permanently delete ${confirmAction?.email}? This action cannot be undone.`}
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
    </div>
  );
};

export default AdminPage;
