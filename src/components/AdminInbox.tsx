import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Inbox, Mail, MessageCircle, GraduationCap, Sparkles, RefreshCw, Send,
  StickyNote, Archive, CheckCircle2, Circle, AlertCircle, ChevronLeft,
  Forward, Settings, Plus, Trash2, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


type ThreadStatus = "new" | "open" | "pending" | "resolved" | "archived";
type ThreadSource = "contact_form" | "support_chat" | "school_inquiry" | "lead_email" | "inbound_email";

interface Thread {
  id: string;
  source: ThreadSource;
  source_id: string | null;
  subject: string;
  from_email: string | null;
  from_name: string | null;
  status: ThreadStatus;
  priority: "low" | "normal" | "high";
  unread_count: number;
  last_message_at: string;
  created_at: string;
  tags: string[];
  mailbox_id: string | null;
}

interface Mailbox {
  id: string;
  name: string;
  slug: string;
  color: string;
  forward_to_email: string | null;
  sort_order: number;
  enabled: boolean;
}


interface Message {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  body_text: string | null;
  from_email: string | null;
  from_name: string | null;
  to_email: string | null;
  delivery_status: string | null;
  delivery_error: string | null;
  created_at: string;
}

interface Note {
  id: string;
  thread_id: string;
  admin_user_id: string;
  body: string;
  created_at: string;
}

