import { describe, expect, it } from "vitest";
import { detectAtisIntent, toAtisPhonetic } from "./atisIntent";

describe("ATIS intent recognition", () => {
  it("normalizes active single-letter ATIS codes to ICAO phonetics", () => {
    expect(toAtisPhonetic("E")).toBe("Echo");
    expect(toAtisPhonetic("J")).toBe("Juliett");
    expect(toAtisPhonetic("xray")).toBe("X-ray");
  });

  it("accepts the Montgomery initial taxi request with current Echo", () => {
    const result = detectAtisIntent(
      "Montgomery Ground, Cessna N123AB at Spot 5, Taxi to 28R for right downwind departure with Echo.",
      "E",
    );

    expect(result.hasToken).toBe(true);
    expect(result.spokenPhonetic).toBe("Echo");
    expect(result.matchesCurrent).toBe(true);
  });

  it("rejects outdated ATIS letters when a current code is active", () => {
    const result = detectAtisIntent("Cessna N123AB at Spot 5, taxi with Delta", "E");

    expect(result.hasToken).toBe(true);
    expect(result.spokenPhonetic).toBe("Delta");
    expect(result.matchesCurrent).toBe(false);
  });
});