import { useState, useRef, useEffect } from "react";
import { Send, Zap, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };
type SourcePref = "auto" | "FAR" | "PHAK" | "AIM";

const MAX_CHARS = 300;
const MIN_CHARS = 3;

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
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    if (content.length < MIN_CHARS) {
      toast({ title: "Too short", description: `Question must be at least ${MIN_CHARS} characters.` });
      return;
    }
    if (content.length > MAX_CHARS) {
      toast({ title: "Too long", description: `Keep questions under ${MAX_CHARS} characters.` });
      return;
    }

    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-answer`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, sourcePref }),
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
          disabled={isLoading || messages.length === 0}
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
            className={`p-3 ${m.role === "user" ? "bg-muted/40 ml-8" : "bg-card mr-8 border-accent/30"}`}
          >
            <div className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">
              {m.role === "user" ? "You" : "SimPilot"}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
            </div>
          </Card>
        ))}
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
