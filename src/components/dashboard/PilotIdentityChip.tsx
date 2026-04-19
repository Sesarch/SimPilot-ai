import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, Settings, ChevronDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  certificate_type: string | null;
};

const PilotIdentityChip = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("display_name, avatar_url, certificate_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const callsign =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Pilot";
  const cert = profile?.certificate_type?.trim() || "Pilot";
  const initials = callsign
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Pilot identity menu"
          className="group flex h-9 items-center gap-2 rounded-md border border-border/60 bg-background/40 pl-1 pr-2 transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Avatar className="h-6 w-6 border border-primary/30">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={callsign} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/10 text-[9px] font-display tracking-wider text-primary">
              {initials || <User className="w-3 h-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-col justify-center sm:flex">
            <span className="max-w-[120px] truncate font-display text-[10px] leading-none tracking-[0.18em] uppercase text-foreground">
              {callsign}
            </span>
            <span
              className="max-w-[120px] truncate font-display text-[8px] leading-none tracking-[0.2em] uppercase text-muted-foreground"
              style={{ color: "hsl(var(--amber-instrument))" }}
            >
              {cert}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 shrink-0 self-center text-muted-foreground transition-colors group-hover:text-primary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-background/95 backdrop-blur-xl border-border"
      >
        <DropdownMenuLabel className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Signed In
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="font-display text-xs tracking-wider uppercase text-foreground truncate">
            {callsign}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {user.email}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/account"
            className="font-display text-[11px] tracking-wider uppercase cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 mr-2" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            const url = `${window.location.origin}/pilot/${user.id}`;
            if (navigator.share) {
              try { await navigator.share({ title: "My Pilot Profile", url }); } catch { /* cancelled */ }
            } else {
              await navigator.clipboard.writeText(url);
              toast.success("Public profile link copied");
            }
          }}
          className="font-display text-[11px] tracking-wider uppercase cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 mr-2" />
          Share Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="font-display text-[11px] tracking-wider uppercase text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PilotIdentityChip;
