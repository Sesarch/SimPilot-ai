import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, Trophy, Radio, Gem, Plane, MapPin, Clock, Share2, ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

type PublicProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  certificate_type: string | null;
  aircraft_type: string | null;
  rating_focus: string | null;
  region: string | null;
  flight_hours: number | null;
  bio: string | null;
  created_at: string;
};

type Achievement = {
  id: string;
  tier: string;
  exam_type: string | null;
  percentile: number | null;
  earned_at: string;
};

type BadgeMeta = {
  label: string;
  sublabel: string;
  accent: string;
  icon: typeof Award;
};

const TIER_META: Record<string, BadgeMeta> = {
  radio_proficiency_perfect: {
    label: "Perfect Score",
    sublabel: "Flawless Phraseology · 100%",
    accent: "hsl(280 90% 70%)",
    icon: Gem,
  },
  radio_proficiency_top_tier: {
    label: "Radio Proficiency",
    sublabel: "Top Tier · 90%+",
    accent: "hsl(var(--hud-green))",
    icon: Radio,
  },
  top_5_percent: {
    label: "Top 5%",
    sublabel: "Checkride Cohort",
    accent: "hsl(var(--cyan-glow))",
    icon: Trophy,
  },
  top_10_percent: {
    label: "Top 10%",
    sublabel: "Checkride Cohort",
    accent: "hsl(var(--amber-instrument))",
    icon: Award,
  },
};

const fallbackMeta = (tier: string): BadgeMeta => ({
  label: tier.replace(/[_-]/g, " "),
  sublabel: "Achievement",
  accent: "hsl(var(--primary))",
  icon: Award,
});

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase
          .from("profiles_public" as never)
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_achievements")
          .select("id, tier, exam_type, percentile, earned_at")
          .eq("user_id", userId)
          .order("earned_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (!p) {
        setNotFound(true);
      } else {
        setProfile(p as unknown as PublicProfile);
        setAchievements((a ?? []) as Achievement[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pilot Profile · SimPilot.AI", url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    }
  };

  const callsign = profile?.display_name?.trim() || "Pilot";
  const cert = profile?.certificate_type?.trim() || "Pilot";
  const initials = callsign
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={profile ? `${callsign} · Pilot Profile` : "Pilot Profile"}
        description={
          profile
            ? `${callsign} — ${cert}${profile.aircraft_type ? ` · ${profile.aircraft_type}` : ""}${profile.flight_hours ? ` · ${profile.flight_hours} flight hours` : ""}. Training stats and earned achievements on SimPilot.AI.`
            : "Pilot training profile on SimPilot.AI."
        }
        keywords="pilot profile, flight hours, aviation achievements, simpilot"
        canonical={userId ? `/pilot/${userId}` : undefined}
        ogType="profile"
        noIndex={notFound}
        jsonLd={
          profile
            ? {
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                mainEntity: {
                  "@type": "Person",
                  name: callsign,
                  jobTitle: cert,
                  description: profile.bio || undefined,
                },
              }
            : undefined
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            SimPilot.AI
          </Link>
          {profile && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
              className="font-display text-[10px] tracking-[0.2em] uppercase"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
          )}
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        )}

        {!loading && notFound && (
          <div className="g3000-bezel rounded-lg p-10 text-center">
            <h1 className="font-display text-lg tracking-[0.25em] uppercase text-foreground mb-2">
              Pilot Not Found
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              This pilot profile doesn't exist or hasn't been shared yet.
            </p>
            <Button asChild>
              <Link to="/">Return Home</Link>
            </Button>
          </div>
        )}

        {!loading && profile && (
          <>
            {/* Identity header */}
            <div className="g3000-bezel rounded-lg p-6 sm:p-8 relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                <Avatar className="w-24 h-24 border-2 border-primary/40">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={callsign} />
                  ) : null}
                  <AvatarFallback className="text-2xl font-display tracking-wider bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
                    {initials || <User className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left">
                  <div className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
                    Pilot Identification
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl tracking-wider uppercase text-foreground mb-2">
                    {callsign}
                  </h1>
                  <div
                    className="font-display text-xs tracking-[0.25em] uppercase mb-4"
                    style={{ color: "hsl(var(--amber-instrument))" }}
                  >
                    {cert}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center sm:justify-start text-xs text-muted-foreground">
                    {profile.flight_hours != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="font-display tracking-wider">
                          {profile.flight_hours} HRS
                        </span>
                      </span>
                    )}
                    {profile.aircraft_type && (
                      <span className="inline-flex items-center gap-1.5">
                        <Plane className="w-3.5 h-3.5 text-primary" />
                        <span className="font-display tracking-wider uppercase">
                          {profile.aircraft_type}
                        </span>
                      </span>
                    )}
                    {profile.region && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="font-display tracking-wider uppercase">
                          {profile.region}
                        </span>
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-foreground/80 mt-4 leading-relaxed max-w-2xl">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="g3000-bezel rounded-lg p-5 sm:p-6 relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  <h2 className="font-display text-[11px] tracking-[0.3em] uppercase text-foreground">
                    Achievements
                  </h2>
                </div>
                <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  {achievements.length} Earned
                </span>
              </div>

              {achievements.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No achievements earned yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a) => {
                    const meta = TIER_META[a.tier] ?? fallbackMeta(a.tier);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-2.5 rounded-md border px-3 py-2 bg-background/40"
                        style={{
                          borderColor: `${meta.accent}55`,
                          background: `linear-gradient(135deg, ${meta.accent}15, transparent 70%)`,
                        }}
                        title={`Earned ${new Date(a.earned_at).toLocaleDateString()}`}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center border"
                          style={{
                            borderColor: `${meta.accent}66`,
                            background: `${meta.accent}1f`,
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-display text-[11px] uppercase tracking-wider font-semibold leading-tight"
                            style={{ color: meta.accent }}
                          >
                            {meta.label}
                          </div>
                          <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground leading-tight">
                            {meta.sublabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                Train smarter with an AI flight instructor.
              </p>
              <Button asChild>
                <Link to="/" className="font-display text-[11px] tracking-[0.25em] uppercase">
                  Start Your Training
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
