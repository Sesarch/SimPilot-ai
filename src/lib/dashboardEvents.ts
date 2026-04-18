/**
 * Lightweight in-page event bus so panels (Flight Deck readiness, Recent
 * Activity, etc.) can refresh instantly when a new exam/activity is saved
 * without requiring a page reload.
 */
export const DASHBOARD_REFRESH_EVENT = "simpilot:dashboard-refresh";

export type DashboardRefreshDetail = {
  /** Hint about what changed; consumers may ignore it. */
  source?: "exam" | "topic" | "atc" | "other";
};

/** Fire from anywhere a logbook-relevant write completes. */
export const emitDashboardRefresh = (detail: DashboardRefreshDetail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT, { detail }));
};

/** Subscribe; returns an unsubscribe function. */
export const onDashboardRefresh = (
  cb: (detail: DashboardRefreshDetail) => void,
): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: Event) => cb((e as CustomEvent<DashboardRefreshDetail>).detail ?? {});
  window.addEventListener(DASHBOARD_REFRESH_EVENT, handler);
  return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, handler);
};
