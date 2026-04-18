import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cooldown timer for "Resend verification email".
 * - start(seconds) arms a countdown
 * - parseRetryAfter() extracts remaining seconds from Supabase rate-limit messages
 *   like: "For security purposes, you can only request this after 51 seconds"
 *   or:   "you can only request this after 51s"
 */
export function useResendCooldown(initial = 0) {
  const [seconds, setSeconds] = useState(initial);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((s: number) => {
    if (s <= 0) return;
    setSeconds(s);
    stop();
    intervalRef.current = window.setInterval(() => {
      setSeconds((curr) => {
        if (curr <= 1) {
          stop();
          return 0;
        }
        return curr - 1;
      });
    }, 1000);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { seconds, start, active: seconds > 0 };
}

export function parseRetryAfter(message: string | undefined | null): number | null {
  if (!message) return null;
  // Matches "after 51 seconds", "after 51s", "in 51 seconds"
  const match = message.match(/(?:after|in)\s+(\d+)\s*(?:s\b|seconds?)/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
