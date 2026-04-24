import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Check, Copy, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface FinalizeResult {
  status: "ready" | "pending";
  school_name?: string;
  contact_email?: string;
  seats?: number;
  expires_at?: string;
  codes?: string[];
  message?: string;
}

const ForSchoolsSuccessPage = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [result, setResult] = useState<FinalizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session ID");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/school-finalize?session_id=${encodeURIComponent(sessionId)}`,
          { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to finalize");
        if (data.status === "ready") {
          setResult(data);
          setLoading(false);
        } else if (attempts < 6) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          throw new Error("Payment not yet complete. Please refresh in a minute.");
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Something went wrong");
        setLoading(false);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  const copyAll = () => {
    if (!result?.codes) return;
    const text = result.codes.join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`${result.codes.length} codes copied to clipboard`);
  };

  const downloadCsv = () => {
    if (!result?.codes) return;
    const csv = "Student Email,Signup Code,Signup URL\n" +
      result.codes.map((c) => `,${c},${window.location.origin}/auth?code=${c}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpilot-school-codes-${result.school_name?.replace(/\s+/g, "_") || "school"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEOHead title="Bulk Purchase Complete | SimPilot.AI" description="Your school's bulk signup codes are ready." keywords="" canonical="/for-schools/success" noIndex />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {loading && (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
              <p className="text-muted-foreground">Confirming payment and generating codes…</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <h2 className="font-display text-xl font-bold text-destructive mb-2">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Link to="/contact" className="text-sm text-accent hover:underline">Contact support →</Link>
            </div>
          )}

          {result && result.status === "ready" && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/20 text-accent mb-4">
                  <Check className="h-7 w-7" />
                </div>
                <h1 className="font-display text-3xl font-bold mb-2">Payment Confirmed</h1>
                <p className="text-muted-foreground">
                  {result.seats} seats activated for <span className="text-foreground font-semibold">{result.school_name}</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Codes valid until {result.expires_at ? new Date(result.expires_at).toLocaleDateString() : ""}. A copy was emailed to {result.contact_email}.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold">Student Signup Codes</h2>
                  <div className="flex gap-2">
                    <button onClick={copyAll} className="text-xs px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 flex items-center gap-1.5">
                      <Copy className="h-3 w-3" /> Copy all
                    </button>
                    <button onClick={downloadCsv} className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:opacity-90 flex items-center gap-1.5">
                      <Download className="h-3 w-3" /> Download CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-2">
                  {result.codes?.map((code) => (
                    <code key={code} className="font-mono text-sm bg-secondary/50 border border-border rounded px-2 py-1.5 text-center">
                      {code}
                    </code>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-border space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">How to share with your students:</p>
                  <p>1. Send each student one code (the CSV has columns for student emails).</p>
                  <p>2. Direct them to <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground">{window.location.origin}/auth</code> to sign up.</p>
                  <p>3. After signup, they paste the code in <strong>Account → Redeem School Code</strong> to activate their year of access.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ForSchoolsSuccessPage;
