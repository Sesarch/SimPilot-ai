import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, RotateCcw, Loader2, ClipboardCheck, ImagePlus } from "lucide-react";
import { ChatBubbleContent } from "@/components/ChatBubbleContent";
import { useChat, ChatMode, Msg, getTextContent } from "@/hooks/useChat";
import { useMessageLimit } from "@/hooks/useMessageLimit";
import { useChatSession } from "@/hooks/useChatSession";
import { useAuth } from "@/hooks/useAuth";
import { usePilotContext } from "@/hooks/usePilotContext";
import { usePOHUpload } from "@/hooks/usePOHUpload";
import { supabase } from "@/integrations/supabase/client";
import ChatGateModal from "@/components/ChatGateModal";
import PilotContextChips, { PilotContextBadge } from "@/components/PilotContextChips";
import ExamPassCelebration from "@/components/ExamPassCelebration";

interface TrainingChatProps {
  mode: ChatMode;
  placeholder?: string;
  welcomeMessage?: string;
  initialPrompt?: string;
  topicId?: string;
  /** Overrides the certificate level in the pilot context sent to the AI (e.g. "PPL", "IR", "CPL") */
  certificateOverride?: string;
}

export const TrainingChat = ({
  mode,
  placeholder = "Type your answer or question...",
  welcomeMessage,
  initialPrompt,
  topicId,
  certificateOverride,
}: TrainingChatProps) => {
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstUserMsgRef = useRef<string>("");
  const { gateStatus, showGate, dismissGate, checkLimit, recordUsage } = useMessageLimit();
  const { user } = useAuth();
  const pilotCtx = usePilotContext();
  const { upload: uploadPOH, pohFilePath, clearPOH } = usePOHUpload();
  const topicMarkedRef = useRef(false);
  const { saveMessage, resetSession, sessionId } = useChatSession(mode);
  const basePilotContext = pilotCtx.toPromptString();
  const certLabels: Record<string, string> = {
    PPL: "Private Pilot (PPL)",
    IR: "Instrument Rating (IR)",
    CPL: "Commercial Pilot (CPL)",
    ATP: "Airline Transport Pilot (ATP)",
  };
  const certDepth: Record<string, string> = {
    PPL: "Use Private Pilot ACS depth: foundational concepts, VFR-focused, basic aerodynamics, regulations (Part 61/91), weather basics. Avoid advanced IFR/commercial nuance unless directly asked.",
    IR: "Use Instrument Rating ACS depth: emphasize IFR procedures, approach plates, holds, clearances, IMC decision-making, partial panel, regulations relevant to instrument ops. Assume PPL knowledge.",
    CPL: "Use Commercial Pilot ACS depth: assume PPL+IR knowledge. Emphasize precision maneuvers, complex/high-performance ops, commercial regulations (Part 119/135 awareness), advanced ADM, performance and W&B at commercial standards.",
    ATP: "Use Airline Transport Pilot ACS depth: assume full PPL+IR+CPL mastery. Emphasize Part 121/135 ops, multi-crew CRM, jet/turboprop systems, high-altitude aerodynamics (Mach, coffin corner, Dutch roll), advanced meteorology (jet streams, CAT, icing certification), FMS/automation management, ETOPS, RVSM, performance-based navigation (RNP/RNAV), and Threat & Error Management (TEM). Hold the student to airline-transport-pilot precision standards.",
  };
  const augmentedPilotContext = certificateOverride
    ? `${basePilotContext ? basePilotContext + " | " : ""}Active Study Track: ${certLabels[certificateOverride] ?? certificateOverride}\nACS DEPTH DIRECTIVE: ${certDepth[certificateOverride] ?? ""}`
    : basePilotContext;

  const { messages, isLoading, error, send, scrollRef, reset } = useChat({
    mode,
    onBeforeSend: () => checkLimit(),
    onAfterSend: () => recordUsage(),
    pilotContext: augmentedPilotContext,
    pohFilePath: pohFilePath ?? undefined,
  });
  const [started, setStarted] = useState(false);
  const [celebration, setCelebration] = useState<{ score: number; total: number } | null>(null);

  // Save messages to DB as they complete
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      const newMsgs = messages.slice(prevLenRef.current);
      for (const msg of newMsgs) {
        if (msg.role === "user") {
          const text = getTextContent(msg.content);
          if (!firstUserMsgRef.current) firstUserMsgRef.current = text;
          saveMessage(msg, firstUserMsgRef.current);
        }
      }
    }
    prevLenRef.current = messages.length;
  }, [messages.length, saveMessage]);

  // Parse debrief score from assistant message
  const scoresSavedRef = useRef(false);
  const parseAndSaveScore = useCallback(
    async (content: string) => {
      if (mode !== "oral_exam" || !user || scoresSavedRef.current) return;
      const scoreMatch = content.match(/(\d+)\s*(?:\/|out of)\s*(\d+)/i);
      const resultMatch = content.match(/\b(PASS|FAIL|INCOMPLETE)\b/i);
      if (!scoreMatch) return;

      const score = parseInt(scoreMatch[1], 10);
      const total = parseInt(scoreMatch[2], 10);
      if (isNaN(score) || isNaN(total) || total === 0) return;

      scoresSavedRef.current = true;
      const result = resultMatch ? resultMatch[1].toUpperCase() : (score / total >= 0.7 ? "PASS" : "FAIL");

      if (result === "PASS") {
        setCelebration({ score, total });
      }

      const { error } = await supabase.from("exam_scores").insert({
        user_id: user.id,
        exam_type: "oral_exam",
        score,
        total_questions: total,
        result,
        session_id: sessionId.current,
      });
      if (error) console.error("Failed to save exam score:", error);
    },
    [mode, user, sessionId]
  );

  // Save assistant message when streaming completes
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        saveMessage(last, firstUserMsgRef.current);
        parseAndSaveScore(getTextContent(last.content));
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages, saveMessage, parseAndSaveScore]);

  // Auto-mark ground school topic as completed
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
    if ((!input.trim() && !pendingImage) || isLoading) return;
    if (!started) setStarted(true);
    send(input.trim() || "Analyze this chart", pendingImage || undefined);
    setInput("");
    setPendingImage(null);
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
    scoresSavedRef.current = false;
    prevLenRef.current = 0;
    setStarted(false);
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
    <div className="flex flex-col h-full relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <ExamPassCelebration
        show={!!celebration}
        score={celebration?.score ?? 0}
        total={celebration?.total ?? 0}
        onDismiss={() => setCelebration(null)}
      />
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {!started && welcomeMessage && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {!pilotCtx.isComplete ? (
              <div className="mb-4">
                <PilotContextChips
                  context={pilotCtx.context}
                  onSelect={pilotCtx.updateField}
                  onPOHUpload={uploadPOH}
                  onPOHClear={clearPOH}
                  pohUploaded={!!pohFilePath}
                />
              </div>
            ) : (
              <PilotContextBadge context={pilotCtx.context} onClear={(f) => pilotCtx.updateField(f, null)} pohUploaded={!!pohFilePath} onPOHClear={clearPOH} />
            )}
            <p className="text-muted-foreground text-sm max-w-md mb-6 mt-2">{welcomeMessage}</p>
            {initialPrompt && (
              <button
                onClick={handleStart}
                disabled={!pilotCtx.isComplete}
                className="px-6 py-3 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded-lg hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all disabled:opacity-40"
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
              <ChatBubbleContent content={msg.content} role={msg.role} />
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

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-4 py-2 border-t border-border bg-secondary/30">
          <div className="relative inline-block">
            <img src={pendingImage} alt="Upload preview" className="max-h-24 rounded-md" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Upload chart or image"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingImage ? "Ask about this chart..." : placeholder}
            rows={1}
            className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none max-h-32"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingImage) || isLoading}
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
