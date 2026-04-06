import { applyPlacement, chooseAutoPlacement, nudgeToSafeZone } from "@/lib/caption/smart-placement";
import type { CaptionSegment } from "@/lib/caption/types";

describe("smart placement", () => {
  const baseSegment: CaptionSegment = {
    id: "s1",
    text: "Hello",
    startMs: 0,
    endMs: 1000,
    isPunch: false,
    x: 0.5,
    y: 0.5,
    width: 0.8,
    align: "center",
    presetId: "retro-vhs",
  };

  it("chooses split for punchy with multiple punch words", () => {
    const mode = chooseAutoPlacement({ mode: "punchy", punchWordCount: 3, text: "A B C" });
    expect(mode).toBe("split");
  });

  it("applies topBottom placement with non-punch content at bottom", () => {
    const [placed] = applyPlacement([baseSegment], "topBottom", "normal");
    expect(placed.y).toBeCloseTo(0.86, 2);
  });

  it("keeps segment inside safe zone bounds", () => {
    const nudged = nudgeToSafeZone({ ...baseSegment, x: 0.98, y: 0.99, width: 0.95 }, 0.1);
    expect(nudged.x).toBeLessThanOrEqual(0.9);
    expect(nudged.y).toBeLessThanOrEqual(0.9);
    expect(nudged.width).toBeLessThanOrEqual(0.8);
  });
});
