import { useState, useRef, useEffect, useCallback } from "react";

export type ImageContent = { type: "image_url"; image_url: { url: string } };
export type TextContent = { type: "text"; text: string };
export type MessageContent = string | (TextContent | ImageContent)[];
export type Msg = { role: "user" | "assistant"; content: MessageContent };
export type ChatMode = "general" | "ground_school" | "oral_exam";

/** Extract plain text from a message's content */
export function getTextContent(content: MessageContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("");
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pilot-chat`;

async function streamChat({
  messages,
  mode,
  pilotContext,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  mode: ChatMode;
  pilotContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode, pilotContext }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        /* ignore */
      }
    }
  }

  onDone();
}

export function useChat(options?: {
  onBeforeSend?: () => boolean;
  onAfterSend?: () => void;
  mode?: ChatMode;
  pilotContext?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<ChatMode>(options?.mode || "general");

  useEffect(() => {
    modeRef.current = options?.mode || "general";
  }, [options?.mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async (text: string, imageDataUrl?: string) => {
    if (!text.trim() || isLoading) return;

    if (options?.onBeforeSend && !options.onBeforeSend()) return;

    // Build user message content — multimodal if image is attached
    let userContent: MessageContent;
    if (imageDataUrl) {
      userContent = [
        { type: "text", text: text.trim() },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ];
    } else {
      userContent = text.trim();
    }

    const userMsg: Msg = { role: "user", content: userContent };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        mode: modeRef.current,
        pilotContext: options?.pilotContext,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          setIsLoading(false);
          options?.onAfterSend?.();
        },
        onError: (msg) => {
          setError(msg);
          setIsLoading(false);
        },
      });
    } catch {
      setError("Connection failed. Please try again.");
      setIsLoading(false);
    }
  }, [isLoading, messages, options]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, scrollRef, reset };
}
