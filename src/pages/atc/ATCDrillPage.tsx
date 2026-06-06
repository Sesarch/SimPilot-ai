import { useState, useMemo } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Radio, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useATCDrill,
  useATCCategoryBySlug,
  useATCDrills,
  useATCRecentAttempts,
} from "@/hooks/useATCData";
import { useQueryClient } from "@tanstack/react-query";
import ATCGradeResultPanel, { type GradeResult } from "@/components/atc/ATCGradeResultPanel";

const ATCDrillPage = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: category } = useATCCategoryBySlug(slug);
  const { data: drill, isLoading } = useATCDrill(id);
  const { data: siblings } = useATCDrills(category?.id);
  const { data: recentAttempts } = useATCRecentAttempts(id, 3);

  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);

  const nextDrillId = useMemo(() => {
    if (!siblings || !drill) return null;
    const idx = siblings.findIndex((d) => d.id === drill.id);
    if (idx < 0 || idx >= siblings.length - 1) return null;
    return siblings[idx + 1].id;
  }, [siblings, drill]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (!drill) return <Navigate to={`/atc/category/${slug}`} replace />;

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit drills.", variant: "destructive" });
      return;
    }
    const text = response.trim();
    if (!text) {
      toast({ title: "Empty response", description: "Type your transmission first.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("atc-grade-response", {
        body: { drill_id: drill.id, student_response: text },
      });
      if (error) throw error;
      if (!data) throw new Error("No response from grader");

      if (data.graded === false) {
        toast({
          title: "Grading failed",
          description: data.feedback ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setResult({
        score: data.score,
        passed: data.passed,
        elements_hit: data.elements_hit ?? [],
        elements_missed: data.elements_missed ?? [],
        feedback: data.feedback,
        correct_version: data.correct_version,
      });

      // Refresh dependent queries
      queryClient.invalidateQueries({ queryKey: ["atc", "mastery"] });
      queryClient.invalidateQueries({ queryKey: ["atc", "attempts", user.id, drill.id] });
      queryClient.invalidateQueries({ queryKey: ["atc", "best-by-drill"] });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Grading error",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    setResponse("");
    setResult(null);
  };

  const handleNextDrill = () => {
    if (nextDrillId) navigate(`/atc/category/${slug}/drill/${nextDrillId}`);
  };

  return (
    <>
      <Helmet>
        <title>{drill.title} — ATC Training</title>
      </Helmet>

      <div className="min-h-full bg-background">
        <main className="pb-8 sm:pb-16 pt-4 sm:pt-6">
          <div className="container mx-auto px-3 sm:px-6 max-w-3xl space-y-5">
            <div>
              <Link to={`/atc/category/${slug}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                <ArrowLeft className="h-3 w-3" /> {category?.name ?? "Category"}
              </Link>
              <h1 className="font-display text-xl sm:text-2xl text-foreground tracking-wider uppercase">
                {drill.title}
              </h1>
              <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-wider">
                {drill.difficulty}
              </Badge>
            </div>

            {/* Situation */}
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <div className="text-[10px] uppercase tracking-wider font-display text-muted-foreground mb-1.5">
                Situation
              </div>
              <p className="text-sm text-foreground leading-relaxed">{drill.situation}</p>
            </div>

            {/* Controller transmission */}
            {drill.controller_transmission && (
              <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Radio className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] uppercase tracking-wider font-display text-accent">
                    Controller transmission
                  </span>
                </div>
                <p className="text-sm text-foreground font-mono leading-relaxed">
                  {drill.controller_transmission}
                </p>
              </div>
            )}

            {/* Response */}
            <div className="space-y-2">
              <label htmlFor="atc-response" className="text-[10px] uppercase tracking-wider font-display text-muted-foreground">
                Your transmission
              </label>
              <Textarea
                id="atc-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type exactly what you would say on the radio..."
                rows={4}
                maxLength={2000}
                disabled={submitting || !!result}
                className="font-mono text-sm"
              />
              {!result && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !response.trim()}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Grading…</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Submit Transmission</>
                  )}
                </Button>
              )}
            </div>

            {/* Result */}
            {result && (
              <>
                <ATCGradeResultPanel result={result} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleTryAgain}>
                    Try Again
                  </Button>
                  {nextDrillId && (
                    <Button onClick={handleNextDrill}>
                      Next Drill →
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Recent attempts */}
            {recentAttempts && recentAttempts.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-display text-muted-foreground mb-2">
                  Last attempts
                </div>
                <div className="space-y-1.5">
                  {recentAttempts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs text-muted-foreground rounded-md border border-border bg-card/30 px-3 py-2">
                      <span className="font-mono tabular-nums">Score: <span className="text-foreground">{a.score}</span></span>
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ATCDrillPage;
