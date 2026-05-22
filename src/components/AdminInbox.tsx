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
  Forward, Settings, Plus, Trash2, Save, Zap, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface ReplyTemplate {
  id: string;
  title: string;
  category: string;
  body: string;
  shortcut: string | null;
  sort_order: number;
  enabled: boolean;
}

const applyTemplateVars = (body: string, thread: Thread | null): string => {
  if (!thread) return body;
  const name = thread.from_name || "";
  const first = name.trim().split(/\s+/)[0] || "there";
  return body
    .replaceAll("{{first_name}}", first)
    .replaceAll("{{name}}", name || "there")
    .replaceAll("{{email}}", thread.from_email || "")
    .replaceAll("{{subject}}", thread.subject || "");
};

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
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ThreadStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ThreadSource | "all">("all");
  const [mailboxFilter, setMailboxFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reply, setReply] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchMailboxes = useCallback(async () => {
    const { data } = await supabase
      .from("inbox_mailboxes" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    setMailboxes((data as any) || []);
  }, []);
  useEffect(() => { fetchMailboxes(); }, [fetchMailboxes]);


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
      if (mailboxFilter !== "all") {
        if (mailboxFilter === "unassigned" && t.mailbox_id) return false;
        if (mailboxFilter !== "unassigned" && t.mailbox_id !== mailboxFilter) return false;
      }
      if (q) {
        const hay = `${t.subject} ${t.from_email ?? ""} ${t.from_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;

    });
  }, [threads, statusFilter, sourceFilter, mailboxFilter, search]);

  const mailboxById = useMemo(() => {
    const m: Record<string, Mailbox> = {};
    mailboxes.forEach(mb => { m[mb.id] = mb; });
    return m;
  }, [mailboxes]);

  const reassignMailbox = async (mailboxId: string | null) => {
    if (!selected) return;
    const { error } = await supabase
      .from("inbox_threads" as any)
      .update({ mailbox_id: mailboxId })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    setThreads(prev => prev.map(t => t.id === selected.id ? { ...t, mailbox_id: mailboxId } : t));
    toast.success(mailboxId ? `Moved to ${mailboxById[mailboxId]?.name}` : "Unassigned");
  };

  const forwardThread = async () => {
    if (!selected) return;
    setForwarding(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbox-forward-thread`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ thread_id: selected.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Forward failed");
      toast.success(`Forwarded to ${data.forwarded_to}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to forward");
    } finally {
      setForwarding(false);
    }
  };


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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Routing
          </Button>
          <Button variant="outline" size="sm" onClick={fetchThreads} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* Mailbox filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Mailbox:</span>
        <Button size="sm" variant={mailboxFilter === "all" ? "default" : "outline"} onClick={() => setMailboxFilter("all")}>
          All
        </Button>
        {mailboxes.map(mb => {
          const count = threads.filter(t => t.mailbox_id === mb.id).length;
          return (
            <Button
              key={mb.id}
              size="sm"
              variant={mailboxFilter === mb.id ? "default" : "outline"}
              onClick={() => setMailboxFilter(mb.id)}
            >
              <span className="h-2 w-2 rounded-full mr-1.5" style={{ background: mb.color }} />
              {mb.name} ({count})
            </Button>
          );
        })}
        <Button size="sm" variant={mailboxFilter === "unassigned" ? "default" : "outline"} onClick={() => setMailboxFilter("unassigned")}>
          Unassigned ({threads.filter(t => !t.mailbox_id).length})
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
                    {t.mailbox_id && mailboxById[t.mailbox_id] && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4" style={{ borderColor: mailboxById[t.mailbox_id].color + "80", color: mailboxById[t.mailbox_id].color }}>
                        {mailboxById[t.mailbox_id].name}
                      </Badge>
                    )}
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
                  <Select
                    value={selected.mailbox_id ?? "__none"}
                    onValueChange={(v) => reassignMailbox(v === "__none" ? null : v)}
                  >
                    <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Mailbox" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
                      {mailboxes.map(mb => (
                        <SelectItem key={mb.id} value={mb.id}>{mb.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={forwardThread} disabled={forwarding}>
                    <Forward className="h-3.5 w-3.5 mr-1" /> {forwarding ? "Forwarding…" : "Forward"}
                  </Button>
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

      <RoutingSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        mailboxes={mailboxes}
        onChanged={fetchMailboxes}
      />
    </div>
  );
};

// =================== Routing Settings Dialog ===================
interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  match_source: string | null;
  match_from_domain: string | null;
  match_keywords: string[];
  set_mailbox: string | null;
  set_priority: string | null;
  add_tags: string[];
}

const RoutingSettingsDialog = ({
  open, onOpenChange, mailboxes, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mailboxes: Mailbox[];
  onChanged: () => void;
}) => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [mbDrafts, setMbDrafts] = useState<Record<string, Partial<Mailbox>>>({});
  const [loading, setLoading] = useState(false);
  const [newMb, setNewMb] = useState({ name: "", slug: "", color: "#009199", forward_to_email: "" });

  const loadRules = useCallback(async () => {
    const { data } = await supabase
      .from("inbox_routing_rules" as any)
      .select("*")
      .order("priority", { ascending: true });
    setRules((data as any) || []);
  }, []);

  useEffect(() => { if (open) loadRules(); }, [open, loadRules]);

  const saveMailbox = async (mb: Mailbox) => {
    const draft = mbDrafts[mb.id] || {};
    if (Object.keys(draft).length === 0) return;
    setLoading(true);
    const { error } = await supabase
      .from("inbox_mailboxes" as any)
      .update(draft)
      .eq("id", mb.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${mb.name}`);
    setMbDrafts(prev => { const { [mb.id]: _, ...rest } = prev; return rest; });
    onChanged();
  };

  const addMailbox = async () => {
    if (!newMb.name.trim() || !newMb.slug.trim()) return toast.error("Name and slug required");
    setLoading(true);
    const { error } = await supabase.from("inbox_mailboxes" as any).insert({
      name: newMb.name.trim(),
      slug: newMb.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      color: newMb.color,
      forward_to_email: newMb.forward_to_email.trim() || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mailbox added");
    setNewMb({ name: "", slug: "", color: "#009199", forward_to_email: "" });
    onChanged();
  };

  const deleteMailbox = async (id: string, name: string) => {
    if (!confirm(`Delete mailbox "${name}"? Threads will become unassigned.`)) return;
    const { error } = await supabase.from("inbox_mailboxes" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChanged();
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("inbox_routing_rules" as any).update({ enabled }).eq("id", id);
    if (error) return toast.error(error.message);
    loadRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this routing rule?")) return;
    const { error } = await supabase.from("inbox_routing_rules" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadRules();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-orbitron">Routing &amp; Forwarding</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mailboxes */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Mailboxes</h3>
            <p className="text-xs text-muted-foreground">
              Each mailbox represents a team. Set a forward address to auto-forward incoming emails to a real inbox.
            </p>
            <div className="space-y-2">
              {mailboxes.map(mb => {
                const draft = mbDrafts[mb.id] || {};
                const merged = { ...mb, ...draft };
                return (
                  <div key={mb.id} className="grid grid-cols-12 gap-2 items-center p-2 border border-border rounded-md bg-card/50">
                    <Input
                      className="col-span-3 h-8 text-xs"
                      value={merged.name}
                      onChange={e => setMbDrafts(p => ({ ...p, [mb.id]: { ...p[mb.id], name: e.target.value } }))}
                    />
                    <Input
                      className="col-span-4 h-8 text-xs"
                      placeholder="forward-to@example.com"
                      value={merged.forward_to_email ?? ""}
                      onChange={e => setMbDrafts(p => ({ ...p, [mb.id]: { ...p[mb.id], forward_to_email: e.target.value || null } }))}
                    />
                    <Input
                      type="color"
                      className="col-span-1 h-8 p-1"
                      value={merged.color}
                      onChange={e => setMbDrafts(p => ({ ...p, [mb.id]: { ...p[mb.id], color: e.target.value } }))}
                    />
                    <div className="col-span-4 flex gap-1 justify-end">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => saveMailbox(mb)} disabled={loading || !mbDrafts[mb.id]}>
                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => deleteMailbox(mb.id, mb.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-12 gap-2 items-center p-2 border border-dashed border-border rounded-md">
              <Input
                className="col-span-3 h-8 text-xs"
                placeholder="Mailbox name"
                value={newMb.name}
                onChange={e => setNewMb(p => ({ ...p, name: e.target.value, slug: p.slug || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
              />
              <Input
                className="col-span-2 h-8 text-xs"
                placeholder="slug"
                value={newMb.slug}
                onChange={e => setNewMb(p => ({ ...p, slug: e.target.value }))}
              />
              <Input
                className="col-span-4 h-8 text-xs"
                placeholder="forward-to@example.com"
                value={newMb.forward_to_email}
                onChange={e => setNewMb(p => ({ ...p, forward_to_email: e.target.value }))}
              />
              <Input
                type="color"
                className="col-span-1 h-8 p-1"
                value={newMb.color}
                onChange={e => setNewMb(p => ({ ...p, color: e.target.value }))}
              />
              <Button size="sm" className="col-span-2 h-8" onClick={addMailbox} disabled={loading}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </section>

          {/* Rules */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Routing rules</h3>
              <span className="text-[11px] text-muted-foreground">Evaluated in priority order (lowest first)</span>
            </div>
            <div className="space-y-2">
              {rules.map(r => {
                const mb = r.set_mailbox ? mailboxes.find(m => m.id === r.set_mailbox) : null;
                return (
                  <div key={r.id} className={cn(
                    "p-2.5 border rounded-md flex items-start gap-3",
                    r.enabled ? "border-border bg-card/40" : "border-border/40 bg-muted/30 opacity-60",
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{r.name}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">prio {r.priority}</Badge>
                        {mb && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4" style={{ borderColor: mb.color + "80", color: mb.color }}>
                            → {mb.name}
                          </Badge>
                        )}
                        {r.set_priority && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">priority: {r.set_priority}</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {r.match_source && <span className="mr-2">source = <code>{r.match_source}</code></span>}
                        {r.match_from_domain && <span className="mr-2">domain = <code>{r.match_from_domain}</code></span>}
                        {r.match_keywords.length > 0 && <span>keywords: {r.match_keywords.join(", ")}</span>}
                        {!r.match_source && !r.match_from_domain && r.match_keywords.length === 0 && (
                          <span className="italic">matches all</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleRule(r.id, !r.enabled)}>
                      {r.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => deleteRule(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              {rules.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No rules yet. Threads will stay unassigned.</div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              To add or edit rules, use the database. Default rules cover source-based routing and common keywords (billing, spam).
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminInbox;

