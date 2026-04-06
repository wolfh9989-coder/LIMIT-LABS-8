import type { CaptionMode, CaptionSegment, PlacementMode } from "@/lib/caption/types";

const placementMap: Record<PlacementMode, { x: number; y: number; width: number; align: CaptionSegment["align"] }> = {
  bottom: { x: 0.5, y: 0.9, width: 0.84, align: "center" },
  lowerThird: { x: 0.5, y: 0.82, width: 0.82, align: "center" },
  center: { x: 0.5, y: 0.5, width: 0.75, align: "center" },
  split: { x: 0.5, y: 0.73, width: 0.78, align: "center" },
  topBottom: { x: 0.5, y: 0.18, width: 0.8, align: "center" },
  stacked: { x: 0.5, y: 0.62, width: 0.72, align: "center" },
  left: { x: 0.18, y: 0.8, width: 0.6, align: "left" },
  right: { x: 0.82, y: 0.8, width: 0.6, align: "right" },
};

export function chooseAutoPlacement({
  mode,
  punchWordCount,
  text,
}: {
  mode: CaptionMode;
  punchWordCount: number;
  text: string;
}): PlacementMode {
  if (mode === "punchy") {
    if (punchWordCount >= 3) {
      return "split";
    }

    return "center";
  }

  if (mode === "hybrid") {
    return punchWordCount > 0 ? "split" : "lowerThird";
  }

  if (text.length < 30) {
    return "center";
  }

  return "lowerThird";
}

export function applyPlacement(
  segments: CaptionSegment[],
  placement: PlacementMode,
  mode: CaptionMode,
) {
  const base = placementMap[placement];

  return segments.map((segment, index) => {
    const punchShift = segment.isPunch
      ? { x: 0.5, y: placement === "topBottom" ? 0.35 : 0.5, width: 0.56, align: "center" as const }
      : null;

    const active = punchShift ?? base;

    let y = active.y;
    if (!segment.isPunch && placement === "topBottom") {
      y = 0.86;
    }
    if (placement === "stacked" && !segment.isPunch) {
      y = Math.min(0.9, active.y + index * 0.06);
    }
    if (mode === "normal" && segment.isPunch) {
      y = 0.82;
    }

    return {
      ...segment,
      x: active.x,
      y,
      width: active.width,
      align: active.align,
    };
  });
}

export function nudgeToSafeZone(segment: CaptionSegment, safePadding: number) {
  const pad = clamp01(safePadding);
  return {
    ...segment,
    x: clamp01(segment.x, pad, 1 - pad),
    y: clamp01(segment.y, pad, 1 - pad),
    width: clamp01(segment.width, 0.25, 1 - pad * 2),
  };
}

function clamp01(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}
