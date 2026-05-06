import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Bot, ImagePlus, Map, RefreshCw, Send, Sparkles, User, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat, getTextContent } from "@/hooks/useChat";
import { useMessageLimit } from "@/hooks/useMessageLimit";
import { usePilotContext } from "@/hooks/usePilotContext";
import { usePOHUpload } from "@/hooks/usePOHUpload";
import { useAuth } from "@/hooks/useAuth";
import ChatGateModal from "@/components/ChatGateModal";
import PilotContextChips, { PilotContextBadge } from "@/components/PilotContextChips";
import { ChatBubbleContent } from "@/components/ChatBubbleContent";
import sampleChart from "@/assets/sample-vfr-sectional-kmyf.jpg";

const SUGGESTIONS = [
  "How do I prepare for my PPL checkride?",
  "Explain crosswind landing technique",
  "What's the traffic pattern procedure?",
];

const HeroChatBox = () => {
  const { user } = useAuth();
  const pilotCtx = usePilotContext();
  const { upload: uploadPOH, pohFilePath, clearPOH } = usePOHUpload();
  const limit = useMessageLimit();
  const chatOptions = useMemo(() => ({
    onBeforeSend: () => limit.checkLimit(),
    onAfterSend: () => { limit.recordUsage(); },
    pilotContext: pilotCtx.toPromptString(),
    pohFilePath: pohFilePath ?? undefined,
  }), [limit, pilotCtx, pohFilePath]);
  const { messages, isLoading, error, send, scrollRef } = useChat(chatOptions);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatUnlocked = pilotCtx.isComplete;
  const hasConversation = messages.length > 0;

  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Track user scroll position; pause auto-scroll if they scroll up away from the bottom.
  const NEAR_BOTTOM_PX = 80;
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    setAutoScroll(atBottom);
    setShowJumpToLatest(!atBottom && messages.length > 0);
  }, [scrollRef, messages.length]);

  const jumpToLatest = useCallback(() => {
    setAutoScroll(true);
    setShowJumpToLatest(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  // Auto-scroll only when enabled (user is near the bottom). Use "auto" during
  // active streaming to keep up with rapid token updates without smooth-scroll
  // queueing; use "smooth" once streaming settles.
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > NEAR_BOTTOM_PX) return; // safety: don't snap if user drifted up
    bottomRef.current?.scrollIntoView({
      behavior: isLoading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isLoading, autoScroll]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = (text: string, image?: string) => {
    if (!text.trim() && !pendingImage && !image) return;
    send(text, image || pendingImage || undefined);
    setInput("");
    setPendingImage(null);
  };

  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const c = messages[i].content;
        if (typeof c === "string") return { text: c, image: undefined as string | undefined };
        const text = c.filter((p) => p.type === "text").map((p: any) => p.text).join("");
        const image = c.find((p) => p.type === "image_url") as any;
        return { text, image: image?.image_url?.url as string | undefined };
      }
    }
    return null;
  }, [messages]);

  const handleRetry = () => {
    if (!lastUserMessage) return;
    send(lastUserMessage.text, lastUserMessage.image);
  };

  const handleSampleChart = async () => {
    // Convert the bundled image to base64 for the vision API
    const res = await fetch(sampleChart);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPendingImage(base64);
      setInput("What type of airspace is KMYF and what are the requirements to enter it?");
    };
    reader.readAsDataURL(blob);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className={`relative w-full mx-auto rounded-xl border border-border/60 dark:bg-[hsl(220,15%,25%)] bg-card/80 backdrop-blur-xl shadow-[0_0_60px_hsl(var(--cyan-glow)/0.08)] overflow-hidden transition-[max-width] duration-500 ease-out ${
        hasConversation ? "max-w-5xl" : "max-w-2xl"
      }`}
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
        <p className="font-display text-[11px] tracking-widest uppercase text-primary">
          SimPilot AI — Try it now
        </p>
        <div className="ml-auto flex items-center gap-2">
          {limit.remaining <= 3 && limit.remaining > 0 && (
            <span className="text-[10px] text-accent ">
              {limit.remaining} msg{limit.remaining !== 1 ? "s" : ""} left
            </span>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-hud-green animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`overflow-y-auto p-4 space-y-3 dark:bg-[hsl(220,15%,27%)] scroll-smooth transition-[height] duration-500 ease-out ${
          hasConversation
            ? "h-[min(70vh,640px)]"
            : "h-[200px]"
        }`}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            {!pilotCtx.isComplete ? (
              <PilotContextChips
                context={pilotCtx.context}
                onSelect={pilotCtx.updateField}
                onPOHUpload={uploadPOH}
                onPOHClear={clearPOH}
                pohUploaded={!!pohFilePath}
                compact
              />
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-primary/40" />
                <PilotContextBadge context={pilotCtx.context} onClear={(f) => pilotCtx.updateField(f, null)} pohUploaded={!!pohFilePath} onPOHClear={clearPOH} />
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
                  <button
                    onClick={handleSampleChart}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary transition-all flex items-center gap-1.5"
                  >
                    <Map className="w-3 h-3" />
                    Try: Analyze KMYF sectional chart
                  </button>
                </div>
              </>
            )}
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
                  <ChatBubbleContent content={msg.content} role={msg.role} />
                </div>
                {msg.role === "user" && (
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-accent" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2" aria-live="polite" aria-label="Assistant is thinking">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <div className="bg-secondary/80 rounded-lg px-3 py-2.5 max-w-[80%] w-full space-y-1.5">
                  <div className="h-2 rounded bg-muted-foreground/20 animate-pulse w-[85%]" />
                  <div className="h-2 rounded bg-muted-foreground/20 animate-pulse w-[70%] [animation-delay:0.15s]" />
                  <div className="h-2 rounded bg-muted-foreground/20 animate-pulse w-[55%] [animation-delay:0.3s]" />
                  <div className="flex gap-1 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 py-1" role="alert">
                <p className="text-xs text-destructive text-center">{error}</p>
                {lastUserMessage && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry last message
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {/* Anchor for auto-scroll */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
      {showJumpToLatest && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-primary/40 bg-primary/90 text-primary-foreground shadow-lg hover:bg-primary transition-all backdrop-blur-sm z-10"
          aria-label="Jump to latest message"
        >
          <ArrowDown className="w-3 h-3" />
          Jump to latest
        </button>
      )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/40 bg-secondary/20 dark:bg-[hsl(220,15%,28%)]">
        {/* Image preview */}
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img src={pendingImage} alt="Upload preview" className="h-16 rounded-lg border border-border/60 object-cover" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Upload chart or image"
            title="Upload VFR/IFR chart"
            disabled={!chatUnlocked}
          >
            <ImagePlus className="w-4 h-4 text-muted-foreground" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={!chatUnlocked ? "Complete your profile & enter email to chat…" : pendingImage ? "Describe what to analyze…" : "Ask about flight training..."}
            className="flex-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !chatUnlocked}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !pendingImage) || isLoading || !chatUnlocked}
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
