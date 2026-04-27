import { useCallback, useEffect, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { CalendarPlus, Trash2, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface MockOralSession {
  id: string;
  scheduled_at: string;
  exam_type: string;
  focus_area: string | null;
  notes: string | null;
  status: string;
}

const EXAM_TYPES = [
  { value: "private", label: "Private Pilot" },
  { value: "instrument", label: "Instrument Rating" },
  { value: "commercial", label: "Commercial" },
  { value: "cfi", label: "CFI" },
  { value: "atp", label: "ATP" },
];

const FOCUS_AREAS = [
  "Regulations",
  "Weather",
  "Navigation",
  "Aerodynamics",
  "Cross-country planning",
  "Emergency procedures",
  "Aircraft systems",
];

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const UpcomingMockOralsPanel = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MockOralSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [scheduledAt, setScheduledAt] = useState(todayISO());
  const [examType, setExamType] = useState("private");
  const [focusArea, setFocusArea] = useState<string>("Regulations");
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("mock_oral_sessions")
      .select("id, scheduled_at, exam_type, focus_area, notes, status")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });
    if (error) {
      toast.error("Couldn't load scheduled sessions");
    } else {
      setSessions(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!user) {
      toast.error("Sign in to schedule a mock oral");
      return;
    }
    if (!scheduledAt) {
      toast.error("Pick a date and time");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("mock_oral_sessions").insert({
      user_id: user.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      exam_type: examType,
      focus_area: focusArea || null,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to schedule session");
      return;
    }
    toast.success("Mock oral scheduled");
    setOpen(false);
    setNotes("");
    setScheduledAt(todayISO());
    void refresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mock_oral_sessions").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't remove session");
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session removed");
  };

  const upcoming = sessions.filter((s) => !isPast(new Date(s.scheduled_at)) || isToday(new Date(s.scheduled_at)));

  return (
    <section className="g3000-bezel rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[14px] font-bold tracking-[0.22em] uppercase text-foreground">
          Upcoming Mock Orals
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <CalendarPlus className="w-3.5 h-3.5" />
              Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a mock oral</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled-at">Date & time</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Exam type</Label>
                  <Select value={examType} onValueChange={setExamType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_TYPES.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Focus area</Label>
                  <Select value={focusArea} onValueChange={setFocusArea}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOCUS_AREAS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Areas to drill, scenarios to rehearse..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Scheduling..." : "Add to calendar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
          <p className="font-display text-[12px] tracking-[0.16em] uppercase text-muted-foreground mb-3">
            No mock orals scheduled
          </p>
          <Link
            to="/oral-exam"
            className="font-display text-[11px] font-semibold tracking-[0.18em] uppercase text-primary hover:underline inline-flex items-center gap-1"
          >
            Or start one now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((s) => {
            const date = new Date(s.scheduled_at);
            const examLabel = EXAM_TYPES.find((e) => e.value === s.exam_type)?.label ?? s.exam_type;
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-primary">
                      {format(date, "MMM")}
                    </div>
                    <div className="text-xl font-bold text-foreground tabular-nums leading-none">
                      {format(date, "d")}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {examLabel}
                      {s.focus_area ? <span className="text-muted-foreground font-normal"> · {s.focus_area}</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(date, "EEE")} · {format(date, "h:mm a")}
                      {isToday(date) ? <span className="ml-2 text-accent font-semibold">Today</span> : null}
                    </div>
                    {s.notes ? <div className="text-xs text-muted-foreground/80 truncate mt-0.5">{s.notes}</div> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                    <Link to={`/oral-exam?type=${s.exam_type}`}>Start</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(s.id)}
                    aria-label="Remove session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default UpcomingMockOralsPanel;
