import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plane, LogOut, User, Save, BookOpen, Mic, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  display_name: string | null;
  certificate_type: string | null;
  flight_hours: number;
  bio: string | null;
};

const DashboardPage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

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
      .then(({ data }) => {
        if (data) setProfile(data);
      });
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
              SIM<span className="text-accent">PILOT</span>.AI
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Pilot Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Manage your training profile</p>
          </div>
        </div>

        {/* Training Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            to="/ground-school"
            className="flex items-center gap-3 p-4 bg-gradient-card rounded-xl border border-border hover:border-primary/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Ground School</h3>
              <p className="text-xs text-muted-foreground">Interactive FAA lessons</p>
            </div>
          </Link>
          <Link
            to="/oral-exam"
            className="flex items-center gap-3 p-4 bg-gradient-card rounded-xl border border-border hover:border-primary/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Mic className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Oral Exam Prep</h3>
              <p className="text-xs text-muted-foreground">Checkride simulation</p>
            </div>
          </Link>
          <Link
            to="/session-history"
            className="flex items-center gap-3 p-4 bg-gradient-card rounded-xl border border-border hover:border-primary/40 transition-all group sm:col-span-2"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Session History</h3>
              <p className="text-xs text-muted-foreground">Review past training conversations</p>
            </div>
          </Link>
        </div>

        {profile && (
          <div className="bg-gradient-card rounded-xl border border-border p-6 space-y-5">
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

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
