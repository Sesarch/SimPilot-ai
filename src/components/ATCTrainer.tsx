import { useState, useRef, useEffect } from "react";
import { Send, Radio, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ATCMessage {
  id: string;
  role: "atc" | "pilot" | "system";
  content: string;
  feedback?: string;
}

const scenarios = [
  { id: "departure", label: "Departure Clearance", description: "Practice requesting and reading back departure clearances" },
  { id: "approach", label: "Approach & Landing", description: "Practice approach and landing communications" },
  { id: "enroute", label: "En Route", description: "Practice altitude changes, frequency handoffs, and position reports" },
  { id: "emergency", label: "Emergency Procedures", description: "Practice declaring emergencies and communicating with ATC" },
  { id: "ground", label: "Ground Operations", description: "Practice taxi clearances and ground communications" },
  { id: "vfr-flight-following", label: "VFR Flight Following", description: "Practice requesting and using VFR flight following services" },
];

const ATCTrainer = () => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ATCMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startScenario = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setMessages([]);
    setLoading(true);

    const scenario = scenarios.find(s => s.id === scenarioId);
    const systemPrompt = `You are an ATC Communication Trainer for pilots. You play the role of an Air Traffic Controller.
    
Scenario: ${scenario?.label} - ${scenario?.description}

Rules:
1. Use realistic ATC phraseology and callsigns
2. After each pilot transmission, provide brief feedback on their radio technique
3. Use proper aviation terminology
4. Include realistic details (runway numbers, frequencies, altitudes, headings)
5. Format your response as:
   **ATC:** [your ATC transmission]
   **Feedback:** [brief feedback on the pilot's last transmission, or "Begin by making your initial call" for the first message]
6. Keep transmissions concise and realistic
7. Assign the pilot callsign "November 1-2-3 Alpha Bravo" (N123AB)
8. Use a realistic airport (e.g., KJFK, KLAX, KORD)`;

    try {
      const { data, error } = await supabase.functions.invoke("pilot-chat", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Start the ${scenario?.label} scenario. Give the initial ATC instruction or set the scene. The pilot's callsign is N123AB.` },
          ],
        },
      });

      if (error) throw error;

      const reply = data?.choices?.[0]?.message?.content || data?.reply || "Unable to start scenario.";
      setMessages([
        { id: "1", role: "system", content: `📡 Scenario: ${scenario?.label}` },
        { id: "2", role: "atc", content: reply },
      ]);
    } catch (err) {
      setMessages([{ id: "1", role: "system", content: "Failed to start scenario. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ATCMessage = { id: Date.now().toString(), role: "pilot", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const scenario = scenarios.find(s => s.id === selectedScenario);
    const systemPrompt = `You are an ATC Communication Trainer. You play the role of Air Traffic Controller.
Scenario: ${scenario?.label}. Pilot callsign: N123AB.
After each pilot transmission, respond with:
**ATC:** [realistic ATC response]
**Feedback:** [brief feedback on pilot's phraseology, timing, and correctness]
Use proper aviation phraseology. Be realistic and educational.`;

    const chatHistory = newMessages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "atc" ? "assistant" : "user",
        content: m.content,
      }));

    try {
      const { data, error } = await supabase.functions.invoke("pilot-chat", {
        body: {
          messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
        },
      });

      if (error) throw error;
      const reply = data?.choices?.[0]?.message?.content || data?.reply || "No response.";
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "atc", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "system", content: "Connection lost. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedScenario) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Radio className="h-10 w-10 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-foreground">ATC Communication Trainer</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Practice realistic pilot-controller radio communications. Select a scenario to begin.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => startScenario(s.id)}
              className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left space-y-1"
            >
              <div className="font-semibold text-sm text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{scenarios.find(s => s.id === selectedScenario)?.label}</span>
          <span className="text-xs text-muted-foreground">• N123AB</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setSelectedScenario(null); setMessages([]); }}>
          <RotateCcw className="h-3 w-3 mr-1" /> New Scenario
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "pilot" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "pilot"
                  ? "bg-primary text-primary-foreground"
                  : msg.role === "system"
                  ? "bg-muted text-muted-foreground text-center text-xs w-full"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.role === "atc" && (
                <div className="flex items-center gap-1 mb-1">
                  <Volume2 className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-primary">ATC</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">Transmitting...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Key your mic... (type your radio call)"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ATCTrainer;
