import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, RefreshCw, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SupportChat = {
  id: string;
  email: string;
  escalated: boolean;
  created_at: string;
  messages?: { id: string; role: string; content: string; created_at: string }[];
};

const AdminSupportChats = () => {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_chats" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setChats((data as any) || []);
    } catch (err: any) {
      toast.error("Failed to load support chats: " + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const loadMessages = async (chatId: string) => {
    if (expandedId === chatId) { setExpandedId(null); return; }
    try {
      const { data, error } = await supabase
        .from("support_chat_messages" as any)
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, messages: (data as any) || [] } : c
      ));
      setExpandedId(chatId);
    } catch (err: any) {
      toast.error("Failed to load messages: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("support_chats" as any)
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      setChats(prev => prev.filter(c => c.id !== deleteId));
      toast.success("Chat deleted");
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
    setDeleteId(null);
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" /> Support Chats
          <Badge variant="secondary" className="ml-2 text-xs">{chats.length}</Badge>
        </h2>
        <Button variant="outline" size="sm" onClick={fetchChats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">{chats.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">
                {chats.filter(c => c.escalated).length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Escalated</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">
                {chats.filter(c => {
                  const d = new Date(c.created_at);
                  const now = new Date();
                  return now.getTime() - d.getTime() < 24 * 60 * 60 * 1000;
                }).length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last 24h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat list */}
      <div className="space-y-2">
        {chats.map(chat => (
          <div key={chat.id} className="bg-gradient-card rounded-xl border border-border overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
              onClick={() => loadMessages(chat.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{chat.email}</p>
                  {chat.escalated && (
                    <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px] shrink-0">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Escalated
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {new Date(chat.created_at).toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(chat.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                {expandedId === chat.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded messages */}
            {expandedId === chat.id && chat.messages && (
              <div className="border-t border-border p-4 space-y-3 max-h-80 overflow-y-auto bg-muted/5">
                {chat.messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chat.messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">No messages</p>
                )}
              </div>
            )}
          </div>
        ))}

        {chats.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {loading ? "Loading support chats..." : "No support chats yet"}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Support Chat</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSupportChats;
