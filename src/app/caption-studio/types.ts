export type StyleCategory =
  | "retro"
  | "comic"
  | "futuristic"
  | "gamer"
  | "love"
  | "pretty"
  | "dark"
  | "electric"
  | "cinematic"
  | "luxury"
  | "street"
  | "horror"
  | "neon"
  | "minimal"
  | "bubble"
  | "handwritten";

export type CaptionMode = "normal" | "punchy" | "hybrid";

export type PlacementMode =
  | "bottom"
  | "lowerThird"
  | "center"
  | "split"
  | "topBottom"
  | "left"
  | "right";

export type AnimationHint =
  | "none"
  | "pop"
  | "glitch"
  | "slideUp"
  | "pulse"
  | "typeOn"
  | "shake";

export type CaptionDecorationType =
  | "none"
  | "retroDisco"
  | "comicBubble"
  | "comicThought"
  | "comicPunch"
  | "metallicPanel"
  | "particles"
  | "pixelFrame"
  | "hearts"
  | "stars"
  | "lightning"
  | "smoke"
  | "glitchBars"
  | "chromeGlow"
  | "graffitiSpray"
  | "horrorDrip"
  | "luxuryShimmer"
  | "bubblePop"
  | "handDrawnStroke";

export type DecorationMotion =
  | "none"
  | "float"
  | "pulse"
  | "spark"
  | "drift"
  | "flicker"
  | "pop"
  | "shake"
  | "scan"
  | "shimmer";

export type CaptionDecoration = {
  type: CaptionDecorationType;
  animated: boolean;
  motion: DecorationMotion;
  intensity: number;
  opacity: number;
  accentA?: string;
  accentB?: string;
  accentC?: string;
};

export type FontStylePreset = {
  id: string;
  name: string;
  category: StyleCategory;
  fontFamily: string;
  fallbackFonts: string[];
  fontWeight: number;
  italic: boolean;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  glowColor?: string;
  glowStrength?: number;
  backgroundColor?: string;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  placement: PlacementMode;
  captionMode: CaptionMode;
  animationHint: AnimationHint;
  decoration?: CaptionDecoration;
};

export type CaptionTemplate = {
  id: string;
  name: string;
  category: StyleCategory;
  mode: CaptionMode;
  tone: string;
  template: string;
  punchWords: string[];
};

export type CaptionSegment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  isPunch: boolean;
  x: number;
  y: number;
  width: number;
  align: "left" | "center" | "right";
  presetId?: string;
  fontSize?: number;
  color?: string;
};

export type EditorControls = {
  fontSize: number;
  captionWidth: number;
  lineHeight: number;
  letterSpacing: number;
  textColor: string;
  strokeColor: string;
  glowColor: string;
  placementMode: PlacementMode;
  captionMode: CaptionMode;
  decorationsAnimated: boolean;
};
