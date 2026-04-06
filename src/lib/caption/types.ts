export const captionCategories = [
  "retro",
  "comic",
  "futuristic",
  "gamer",
  "love",
  "pretty",
  "dark",
  "electric",
  "cinematic",
  "luxury",
  "street",
  "horror",
  "neon",
  "minimal",
  "bubble",
  "handwritten",
  "bold",
  "soft",
  "glitch",
  "metallic",
] as const;

export type CaptionCategory = (typeof captionCategories)[number];

export type CaptionMode = "normal" | "punchy" | "hybrid";

export type PlacementMode =
  | "bottom"
  | "lowerThird"
  | "center"
  | "split"
  | "topBottom"
  | "stacked"
  | "left"
  | "right";

export type AnimationHint = "pop" | "glitch" | "slideUp" | "pulse" | "typeOn" | "shake";

export type CaptionDecorationType =
  | "none"
  | "retroDisco"
  | "comicBubble"
  | "comicThought"
  | "comicPunch"
  | "comicShatter"
  | "comicZap"
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

export type DecorationMotion = "none" | "float" | "pulse" | "spark" | "drift" | "flicker" | "pop" | "shake";

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

export type CaptionPreset = {
  id: string;
  name: string;
  category: CaptionCategory;
  fontFamily: string;
  fallbackFonts: string[];
  fontWeight: number;
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
  animationHint?: AnimationHint;
  decoration?: CaptionDecoration;
};

export type FontStylePreset = CaptionPreset;

export type CaptionTemplate = {
  id: string;
  name: string;
  category: CaptionCategory;
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

export type CaptionCandidateType =
  | "punchy"
  | "normal"
  | "dramatic"
  | "social"
  | "subtitle"
  | "hook"
  | "cta";

export type CaptionCandidate = {
  id: string;
  type: CaptionCandidateType;
  text: string;
  toneLabel: string;
};

export type CaptionThemePalette = {
  id: string;
  name: string;
  text: string;
  stroke: string;
  glow: string;
  background: string;
  accent: string;
};

export type CaptionManualStyle = {
  fontSize: number;
  strokeWidth: number;
  shadowIntensity: number;
  glowIntensity: number;
  lineHeight: number;
  letterSpacing: number;
  safePadding: number;
  textColor: string;
  strokeColor: string;
  glowColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  accentColor: string;
  textOpacity: number;
  strokeOpacity: number;
  glowOpacity: number;
  /** Optional CSS gradient string for caption box background (overrides backgroundColor) */
  backgroundGradient?: string;
  /** Optional CSS gradient string for text fill (overrides textColor) */
  textGradient?: string;
};
