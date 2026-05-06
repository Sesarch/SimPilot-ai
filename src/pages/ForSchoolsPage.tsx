import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BASE_PRICE = 99; // USD per seat per year

function discountFor(seats: number): number {
  if (seats >= 26) return 25;
  if (seats >= 11) return 20;
  if (seats >= 5) return 15;
  return 0;
}

const ForSchoolsPage = () => {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [seats, setSeats] = useState(10);
  const [loading, setLoading] = useState(false);

  const pricing = useMemo(() => {
    const discount = discountFor(seats);
    const subtotal = BASE_PRICE * seats;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;
    const perSeat = total / seats;
    return { discount, subtotal, discountAmount, total, perSeat };
  }, [seats]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seats < 5) {
      toast.error("Minimum 5 seats for bulk pricing");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("school-bulk-checkout", {
        body: {
          school_name: schoolName,
          contact_name: contactName,
          contact_email: contactEmail,
          seats,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="For Flight Schools — Bulk Plans | SimPilot.AI"
        description="Bulk plans for flight schools. Pay one invoice, give each student their own AI CFI account with progress tracking. Save up to 25% with volume discounts."
        keywords="flight school plan, bulk pilot training, AI CFI for schools, student pilot accounts, aviation training discount"
        canonical="/for-schools"
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 mb-4">
              <GraduationCap className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-display tracking-widest uppercase text-accent">For Flight Schools</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-foreground tracking-wide mb-4">
              Equip your <span className="text-accent">entire student body</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One invoice for your school. Each student gets their own AI CFI login, progress, and logbook.
              No shared accounts, no IT setup — just send them their personal signup code.
            </p>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {[
              { n: 1, title: "Buy seats", desc: "Choose how many students. Pay one invoice via Stripe." },
              { n: 2, title: "Get signup codes", desc: "We email you a unique code per seat. Distribute to students." },
              { n: 3, title: "Students self-register", desc: "Each student creates their own account using their code." },
            ].map((s) => (
              <div key={s.n} className="bg-secondary/30 border border-border rounded-lg p-5">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground mb-3">
                  {s.n}
                </div>
                <h3 className="font-display mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing tiers */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Calculator card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-xl mb-1">Bulk Discount Tiers</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Volume discounts are applied automatically.
              </p>
              <div className="space-y-2 mb-6">
                {[
                  { range: "5–10 seats", off: "15% off", per: "$84.15/seat" },
                  { range: "11–25 seats", off: "20% off", per: "$79.20/seat" },
                  { range: "26+ seats", off: "25% off", per: "$74.25/seat" },
                ].map((t) => (
                  <div key={t.range} className="flex items-center justify-between p-3 rounded-md bg-secondary/40 border border-border/50">
                    <span className="text-sm ">{t.range}</span>
                    <div className="text-right">
                      <div className="text-xs text-accent ">{t.off}</div>
                      <div className="text-xs text-muted-foreground">{t.per}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2"><Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>Each seat = 12 months of Pro Pilot access for one student</span></div>
                <div className="flex items-start gap-2"><Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>Students keep their own login, progress, and logbook</span></div>
                <div className="flex items-start gap-2"><Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>Unused codes valid for 12 months from purchase</span></div>
                <div className="flex items-start gap-2"><Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>No subscription auto-renewal — buy more next year if you want</span></div>
              </div>
            </div>

            {/* Checkout form */}
            <form onSubmit={handleCheckout} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="font-display text-xl mb-1">Get Your Quote</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Instant checkout — codes delivered immediately.
              </p>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">School Name</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="ABC Flight Academy"
                  className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Contact Name (Optional)</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Chief Flight Instructor"
                  className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Contact Email (Receipt + Codes)</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@yourschool.com"
                  className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  Number of Students
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                    className="flex-1 accent-accent"
                  />
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={seats}
                    onChange={(e) => setSeats(Math.max(5, Math.min(500, parseInt(e.target.value || "5", 10))))}
                    className="w-20 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground text-center outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minimum 5 seats. Need more than 100? Drag or type up to 500.</p>
              </div>

              {/* Live price summary */}
              <div className="bg-secondary/40 border border-border rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{seats} seats × ${BASE_PRICE}</span>
                  <span>${pricing.subtotal.toFixed(2)}</span>
                </div>
                {pricing.discount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {pricing.discount}% bulk discount</span>
                    <span>−${pricing.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${pricing.total.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">USD / year</span></span>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  ≈ ${pricing.perSeat.toFixed(2)} per student per year
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-accent-foreground font-display tracking-widest uppercase rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                {loading ? "Redirecting…" : "Continue to Checkout"}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Secure payment via Stripe. Codes delivered instantly after payment.
              </p>
            </form>
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl text-center mb-6">Common Questions</h2>
            <div className="space-y-3">
              {[
                { q: "Do students get their own accounts?", a: "Yes — every student creates their own login with their own email and password. Their progress, logbook, and exam history belong to them." },
                { q: "Can the school see student progress?", a: "Not in this plan. Each student account is private. We're working on an optional roster dashboard for schools — let us know via Contact if you'd like early access." },
                { q: "What happens after 12 months?", a: "Each student's subscription ends. They can renew on their own at the individual rate, or your school can buy a new bulk pack." },
                { q: "Can I get a refund on unused codes?", a: "Within 14 days of purchase, yes — pro-rated for any unredeemed codes. After that, codes remain valid for the full 12 months." },
                { q: "Need an invoice / PO for accounting?", a: "Stripe automatically issues a tax-compliant invoice to your contact email. For purchase orders or wire transfer, contact us first." },
              ].map((f) => (
                <details key={f.q} className="group bg-card border border-border rounded-lg p-4">
                  <summary className="cursor-pointer text-foreground group-open:text-accent">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() => navigate("/contact")}
                className="text-sm text-accent hover:underline"
              >
                Other questions? Contact us →
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ForSchoolsPage;
