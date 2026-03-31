import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const QUICK_QUESTIONS = [
  "How do I get started?",
  "What's included in the free trial?",
  "How does pricing work?",
  "I need help with my account",
];

const SupportChatWidget = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);
  // Hide on homepage where the flight training chat widget already exists
  if (location.pathname === "/") return null;

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        try {
          const errJson = JSON.parse(errText);
          throw new Error(errJson.error || "Failed to connect");
        } catch {
          throw new Error("Failed to connect to support");
        }
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Check for escalation marker
      if (assistantSoFar.includes("[ESCALATE]")) {
        setEscalated(true);
        // Clean the marker from the displayed message
        const cleaned = assistantSoFar.replace(/\[ESCALATE\]/g, "").trim();
        setMessages(prev =>
          prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: cleaned } : m)
        );
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again or email us at support@simpilot.ai." }]);
    }

    setIsLoading(false);
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setEscalated(false);
    streamChat(updated);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    setEmailCaptured(true);
    setMessages([{
      role: "assistant",
      content: `Hi there! 👋 I'm SimPilot's support assistant. How can I help you today?`,
    }]);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Open support chat"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-3rem)] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase">SimPilot Support</p>
                  <p className="text-[10px] opacity-80">We typically reply instantly</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email capture */}
            {!emailCaptured ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-display text-base font-semibold text-foreground">Welcome to SimPilot Support</h3>
                  <p className="text-xs text-muted-foreground">Enter your email so we can follow up if needed.</p>
                </div>
                <form onSubmit={handleEmailSubmit} className="w-full space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-border"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={!email.trim()}>
                    Start Chat
                  </Button>
                </form>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p]:leading-relaxed [&>ul]:my-1 [&>ol]:my-1">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-1">
                          <User className="w-3 h-3 text-accent" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                      <div className="bg-secondary rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Escalation card */}
                  {escalated && (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-foreground">Need more help? Reach our team directly:</p>
                      <a
                        href={`mailto:support@simpilot.ai?subject=Support Request&body=Email: ${email}%0A%0A`}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email support@simpilot.ai
                      </a>
                    </div>
                  )}

                  {/* Quick questions (only show at start) */}
                  {messages.length === 1 && !isLoading && (
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="text-left text-xs p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                    className="flex gap-2"
                  >
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your question..."
                      className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatWidget;
