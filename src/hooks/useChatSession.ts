import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Msg, ChatMode } from "@/hooks/useChat";

export function useChatSession(mode: ChatMode) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(
    async (firstMessage: string): Promise<string | null> => {
      if (!user) return null;
      if (sessionIdRef.current) return sessionIdRef.current;

      const title =
        firstMessage.length > 60
          ? firstMessage.slice(0, 57) + "..."
          : firstMessage;

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, mode, title })
        .select("id")
        .single();

      if (error || !data) {
        console.error("Failed to create session", error);
        return null;
      }

      sessionIdRef.current = data.id;
      return data.id;
    },
    [user, mode]
  );

  const saveMessage = useCallback(
    async (msg: Msg, firstUserMessage?: string) => {
      if (!user) return;
      const sid = await ensureSession(firstUserMessage || msg.content);
      if (!sid) return;

      await supabase.from("chat_messages").insert({
        session_id: sid,
        role: msg.role,
        content: msg.content,
      });
    },
    [user, ensureSession]
  );

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
  }, []);

  return { saveMessage, resetSession, sessionId: sessionIdRef };
}