const SOURCE_META: Record<ThreadSource, { label: string; Icon: typeof Mail; color: string }> = {
  contact_form: { label: "Contact", Icon: Mail, color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  support_chat: { label: "Support chat", Icon: MessageCircle, color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  school_inquiry: { label: "School", Icon: GraduationCap, color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  lead_email: { label: "Lead", Icon: Sparkles, color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  inbound_email: { label: "Email", Icon: Mail, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

const STATUS_FILTERS: { value: ThreadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

const STATUS_COLOR: Record<ThreadStatus, string> = {
  new: "bg-red-500/20 text-red-400 border-red-500/30",
  open: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const AdminInbox = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ThreadStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ThreadSource | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reply, setReply] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inbox_threads" as any)
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Failed to load inbox: " + error.message);
    else setThreads((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  // Realtime: refresh on any thread/message change
  useEffect(() => {
    const ch = supabase
      .channel("admin-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_threads" }, fetchThreads)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_messages" }, () => {
        fetchThreads();
        if (selectedId) loadThreadDetail(selectedId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const loadThreadDetail = useCallback(async (threadId: string) => {
    const [m, n] = await Promise.all([
      supabase.from("inbox_messages" as any).select("*").eq("thread_id", threadId).order("created_at", { ascending: true }),
      supabase.from("inbox_notes" as any).select("*").eq("thread_id", threadId).order("created_at", { ascending: true }),
    ]);
    setMessages((m.data as any) || []);
    setNotes((n.data as any) || []);
  }, []);

  const selectThread = async (id: string) => {
    setSelectedId(id);
    setReply("");
    setNoteText("");
    await loadThreadDetail(id);
    // Reset unread
    await supabase.from("inbox_threads" as any).update({ unread_count: 0 }).eq("id", id);
    setThreads(prev => prev.map(t => t.id === id ? { ...t, unread_count: 0 } : t));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
      if (q) {
        const hay = `${t.subject} ${t.from_email ?? ""} ${t.from_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [threads, statusFilter, sourceFilter, search]);

  const selected = useMemo(() => threads.find(t => t.id === selectedId) || null, [threads, selectedId]);
  const unreadTotal = useMemo(() => threads.filter(t => t.status === "new").length, [threads]);

  const updateStatus = async (status: ThreadStatus) => {
    if (!selected) return;
    const { error } = await supabase.from("inbox_threads" as any).update({ status }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    setThreads(prev => prev.map(t => t.id === selected.id ? { ...t, status } : t));
    toast.success(`Marked as ${status}`);
  };

  const updatePriority = async (priority: "low" | "normal" | "high") => {
    if (!selected) return;
    const { error } = await supabase.from("inbox_threads" as any).update({ priority }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    setThreads(prev => prev.map(t => t.id === selected.id ? { ...t, priority } : t));
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    if (!selected.from_email) {
      toast.error("This thread has no email address to reply to.");
      return;
    }
    setSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbox-send-reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          thread_id: selected.id,
          to_email: selected.from_email,
          subject: selected.subject,
          message: reply.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Send failed");
      toast.success("Reply sent");
      setReply("");
      await loadThreadDetail(selected.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const addNote = async () => {
    if (!selected || !noteText.trim()) return;
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingNote(false); return; }
    const { error } = await supabase.from("inbox_notes" as any).insert({
      thread_id: selected.id,
      admin_user_id: user.id,
      body: noteText.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setNoteText("");
      await loadThreadDetail(selected.id);
      toast.success("Note added");
    }
    setSavingNote(false);
  };

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: threads.length };
    for (const t of threads) counts[t.source] = (counts[t.source] || 0) + 1;
    return counts;
  }, [threads]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Inbox className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-orbitron tracking-wide">Support Inbox</h2>
          {unreadTotal > 0 && (
            <Badge variant="destructive" className="ml-1">{unreadTotal} new</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchThreads} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={statusFilter === f.value ? "default" : "outline"}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="sm" variant={sourceFilter === "all" ? "default" : "outline"} onClick={() => setSourceFilter("all")}>
          All sources ({sourceCounts.all || 0})
        </Button>
        {(Object.keys(SOURCE_META) as ThreadSource[]).map(src => {
          const meta = SOURCE_META[src];
          const Icon = meta.Icon;
          return (
            <Button
              key={src}
              size="sm"
              variant={sourceFilter === src ? "default" : "outline"}
              onClick={() => setSourceFilter(src)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" /> {meta.label} ({sourceCounts[src] || 0})
            </Button>
          );
        })}
        <Input
          placeholder="Search subject or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      {/* Layout: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4 min-h-[600px]">
        {/* List */}
        <div className={cn(
          "border border-border rounded-lg bg-card/50 overflow-hidden",
          selectedId && "hidden lg:block"
        )}>
          <div className="max-h-[700px] overflow-y-auto divide-y divide-border">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {loading ? "Loading..." : "No threads match your filters."}
              </div>
            )}
            {filtered.map(t => {
              const meta = SOURCE_META[t.source];
              const Icon = meta.Icon;
              const isSelected = t.id === selectedId;
              const isUnread = t.unread_count > 0 || t.status === "new";
              return (
                <button
                  key={t.id}
                  onClick={() => selectThread(t.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                    isSelected && "bg-muted",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread ? (
                        <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />
                      ) : (
                        <span className="h-2 w-2 shrink-0" />
                      )}
                      <span className={cn("truncate text-sm", isUnread && "font-semibold")}>
                        {t.from_name || t.from_email || "Unknown"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: false })}
                    </span>
                  </div>
                  <div className={cn("text-sm truncate mb-1.5", isUnread ? "text-foreground" : "text-muted-foreground")}>
                    {t.subject}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 h-4", meta.color)}>
                      <Icon className="h-2.5 w-2.5 mr-1" /> {meta.label}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 h-4", STATUS_COLOR[t.status])}>
                      {t.status}
                    </Badge>
                    {t.priority === "high" && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-red-500/15 text-red-400 border-red-500/30">
                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> High
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className={cn(
          "border border-border rounded-lg bg-card/50 overflow-hidden flex flex-col",
          !selectedId && "hidden lg:flex"
        )}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
              Select a conversation to view it.
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Button variant="ghost" size="sm" className="lg:hidden -ml-2 mb-1" onClick={() => setSelectedId(null)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h3 className="font-semibold truncate">{selected.subject}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      From: {selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email || "(no email)"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selected.status} onValueChange={(v) => updateStatus(v as ThreadStatus)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["new","open","pending","resolved","archived"] as ThreadStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selected.priority} onValueChange={(v) => updatePriority(v as any)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus("resolved")}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus("archived")}>
                    <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg p-3 border",
                      m.direction === "inbound"
                        ? "bg-muted/40 border-border mr-8"
                        : "bg-primary/10 border-primary/30 ml-8",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                      <span className="font-medium">
                        {m.direction === "inbound" ? (m.from_name || m.from_email) : `You → ${m.to_email}`}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{m.body_text}</div>
                    {m.delivery_status === "failed" && (
                      <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Send failed: {m.delivery_error}
                      </div>
                    )}
                    {m.delivery_status === "pending" && (
                      <div className="mt-2 text-xs text-amber-400">Sending...</div>
                    )}
                  </div>
                ))}
                {notes.map(n => (
                  <div key={n.id} className="rounded-lg p-3 border bg-amber-500/10 border-amber-500/30">
                    <div className="flex items-center gap-1.5 mb-1 text-xs text-amber-400">
                      <StickyNote className="h-3 w-3" />
                      <span className="font-medium">Internal note</span>
                      <span className="text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                  </div>
                ))}
                {messages.length === 0 && notes.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">No messages yet.</div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-border p-3 space-y-2">
                {selected.from_email ? (
                  <>
                    <Textarea
                      placeholder={`Reply to ${selected.from_email}...`}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>
                        <Send className="h-3.5 w-3.5 mr-1.5" /> {sending ? "Sending..." : "Send reply"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">No email address on this thread — cannot reply.</div>
                )}
                <div className="pt-2 border-t border-border space-y-2">
                  <Textarea
                    placeholder="Add an internal note (only visible to admins)..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    className="resize-none bg-amber-500/5 border-amber-500/20"
                  />
                  <Button size="sm" variant="outline" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                    <StickyNote className="h-3.5 w-3.5 mr-1.5" /> Add note
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;
