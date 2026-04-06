import { CaptionMode, CaptionSegment, PlacementMode } from "./types";

type PlacementInput = {
  text: string;
  mode: CaptionMode;
  placement: PlacementMode;
  punchWords?: string[];
  width?: number;
};

export function buildCaptionSegments({
  text,
  mode,
  placement,
  punchWords = [],
  width = 84,
}: PlacementInput): CaptionSegment[] {
  const words = text.split(/\s+/).map((w) => w.trim()).filter(Boolean);
  const set = new Set(punchWords.map((w) => w.toLowerCase()));

  if (mode === "normal") {
    return [
      {
        id: "main",
        text,
        startMs: 0,
        endMs: 3000,
        isPunch: false,
        x: 50,
        y: placement === "center" ? 50 : 80,
        width,
        align: "center",
      },
    ];
  }

  if (mode === "punchy") {
    const punch = words.filter((w) => set.has(w.toLowerCase()));
    const rest = words.filter((w) => !set.has(w.toLowerCase()));

    return [
      {
        id: "punch",
        text: punch.length ? punch.join(" ") : words.slice(0, 2).join(" "),
        startMs: 0,
        endMs: 1400,
        isPunch: true,
        x: 50,
        y: 44,
        width: 68,
        align: "center",
      },
      {
        id: "rest",
        text: rest.join(" ") || text,
        startMs: 1200,
        endMs: 3000,
        isPunch: false,
        x: 50,
        y: 82,
        width,
        align: "center",
      },
    ];
  }

  const punch = words.find((w) => set.has(w.toLowerCase())) || words[0] || "NOW";
  const rest = words.filter((w) => w !== punch).join(" ");

  return [
    {
      id: "hybrid-punch",
      text: punch,
      startMs: 0,
      endMs: 1200,
      isPunch: true,
      x: 50,
      y: 46,
      width: 60,
      align: "center",
    },
    {
      id: "hybrid-rest",
      text: rest || text,
      startMs: 800,
      endMs: 3000,
      isPunch: false,
      x: 50,
      y: placement === "topBottom" ? 78 : 82,
      width,
      align: "center",
    },
  ];
}
