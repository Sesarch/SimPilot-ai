import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, RotateCcw, Loader2, ClipboardCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat, ChatMode, Msg } from "@/hooks/useChat";
import { useMessageLimit } from "@/hooks/useMessageLimit";
import { useChatSession } from "@/hooks/useChatSession";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ChatGateModal from "@/components/ChatGateModal";

interface TrainingChatProps {
  mode: ChatMode;
  placeholder?: string;
  welcomeMessage?: string;
  initialPrompt?: string;
  topicId?: string;
}

export const TrainingChat = ({
  mode,
  placeholder = "Type your answer or question...",
  welcomeMessage,
  initialPrompt,
  topicId,
}: TrainingChatProps) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstUserMsgRef = useRef<string>("");
  const { gateStatus, showGate, dismissGate, checkLimit, recordUsage } = useMessageLimit();
  const { user } = useAuth();
  const topicMarkedRef = useRef(false);
  const { saveMessage, resetSession } = useChatSession(mode);
  const { messages, isLoading, error, send, scrollRef, reset } = useChat({
    mode,
    onBeforeSend: () => checkLimit(),
    onAfterSend: () => recordUsage(),
  });
  const [started, setStarted] = useState(false);

  // Save messages to DB as they complete
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      const newMsgs = messages.slice(prevLenRef.current);
      for (const msg of newMsgs) {
        // Only save complete messages (not streaming assistant)
        if (msg.role === "user") {
          if (!firstUserMsgRef.current) firstUserMsgRef.current = msg.content;
          saveMessage(msg, firstUserMsgRef.current);
        }
      }
    }
    prevLenRef.current = messages.length;
  }, [messages.length, saveMessage]);

  // Save assistant message when streaming completes
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        saveMessage(last, firstUserMsgRef.current);
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages, saveMessage]);

  // Auto-mark ground school topic as completed after meaningful engagement (6+ messages)
  useEffect(() => {
    if (!topicId || !user || topicMarkedRef.current) return;
    const userMsgCount = messages.filter(m => m.role === "user").length;
    if (userMsgCount >= 3) {
      topicMarkedRef.current = true;
      supabase
        .from("topic_progress")
        .upsert(
          {
            user_id: user.id,
            topic_id: topicId,
            completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,topic_id" }
        )
        .then(({ error }) => {
          if (error) console.error("Failed to mark topic complete:", error);
        });
    }
  }, [messages, topicId, user]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    if (!started) setStarted(true);
    send(input.trim());
    setInput("");
  };

  const handleStart = () => {
    setStarted(true);
    if (initialPrompt) {
      send(initialPrompt);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    reset();
    resetSession();
    firstUserMsgRef.current = "";
    topicMarkedRef.current = false;
    prevLenRef.current = 0;
    setStarted(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {!started && welcomeMessage && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-muted-foreground text-sm max-w-md mb-6">{welcomeMessage}</p>
            {initialPrompt && (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all"
              >
                Begin Session
              </button>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary/20 text-foreground border border-primary/30"
                  : "bg-secondary text-foreground border border-border"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_strong]:text-primary [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_li]:text-foreground [&_p]:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-secondary border border-border rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-destructive text-xs py-2">{error}</div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        {mode === "oral_exam" && messages.length >= 6 && !isLoading && (
          <button
            onClick={() => send("Give me my debrief. How did I do?")}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/30 text-accent rounded-lg text-xs font-display font-semibold tracking-wider uppercase hover:bg-accent/20 transition-all"
          >
            <ClipboardCheck className="w-4 h-4" />
            Request Debrief & Score
          </button>
        )}
        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Reset session"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none max-h-32"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:shadow-[0_0_15px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showGate && gateStatus !== "allowed" && (
        <ChatGateModal
          onDismiss={dismissGate}
          type={gateStatus as "signup_required" | "paywall"}
        />
      )}
    </div>
  );
};
