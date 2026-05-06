import { useState } from "react";
import { Ticket, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  initialCode?: string;
  onRedeemed?: () => void;
}

const RedeemSchoolCode = ({ initialCode = "", onRedeemed }: Props) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState<{ school: string; expires: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("school-redeem-code", {
        body: { code: code.trim().toUpperCase() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.status === "redeemed") {
        setRedeemed({ school: data.school_name, expires: data.expires_at });
        toast.success(`Activated! ${data.school_name} subscription active.`);
        onRedeemed?.();
      } else if (data?.status === "already_yours") {
        toast.info("This code is already linked to your account.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not redeem code");
    } finally {
      setLoading(false);
    }
  };

  if (redeemed) {
    return (
      <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 flex items-start gap-3">
        <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-foreground">School subscription active</p>
          <p className="text-muted-foreground">
            Sponsored by <span className="text-foreground">{redeemed.school}</span> until{" "}
            {new Date(redeemed.expires).toLocaleDateString()}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-display tracking-wider uppercase">Redeem School Code</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        If your flight school provided a SimPilot.AI signup code, enter it here to activate your year of Pro Pilot access.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SP-XXXXXXXX"
          className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-accent/50"
          maxLength={20}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-accent text-accent-foreground text-sm font-display tracking-wider uppercase rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Redeem"}
        </button>
      </div>
    </form>
  );
};

export default RedeemSchoolCode;
