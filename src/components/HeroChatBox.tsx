import { useState, useMemo } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { useMessageLimit } from "@/hooks/useMessageLimit";
import ChatGateModal from "@/components/ChatGateModal";

const SUGGESTIONS = [
  "How do I prepare for my PPL checkride?",
  "Explain crosswind landing technique",
  "What's the traffic pattern procedure?",
];

const HeroChatBox = () => {
  const limit = useMessageLimit();
  const chatOptions = useMemo(() => ({
    onBeforeSend: () => limit.checkLimit(),
    onAfterSend: () => { limit.recordUsage(); },
  }), [limit]);
  const { messages, isLoading, error, send, scrollRef } = useChat(chatOptions);
  const [input, setInput] = useState("");

  const handleSend = (text: string) => {
    send(text);
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="relative w-full max-w-2xl mx-auto rounded-xl border border-border/60 dark:bg-[hsl(220,15%,25%)] bg-card/80 backdrop-blur-xl shadow-[0_0_60px_hsl(var(--cyan-glow)/0.08)] overflow-hidden"
    >
      {/* Gate overlay */}
      <AnimatePresence>
        {limit.showGate && (
          <ChatGateModal type={limit.gateStatus as "signup_required" | "paywall"} onDismiss={limit.dismissGate} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-secondary/30">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="font-display text-[11px] font-semibold tracking-widest uppercase text-primary">
          SimPilot AI — Try it now
        </p>
        <div className="ml-auto flex items-center gap-2">
          {limit.remaining <= 3 && limit.remaining > 0 && (
            <span className="text-[10px] text-accent font-medium">
              {limit.remaining} msg{limit.remaining !== 1 ? "s" : ""} left
            </span>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-hud-green animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="h-[200px] overflow-y-auto p-4 space-y-3 dark:bg-[hsl(220,15%,27%)]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Sparkles className="w-5 h-5 text-primary/40" />
            <p className="text-sm text-muted-foreground text-center">
              Ask me anything about flight training — for free!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/80 text-secondary-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:mt-1 [&_ol]:mt-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-accent" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <div className="bg-secondary/80 rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/40 bg-secondary/20 dark:bg-[hsl(220,15%,28%)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about flight training..."
            className="flex-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 backdrop-blur-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:shadow-[0_0_15px_hsl(var(--cyan-glow)/0.3)] transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default HeroChatBox;
