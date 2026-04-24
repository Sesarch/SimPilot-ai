import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, RefreshCw, Download, Mail, Phone, Calendar as CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SchoolInquiry = {
  id: string;
  school_name: string;
  contact_name: string;
  contact_email: string;
  phone: string | null;
  estimated_seats: number | null;
  message: string | null;
  preferred_start_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

const statusVariant = (s: string) => {
  switch (s) {
    case "new":
      return "bg-primary/20 text-primary border-primary/30";
    case "contacted":
      return "bg-accent/20 text-accent border-accent/30";
    case "qualified":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "won":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "lost":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const AdminSchoolInquiries = () => {
  const [inquiries, setInquiries] = useState<SchoolInquiry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("school_inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load inquiries");
    } else {
      setInquiries((data as SchoolInquiry[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("school_inquiries")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Couldn't update status");
      return;
    }
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    toast.success("Status updated");
  };

  const exportCSV = () => {
    if (!inquiries.length) return;
    const headers = [
      "Date",
      "School",
      "Contact",
      "Email",
      "Phone",
      "Seats",
      "Start Date",
      "Status",
      "Message",
    ];
    const rows = inquiries.map((i) => [
      new Date(i.created_at).toLocaleString(),
      i.school_name,
      i.contact_name,
      i.contact_email,
      i.phone ?? "",
      i.estimated_seats ?? "",
      i.preferred_start_date ?? "",
      i.status,
      i.message ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "school_inquiries.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground tracking-wider uppercase">
            Flight School Inquiries
          </h2>
          {newCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px]">{newCount} new</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!inquiries.length}>
            <Download className="w-4 h-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchInquiries} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {loading ? "Loading inquiries..." : "No school inquiries yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="rounded-lg border border-border bg-background/40 p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {inq.school_name}
                    </h3>
                    <Badge className={`text-[10px] ${statusVariant(inq.status)}`}>
                      {inq.status.toUpperCase()}
                    </Badge>
                    {inq.estimated_seats != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {inq.estimated_seats} seats
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {inq.contact_name} · received {new Date(inq.created_at).toLocaleString()}
                  </p>
                </div>
                <Select value={inq.status} onValueChange={(v) => updateStatus(inq.id, v)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mt-3 text-xs">
                <a
                  href={`mailto:${inq.contact_email}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors min-w-0"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{inq.contact_email}</span>
                </a>
                {inq.phone && (
                  <a
                    href={`tel:${inq.phone}`}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {inq.phone}
                  </a>
                )}
                {inq.preferred_start_date && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Start: {new Date(inq.preferred_start_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              {inq.message && (
                <p className="text-sm text-secondary-foreground mt-3 whitespace-pre-wrap border-l-2 border-primary/30 pl-3">
                  {inq.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSchoolInquiries;
