import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Plane, LogOut, User, Save, BookOpen, Mic, Clock, BarChart3,
  Cloud, Settings, ChevronRight, Shield,
} from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SEOHead from "@/components/SEOHead";
import AccountSettings from "@/components/AccountSettings";
import AchievementBadges from "@/components/dashboard/AchievementBadges";

type Profile = {
  display_name: string | null;
  certificate_type: string | null;
  flight_hours: number;
  bio: string | null;
};

const trainingModules = [
  { to: "/ground-school", icon: BookOpen, label: "Ground One-on-One", desc: "Interactive FAA lessons", color: "text-primary", bg: "bg-primary/15" },
  { to: "/oral-exam", icon: Mic, label: "Oral Exam Prep", desc: "Checkride simulation", color: "text-accent", bg: "bg-accent/15" },
  { to: "/weather-briefing", icon: Cloud, label: "Weather Briefing", desc: "Live METAR/TAF & AI analysis", color: "text-accent", bg: "bg-accent/15" },
  { to: "/live-tools", icon: Plane, label: "Live Sky", desc: "Flight tracker & ATC", color: "text-primary", bg: "bg-primary/15" },
  { to: "/progress", icon: BarChart3, label: "Training Progress", desc: "Topics & exam scores", color: "text-primary", bg: "bg-primary/10" },
  { to: "/session-history", icon: Clock, label: "Session History", desc: "Past conversations", color: "text-muted-foreground", bg: "bg-muted" },
];

const DashboardPage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, certificate_type, flight_hours, bio")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });

    // Check if admin
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => { if (data) setIsAdmin(true); });
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        certificate_type: profile.certificate_type,
        flight_hours: profile.flight_hours,
        bio: profile.bio,
      })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to save profile");
    else toast.success("Profile saved!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Plane className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pilot Dashboard — SimPilot.AI Training Hub"
        description="Your personal SimPilot.AI training hub. Track ground school progress, oral exam scores, ACS readiness, and resume your AI flight instructor sessions in one place."
        keywords="pilot training dashboard, ground school progress, oral exam tracker, ACS readiness, AI CFI dashboard, student pilot hub, checkride preparation"
        canonical="/dashboard"
        noIndex
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" title="SimPilot.AI — AI-Powered Pilot Training Home" className="flex items-center">
            <Logo height={28} />
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin" title="Open the SimPilot.AI Admin Dashboard">
                <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Button>
              </Link>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => { await signOut(); navigate("/"); }}
              className="text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-primary/20">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-foreground">
              Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">Your training command center</p>
          </div>
        </div>

        {/* Earned achievement badges */}
        <div className="mb-6">
          <AchievementBadges />
        </div>

        {/* Training Modules Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {trainingModules.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="group flex items-center gap-3 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm text-foreground truncate">{m.label}</h3>
                <p className="text-[11px] text-muted-foreground truncate">{m.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        {/* Tabs: Profile | Account Settings */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="font-display text-xs tracking-wider">
              <User className="w-3.5 h-3.5 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="account" className="font-display text-xs tracking-wider">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Account Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            {profile && (
              <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6 space-y-5">
                <div>
                  <label className="block text-xs font-display tracking-wider uppercase text-muted-foreground mb-1.5">
                    Display Name
                  </label>
                  <input
                    value={profile.display_name || ""}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-display tracking-wider uppercase text-muted-foreground mb-1.5">
                    Certificate Type
                  </label>
                  <select
                    value={profile.certificate_type || ""}
                    onChange={(e) => setProfile({ ...profile, certificate_type: e.target.value })}
                    className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select certificate</option>
                    <option value="student">Student Pilot</option>
                    <option value="private">Private Pilot (PPL)</option>
                    <option value="instrument">Instrument Rating (IR)</option>
                    <option value="commercial">Commercial Pilot (CPL)</option>
                    <option value="atp">Airline Transport (ATP)</option>
                    <option value="cfi">Flight Instructor (CFI)</option>
                    <option value="sim_enthusiast">Sim Enthusiast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-display tracking-wider uppercase text-muted-foreground mb-1.5">
                    Flight Hours
                  </label>
                  <input
                    type="number"
                    value={profile.flight_hours}
                    onChange={(e) => setProfile({ ...profile, flight_hours: parseInt(e.target.value) || 0 })}
                    className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-display tracking-wider uppercase text-muted-foreground mb-1.5">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                    placeholder="Tell us about your flying journey..."
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
