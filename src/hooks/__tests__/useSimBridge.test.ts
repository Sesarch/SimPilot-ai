import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useSimBridge,
  SIM_FLIGHT_STARTED_EVENT,
  SIM_FLIGHT_FINISHED_EVENT,
  type SimFlightStartedDetail,
  type SimFlightFinishedDetail,
} from "@/hooks/useSimBridge";

/**
 * These tests verify the two thresholds the auto-logbook depends on:
 *   - flight-started fires when ground speed crosses above 30 kt
 *   - flight-finished fires after ground speed stays at 0 kt for 10 s
 *
 * The bridge WebSocket is mocked so we can drive frames synthetically.
 */

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 0;
  onopen: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
      // Simulate the bridge replying with auth-ok so the hook flips to "connected".
      this.onmessage?.({ data: JSON.stringify({ type: "auth-ok", sub: "u1" }) });
    }, 0);
  }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; this.onclose?.(); }
  emit(frame: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "fake.jwt.token" } },
      }),
    },
  },
}));

describe("useSimBridge — flight phase thresholds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches flight-started when ground speed crosses 30 kt", async () => {
    const started: SimFlightStartedDetail[] = [];
    const onStart = (e: Event) =>
      started.push((e as CustomEvent<SimFlightStartedDetail>).detail);
    window.addEventListener(SIM_FLIGHT_STARTED_EVENT, onStart as EventListener);

    renderHook(() => useSimBridge({ enabled: true, source: "msfs2024" }));

    // Let the mock socket open + auth-ok arrive.
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const ws = MockWebSocket.instances[0];

    // Frame at 25 kt — below threshold, nothing fires.
    act(() => ws.emit({ alt: 0, hdg: 0, spd: 25, com1: "118.0", ground_speed: 25 }));
    expect(started).toHaveLength(0);

    // Frame at 35 kt — above threshold, flight-started should fire exactly once.
    act(() => ws.emit({ alt: 0, hdg: 0, spd: 35, com1: "118.0", ground_speed: 35 }));
    expect(started).toHaveLength(1);
    expect(started[0].source).toBe("msfs2024");

    window.removeEventListener(SIM_FLIGHT_STARTED_EVENT, onStart as EventListener);
  });

  it("dispatches flight-finished only after 10 s of ground speed = 0", async () => {
    const finished: SimFlightFinishedDetail[] = [];
    const onFinish = (e: Event) =>
      finished.push((e as CustomEvent<SimFlightFinishedDetail>).detail);
    window.addEventListener(SIM_FLIGHT_FINISHED_EVENT, onFinish as EventListener);

    renderHook(() => useSimBridge({ enabled: true, source: "msfs2024" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const ws = MockWebSocket.instances[0];

    // Take off.
    act(() => ws.emit({ alt: 0, hdg: 0, spd: 60, com1: "118.0", ground_speed: 60, lat: 40.6413, lon: -73.7781 }));
    // Cruise.
    act(() => ws.emit({ alt: 5000, hdg: 90, spd: 110, com1: "118.0", ground_speed: 110 }));

    // Land — gs drops to 0, but only 5 s passes: nothing yet.
    act(() => ws.emit({ alt: 0, hdg: 90, spd: 0, com1: "118.0", ground_speed: 0, lat: 33.9425, lon: -118.4081 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(finished).toHaveLength(0);

    // Another 6 s of dwell at 0 kt → past the 10 s threshold.
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(finished).toHaveLength(1);
    expect(finished[0].durationMs).toBeGreaterThan(0);

    window.removeEventListener(SIM_FLIGHT_FINISHED_EVENT, onFinish as EventListener);
  });
});
