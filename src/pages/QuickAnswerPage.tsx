import { useState, useRef, useEffect } from "react";
import { Send, Zap, Loader2, Trash2, BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string; isSummary?: boolean };
type SourcePref = "auto" | "FAR" | "PHAK" | "AIM";

const MAX_CHARS = 300;
const MIN_CHARS = 3;
const SOFT_CAP = 18; // trigger summarization at this many messages
const KEEP_RECENT = 6; // number of most-recent messages to preserve verbatim

// Fast client-side aviation keyword pre-check — if any match, skip server validation.
const AVIATION_KEYWORDS = /\b(faa|far|aim|phak|aircraft|airplane|plane|pilot|flight|flying|fly|cockpit|airspace|atc|tower|ifr|vfr|metar|taf|notam|runway|airport|altimeter|altitude|takeoff|landing|stall|spin|rudder|aileron|elevator|throttle|engine|propeller|fuel|checkride|oral|exam|cfi|dpe|sectional|chart|navigation|nav|gps|vor|ils|ndb|approach|departure|cleared|squawk|transponder|class\s?[abcdeg]|part\s?\d{2,3}|14\s?cfr|wind|weather|cloud|ceiling|visibility|turbulence|icing|density\s?altitude|magnetic|true|heading|course|bearing|crosswind|headwind|tailwind|flare|go.?around|pattern|downwind|base|final|holding|emergency|mayday|pan\s?pan|maneuver|chandelle|lazy.?eight|steep\s?turn|slow\s?flight|preflight|w\s?&\s?b|weight|balance|cg|vne|vno|vfe|vso|vs1|vx|vy|gs|airspeed|knot|kt|knots|hp|rpm|carb|mixture|trim|flap|gear|brake|tire|tach|cylinder|magneto|ignition|battery|alternator|generator|pitot|static|vacuum|gyro|attitude|hsi|cdi|dme|adsb|tcas|tis|fss|ctaf|unicom|atis|awos|asos|tfr|sfra|class|airworthiness|annual|inspection|logbook|certificate|rating|endorsement|medical|bfr)\b/i;


const SUGGESTIONS = [
  "VFR fuel requirements at night?",
  "What is class B airspace entry requirement?",
  "Define VX and VY",
  "When is a flight review required?",
];

export default function QuickAnswerPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sourcePref, setSourcePref] = useState<SourcePref>("auto");
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const compactIfNeeded = async (current: Msg[]): Promise<Msg[]> => {
    if (!autoSummarize || current.length < SOFT_CAP) return current;
    const cutoff = current.length - KEEP_RECENT;
    const toSummarize = current.slice(0, cutoff).filter((m) => !m.isSummary);
    const recent = current.slice(cutoff);
    const existingSummary = current.slice(0, cutoff).find((m) => m.isSummary);
    if (toSummarize.length === 0) return current;

    setIsSummarizing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-answer-summarize`;
      const payload = existingSummary
        ? [{ role: "assistant", content: existingSummary.content }, ...toSummarize]
        : toSummarize;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: payload }),
      });
      if (!resp.ok) {
        toast({ title: "Could not summarize", description: "Keeping full history." });
        return current;
      }
      const { summary } = await resp.json();
      if (!summary) return current;
      const compacted: Msg[] = [
        { role: "assistant", content: summary, isSummary: true },
        ...recent,
      ];
      toast({ title: "Older messages summarized", description: "Conversation compacted to free up space." });
      return compacted;
    } catch (e) {
      console.error(e);
      return current;
    } finally {
      setIsSummarizing(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading || isSummarizing) return;
    if (content.length < MIN_CHARS) {
      toast({ title: "Too short", description: `Question must be at least ${MIN_CHARS} characters.` });
      return;
    }
    if (content.length > MAX_CHARS) {
      toast({ title: "Too long", description: `Keep questions under ${MAX_CHARS} characters.` });
      return;
    }

    // Topical relevance check — only consult the server validator if no obvious aviation keywords matched
    if (!AVIATION_KEYWORDS.test(content)) {
      try {
        const vUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-answer-validate`;
        const vResp = await fetch(vUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question: content }),
        });
        if (vResp.ok) {
          const v = await vResp.json();
          if (v.relevant === false) {
            toast({
              title: "Off-topic question",
              description: v.suggestion || "Quick Answer only handles FAA, PHAK, FAR, or AIM questions. Try rephrasing.",
            });
            return;
          }
        }
      } catch {
        // Fail-open: let the question through if validator errors out
      }
    }

    // Auto-summarize older messages if approaching the cap
    let history = messages;
    if (messages.length >= SOFT_CAP) {
      if (!autoSummarize) {
        toast({ title: "Conversation full", description: "Enable auto-summarize or clear the chat." });
        return;
      }
      history = await compactIfNeeded(messages);
      setMessages(history);
    }

    const userMsg: Msg = { role: "user", content };
    const next = [...history, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    // Strip isSummary flag before sending (server only sees role+content)
    const wirePayload = next.map(({ role, content }) => ({ role, content }));

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-answer`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: wirePayload, sourcePref }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast({ title: "Slow down", description: "Too many requests. Try again shortly." });
        else if (resp.status === 402) toast({ title: "Service unavailable", description: "Please try again later." });
        else toast({ title: "Error", description: "Could not get an answer." });
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) =>
                prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m))
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Network error", description: "Check your connection and retry." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full p-4 gap-4">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Zap className="w-5 h-5 text-accent" />
        <div className="flex-1">
          <h1 className="font-display text-lg font-semibold tracking-[0.15em] uppercase">Quick Answer</h1>
          <p className="text-xs text-muted-foreground">Short FAA answers grounded in PHAK, FAR, and AIM.</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Switch id="auto-sum" checked={autoSummarize} onCheckedChange={setAutoSummarize} disabled={isLoading || isSummarizing} />
          <Label htmlFor="auto-sum" className="text-xs cursor-pointer">Auto-summarize</Label>
        </div>
        <Select value={sourcePref} onValueChange={(v) => setSourcePref(v as SourcePref)} disabled={isLoading}>
          <SelectTrigger className="w-[110px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="FAR">FAR</SelectItem>
            <SelectItem value="PHAK">PHAK</SelectItem>
            <SelectItem value="AIM">AIM</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setMessages([]); setInput(""); }}
          disabled={isLoading || isSummarizing || messages.length === 0}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear chat</span>
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ask anything. Try one of these:</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-2 whitespace-normal"
                  onClick={() => send(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Card
            key={i}
            className={`p-3 ${
              m.isSummary
                ? "bg-muted/20 border-dashed border-muted-foreground/40 text-muted-foreground"
                : m.role === "user"
                  ? "bg-muted/40 ml-8"
                  : "bg-card mr-8 border-accent/30"
            }`}
          >
            <div className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              {m.isSummary && <BookText className="w-3 h-3" />}
              {m.isSummary ? "Summary of earlier messages" : m.role === "user" ? "You" : "SimPilot"}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
            </div>
          </Card>
        ))}
        {isSummarizing && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Summarizing earlier messages…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex flex-col gap-1 border-t border-border pt-3"
      >
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Ask a quick FAA question…"
            disabled={isLoading}
            maxLength={MAX_CHARS}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || input.trim().length < MIN_CHARS}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className={`text-[11px] text-right tabular-nums ${input.length >= MAX_CHARS ? "text-destructive" : "text-muted-foreground"}`}>
          {input.length}/{MAX_CHARS}
        </div>
      </form>
    </div>
  );
}
