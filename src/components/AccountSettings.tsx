import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Mail, Trash2, AlertTriangle, GraduationCap, Globe, Copy, ExternalLink } from "lucide-react";
import { usePilotContext } from "@/hooks/usePilotContext";

const TRACK_OPTIONS = [
  { value: "PPL", label: "PPL — Private Pilot" },
  { value: "IR", label: "IR — Instrument Rating" },
  { value: "CPL", label: "CPL — Commercial Pilot" },
  { value: "ATP", label: "ATP — Airline Transport Pilot" },
];

function normalizeTrack(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.toLowerCase();
  if (v.includes("atp") || v.includes("airline transport")) return "ATP";
  if (v.includes("instrument") || v === "ir") return "IR";
  if (v.includes("commercial") || v === "cpl") return "CPL";
  if (v.includes("private") || v === "ppl" || v.includes("student") || v.includes("sport") || v.includes("recreational")) return "PPL";
  return "";
}
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AccountSettings = () => {
  const { user } = useAuth();
  const { context, updateField } = usePilotContext();
  const currentTrack = normalizeTrack(context.certificate_type);
  const handleTrackChange = (value: string) => {
    updateField("certificate_type", value);
    toast.success(`Study Track set to ${value}. Your CFI-AI will use ${value} ACS depth.`);
  };
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [profilePublic, setProfilePublic] = useState<boolean | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("profile_public")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfilePublic((data as any)?.profile_public ?? true);
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleTogglePrivacy = async (next: boolean) => {
    if (!user) return;
    setSavingPrivacy(true);
    setProfilePublic(next); // optimistic
    const { error } = await supabase
      .from("profiles")
      .update({ profile_public: next } as any)
      .eq("user_id", user.id);
    setSavingPrivacy(false);
    if (error) {
      setProfilePublic(!next);
      toast.error("Couldn't update privacy. Try again.");
    } else {
      toast.success(next ? "Profile is now public" : "Profile is now private");
    }
  };

  const publicProfileUrl = user ? `${window.location.origin}/pilot/${user.id}` : "";

  const copyProfileUrl = async () => {
    if (!publicProfileUrl) return;
    await navigator.clipboard.writeText(publicProfileUrl);
    toast.success("Public profile link copied");
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("Confirmation email sent to your new address. Please verify to complete the change.");
      setNewEmail("");
    }
    setChangingEmail(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    // Account deletion requires an edge function with service role
    toast.error("Please contact support to delete your account.");
    setShowDeleteDialog(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="space-y-6">
      {/* Study Track */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> Study Track
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Sets the ACS depth your CFI-AI uses across Ground School, Oral Exam, and chat. Syncs across devices.
        </p>
        <Select value={currentTrack} onValueChange={handleTrackChange}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select your certificate level" />
          </SelectTrigger>
          <SelectContent>
            {TRACK_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p><span className="font-semibold text-foreground">PPL</span> — VFR fundamentals, basic aerodynamics, Part 91</p>
          <p><span className="font-semibold text-foreground">IR</span> — IFR procedures, approach plates, weather minima</p>
          <p><span className="font-semibold text-foreground">CPL</span> — Commercial maneuvers, complex aircraft, Part 119</p>
          <p><span className="font-semibold text-foreground">ATP</span> — High-altitude, multi-crew CRM, Part 121/135</p>
        </div>
      </div>

      {/* Change Email */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" /> Change Email
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Current: <span className="text-foreground">{user?.email}</span>
        </p>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail.trim()} size="sm">
            {changingEmail ? "Sending..." : "Update"}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> Change Password
        </h3>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
            size="sm"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-6">
        <h3 className="font-display text-sm font-semibold text-destructive mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all training progress, session history,
              and profile data. Type <strong>DELETE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSettings;
