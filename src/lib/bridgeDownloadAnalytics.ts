/**
 * Lightweight analytics for the SimPilot Bridge download flow.
 *
 * We don't want to take a hard dependency on a specific analytics provider
 * yet, so this helper:
 *   1. Pushes a structured event to `window.dataLayer` when present (works
 *      out of the box with Google Tag Manager / GA4).
 *   2. Always emits a `console.info` line tagged `[bridge-download]` so the
 *      events show up in the browser console + any log-collection tools we
 *      bolt on later (Sentry breadcrumbs, LogRocket, etc).
 *   3. Swallows every error — analytics must never break the download UX.
 */

import type { DownloadPhase } from "@/lib/bridgeDownload";

export type BridgeDownloadEvent = {
  phase: DownloadPhase;
  /** Pinned release tag the flow is targeting (e.g. "v1.0.0"). */
  version: string;
  /** Overall progress percentage at the time of the event. */
  percent: number;
  /** Short human-readable status message. */
  message?: string;
  /** Bytes received (downloading phase). */
  receivedBytes?: number;
  /** Total bytes when known (downloading phase). */
  totalBytes?: number;
  /** Milliseconds elapsed since the flow started. */
  durationMs?: number;
};

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

/**
 * In-memory record of the most recent tracked event. Surfaces the last
 * known phase to UI affordances (e.g. the "we detected an issue" hint on
 * the Bridge Setup page) so we don't need a parallel state store.
 */
let lastTrackedEvent: BridgeDownloadEvent | null = null;

export function getLastBridgeDownloadEvent(): BridgeDownloadEvent | null {
  return lastTrackedEvent;
}

export function trackBridgeDownloadEvent(event: BridgeDownloadEvent): void {
  try {
    const payload = {
      event: "bridge_download",
      bridge_phase: event.phase,
      bridge_version: event.version,
      bridge_percent: event.percent,
      bridge_message: event.message,
      bridge_received_bytes: event.receivedBytes,
      bridge_total_bytes: event.totalBytes,
      bridge_duration_ms: event.durationMs,
    };

    if (typeof window !== "undefined") {
      const w = window as DataLayerWindow;
      if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push(payload);
      }
    }

    // Structured console log so the events are always inspectable, even
    // before a GTM container is wired up.
    // eslint-disable-next-line no-console
    console.info("[bridge-download]", payload);
  } catch {
    /* analytics must never throw */
  }
}
