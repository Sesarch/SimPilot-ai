/**
 * Production error tracking — ships errors to the `error_events` table
 * which is read from the admin dashboard at /admin → Errors tab.
 *
 * Captures:
 *  - window.onerror (uncaught JS)
 *  - unhandledrejection (promise rejections)
 *  - React render errors (via <ErrorBoundary>)
 *  - supabase.functions.invoke() failures (via reportEdgeFunctionError)
 *  - Network/API failures (via global fetch wrapper for supabase function calls)
 */

import { supabase } from "@/integrations/supabase/client";

const RELEASE = (import.meta.env.VITE_APP_VERSION as string) || "unknown";
const ENV = import.meta.env.MODE === "production" ? "production" : "development";

let SESSION_ID: string;
try {
  SESSION_ID = sessionStorage.getItem("__err_sid") || crypto.randomUUID();
  sessionStorage.setItem("__err_sid", SESSION_ID);
} catch {
  SESSION_ID = crypto.randomUUID();
}

// Simple rate-limit + dedupe so a hot-loop bug can't flood the table
const RECENT = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;
const MAX_PER_SESSION = 50;
let sentCount = 0;

function fingerprint(message: string, stack?: string | null): string {
  const firstFrame = (stack || "").split("\n").slice(0, 2).join("|").slice(0, 240);
  return `${message.slice(0, 160)}::${firstFrame}`;
}

function parseUA() {
  const ua = navigator.userAgent;
  let browser = "unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "unknown";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os };
}

export type ErrorReport = {
  source: "window" | "promise" | "react" | "edge_function" | "network" | "manual";
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  level?: "error" | "warning" | "fatal";
  statusCode?: number | null;
  endpoint?: string | null;
  metadata?: Record<string, unknown>;
};

export async function reportError(r: ErrorReport): Promise<void> {
  try {
    if (sentCount >= MAX_PER_SESSION) return;
    const fp = fingerprint(r.message, r.stack);
    const now = Date.now();
    const last = RECENT.get(fp) || 0;
    if (now - last < DEDUPE_WINDOW_MS) return;
    RECENT.set(fp, now);
    sentCount += 1;

    const { browser, os } = parseUA();
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch { /* ignore */ }

    await supabase.from("error_events").insert({
      user_id: userId,
      session_id: SESSION_ID,
      release: RELEASE,
      environment: ENV,
      source: r.source,
      level: r.level || "error",
      message: r.message.slice(0, 2000),
      stack: r.stack?.slice(0, 8000) ?? null,
      component_stack: r.componentStack?.slice(0, 4000) ?? null,
      url: window.location.href,
      route: window.location.pathname,
      user_agent: navigator.userAgent,
      browser,
      os,
      status_code: r.statusCode ?? null,
      endpoint: r.endpoint ?? null,
      fingerprint: fp,
      metadata: r.metadata || {},
    });
  } catch {
    // Never throw from the error reporter
  }
}

export function reportEdgeFunctionError(
  fnName: string,
  err: unknown,
  statusCode?: number,
): void {
  const e = err as { message?: string; stack?: string };
  void reportError({
    source: "edge_function",
    message: `[${fnName}] ${e?.message || String(err)}`,
    stack: e?.stack,
    statusCode: statusCode ?? null,
    endpoint: fnName,
  });
}

let installed = false;
export function installErrorTracking(): void {
  if (installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    void reportError({
      source: "window",
      message: event.message || "Unknown error",
      stack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string; stack?: string } | string | undefined;
    const message = typeof reason === "string"
      ? reason
      : reason?.message || "Unhandled promise rejection";
    void reportError({
      source: "promise",
      message,
      stack: typeof reason === "object" ? reason?.stack : undefined,
    });
  });

  // Wrap fetch to capture failed Supabase edge function calls (4xx/5xx)
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    try {
      const res = await origFetch(input, init);
      if (!res.ok && /\/functions\/v1\//.test(url)) {
        const fn = url.split("/functions/v1/")[1]?.split("?")[0] || "unknown";
        void reportError({
          source: "network",
          message: `Edge function ${fn} returned ${res.status}`,
          statusCode: res.status,
          endpoint: fn,
          level: res.status >= 500 ? "error" : "warning",
        });
      }
      return res;
    } catch (err) {
      if (/\/functions\/v1\//.test(url)) {
        const fn = url.split("/functions/v1/")[1]?.split("?")[0] || "unknown";
        const e = err as Error;
        void reportError({
          source: "network",
          message: `Edge function ${fn} fetch failed: ${e.message}`,
          stack: e.stack,
          endpoint: fn,
        });
      }
      throw err;
    }
  };
}
