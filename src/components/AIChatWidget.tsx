import { useState, useRef, useMemo } from "react";
import { Send, Bot, User, Plane, X, ImagePlus } from "lucide-react";
import { ChatBubbleContent } from "@/components/ChatBubbleContent";
import { motion, AnimatePresence } from "framer-motion";
import { useChat, getTextContent } from "@/hooks/useChat";
import { useMessageLimit } from "@/hooks/useMessageLimit";
import { usePilotContext } from "@/hooks/usePilotContext";
import { usePOHUpload } from "@/hooks/usePOHUpload";
import ChatGateModal from "@/components/ChatGateModal";
import PilotContextChips, { PilotContextBadge } from "@/components/PilotContextChips";

const SUGGESTIONS = [
  "How do I prepare for my PPL checkride?",
  "Explain crosswind landing technique",
  "What's the traffic pattern procedure?",
  "Help me understand VOR navigation",
];

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const limit = useMessageLimit();
  const pilotCtx = usePilotContext();
  const { upload: uploadPOH, pohFilePath } = usePOHUpload();
  const chatOptions = useMemo(() => ({
    onBeforeSend: () => limit.checkLimit(),
    onAfterSend: () => { limit.recordUsage(); },
    pilotContext: pilotCtx.toPromptString(),
    pohFilePath: pohFilePath ?? undefined,
  }), [limit, pilotCtx, pohFilePath]);
  const { messages, isLoading, error, send, scrollRef } = useChat(chatOptions);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (text: string) => {
    send(text, pendingImage || undefined);
    setInput("");
    setPendingImage(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)] hover:shadow-[0_0_35px_hsl(var(--cyan-glow)/0.6)] transition-shadow"
          >
            <Plane className="w-6 h-6" />
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
            {/* Gate overlay */}
            <AnimatePresence>
              {limit.showGate && (
                <ChatGateModal type={limit.gateStatus as "signup_required" | "paywall"} onDismiss={limit.dismissGate} />
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-xs font-semibold tracking-wider uppercase text-foreground">
                    SimPilot AI
                  </p>
                  <p className="text-[10px] text-muted-foreground">Flight Training Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {limit.remaining <= 5 && limit.remaining > 0 && (
                  <span className="text-[10px] text-accent font-medium">
                    {limit.remaining} left
                  </span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  {!pilotCtx.isComplete ? (
                    <PilotContextChips
                      context={pilotCtx.context}
                      onSelect={pilotCtx.updateField}
                      onPOHUpload={uploadPOH}
                      pohUploaded={!!pohFilePath}
                      compact
                    />
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground text-center">
                        Ask me anything about flight training!
                      </p>
                      <PilotContextBadge context={pilotCtx.context} onClear={(f) => pilotCtx.updateField(f, null)} />
                      <p className="text-xs text-muted-foreground/70 text-center">
                        📷 Upload VFR/IFR charts for analysis
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSend(s)}
                            className="text-left text-xs p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <ChatBubbleContent content={msg.content} role={msg.role} />
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

              {error && (
                <p className="text-xs text-destructive text-center">{error}</p>
              )}
            </div>

            {/* Pending image preview */}
            {pendingImage && (
              <div className="px-3 py-2 border-t border-border bg-secondary/30">
                <div className="relative inline-block">
                  <img src={pendingImage} alt="Upload preview" className="max-h-20 rounded-md" />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex gap-2"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                  title="Upload chart or image"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingImage ? "Ask about this chart..." : "Ask about flight training..."}
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !pendingImage) || isLoading}
                  className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:shadow-[0_0_15px_hsl(var(--cyan-glow)/0.3)] transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
