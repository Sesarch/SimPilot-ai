import { describe, it, expect } from "vitest";
import { detectCallsignIntent } from "./callsignIntent";

describe("detectCallsignIntent", () => {
  it("matches full N-number", () => {
    expect(detectCallsignIntent("N123AB taxi to 28R", "N123AB").hasCallsign).toBe(true);
  });
  it("matches spelled-out full callsign", () => {
    expect(
      detectCallsignIntent("November one two three alpha bravo, roger", "N123AB").hasCallsign,
    ).toBe(true);
  });
  it("matches FAA short form (3AB)", () => {
    expect(detectCallsignIntent("3AB monitoring tower", "N123AB").hasCallsign).toBe(true);
  });
  it("matches spelled short form 'three alpha bravo'", () => {
    expect(
      detectCallsignIntent("Three alpha bravo, taxi 28R via Hotel", "N123AB").hasCallsign,
    ).toBe(true);
  });
  it("matches with type prefix (Cessna 3AB)", () => {
    expect(detectCallsignIntent("Cessna 3AB ready to taxi", "N123AB").hasCallsign).toBe(true);
  });
  it("rejects silent readback", () => {
    expect(detectCallsignIntent("Roger, taxi 28R via Hotel", "N123AB").hasCallsign).toBe(false);
  });
  it("rejects unrelated callsign", () => {
    expect(detectCallsignIntent("November four five six, roger", "N123AB").hasCallsign).toBe(false);
  });
  it("returns true when no callsign is configured", () => {
    expect(detectCallsignIntent("roger", null).hasCallsign).toBe(true);
  });
});
