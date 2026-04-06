import {
  AnimationHint,
  CaptionDecoration,
  CaptionMode,
  DecorationMotion,
  FontStylePreset,
  PlacementMode,
  StyleCategory,
} from "./types";

const categories: StyleCategory[] = [
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
];

const retroFonts = ["Bebas Neue", "Anton", "Oswald", "Unica One"];
const comicFonts = ["Bangers", "Luckiest Guy", "Comic Neue", "Fredoka"];
const futuristicFonts = ["Orbitron", "Audiowide", "Exo 2", "Rajdhani", "Saira"];
const gamerFonts = ["Press Start 2P", "VT323", "Silkscreen", "Share Tech Mono"];
const loveFonts = ["Pacifico", "Great Vibes", "Caveat", "Playfair Display"];
const darkFonts = ["Cinzel", "Black Ops One", "Archivo Black"];
const neonFonts = ["Orbitron", "Major Mono Display", "Audiowide"];
const streetFonts = ["Permanent Marker", "Rubik Mono One", "Kanit"];
const handwrittenFonts = ["Caveat", "Patrick Hand"];
const cinematicFonts = ["Playfair Display", "DM Serif Display", "Cinzel"];
const luxuryFonts = ["DM Serif Display", "Playfair Display", "Cinzel", "Great Vibes"];
const minimalFonts = ["Inter", "Montserrat", "Poppins"];
const bubbleFonts = ["Fredoka", "Comic Neue", "Poppins"];

function getFontByCategory(category: StyleCategory, i: number) {
  switch (category) {
    case "retro":
      return retroFonts[i % retroFonts.length];
    case "comic":
      return comicFonts[i % comicFonts.length];
    case "futuristic":
      return futuristicFonts[i % futuristicFonts.length];
    case "gamer":
      return gamerFonts[i % gamerFonts.length];
    case "love":
    case "pretty":
      return loveFonts[i % loveFonts.length];
    case "dark":
    case "horror":
      return darkFonts[i % darkFonts.length];
    case "electric":
    case "neon":
      return neonFonts[i % neonFonts.length];
    case "street":
      return streetFonts[i % streetFonts.length];
    case "handwritten":
      return handwrittenFonts[i % handwrittenFonts.length];
    case "cinematic":
      return cinematicFonts[i % cinematicFonts.length];
    case "luxury":
      return luxuryFonts[i % luxuryFonts.length];
    case "minimal":
      return minimalFonts[i % minimalFonts.length];
    case "bubble":
      return bubbleFonts[i % bubbleFonts.length];
    default:
      return "Inter";
  }
}

const fallbackByCategory: Record<StyleCategory, string[]> = {
  retro: ["sans-serif", "system-ui"],
  comic: ["cursive", "sans-serif"],
  futuristic: ["sans-serif", "system-ui"],
  gamer: ["monospace", "system-ui"],
  love: ["cursive", "serif"],
  pretty: ["cursive", "serif"],
  dark: ["serif", "system-ui"],
  electric: ["sans-serif", "system-ui"],
  cinematic: ["serif", "system-ui"],
  luxury: ["serif", "system-ui"],
  street: ["sans-serif", "system-ui"],
  horror: ["serif", "system-ui"],
  neon: ["sans-serif", "system-ui"],
  minimal: ["sans-serif", "system-ui"],
  bubble: ["cursive", "sans-serif"],
  handwritten: ["cursive", "sans-serif"],
};

const fallbackPool = ["sans-serif", "serif", "monospace", "system-ui"];

const placements: PlacementMode[] = ["bottom", "lowerThird", "center", "split", "topBottom", "left", "right"];
const modes: CaptionMode[] = ["normal", "punchy", "hybrid"];
const animations: AnimationHint[] = ["none", "pop", "glitch", "slideUp", "pulse", "typeOn", "shake"];
const palette = [
  "#ffffff",
  "#22d3ee",
  "#38bdf8",
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#fb7185",
  "#f59e0b",
  "#facc15",
  "#4ade80",
  "#2dd4bf",
  "#e2e8f0",
  "#f8fafc",
  "#67e8f9",
  "#a78bfa",
  "#f0abfc",
];

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function decorationFor(category: StyleCategory, idx: number): CaptionDecoration {
  switch (category) {
    case "retro":
      return { type: "retroDisco", animated: true, motion: "pulse" as DecorationMotion, intensity: 0.8, opacity: 0.8, accentA: "#ff4fd8", accentB: "#ffd166", accentC: "#22d3ee" };
    case "comic":
      return { type: idx % 3 === 0 ? "comicBubble" : idx % 3 === 1 ? "comicThought" : "comicPunch", animated: true, motion: "pop" as DecorationMotion, intensity: 1, opacity: 1 };
    case "futuristic":
      return { type: idx % 2 === 0 ? "metallicPanel" : "particles", animated: true, motion: idx % 2 === 0 ? "shimmer" as DecorationMotion : "drift" as DecorationMotion, intensity: 0.8, opacity: 0.85 };
    case "gamer":
      return { type: idx % 2 === 0 ? "pixelFrame" : "glitchBars", animated: true, motion: "flicker" as DecorationMotion, intensity: 0.9, opacity: 0.9 };
    case "love":
      return { type: idx % 2 === 0 ? "hearts" : "stars", animated: true, motion: "float" as DecorationMotion, intensity: 0.7, opacity: 0.85 };
    case "pretty":
      return { type: idx % 2 === 0 ? "stars" : "bubblePop", animated: true, motion: "float" as DecorationMotion, intensity: 0.55, opacity: 0.75 };
    case "dark":
      return { type: "smoke", animated: true, motion: "drift" as DecorationMotion, intensity: 0.8, opacity: 0.7 };
    case "electric":
      return { type: "lightning", animated: true, motion: "spark" as DecorationMotion, intensity: 1, opacity: 0.95 };
    case "cinematic":
      return { type: "chromeGlow", animated: true, motion: "shimmer" as DecorationMotion, intensity: 0.45, opacity: 0.45 };
    case "luxury":
      return { type: "luxuryShimmer", animated: true, motion: "shimmer" as DecorationMotion, intensity: 0.7, opacity: 0.8, accentA: "#facc15", accentB: "#ffffff", accentC: "#f59e0b" };
    case "street":
      return { type: "graffitiSpray", animated: true, motion: "flicker" as DecorationMotion, intensity: 0.7, opacity: 0.8 };
    case "horror":
      return { type: "horrorDrip", animated: true, motion: "shake" as DecorationMotion, intensity: 0.9, opacity: 0.85 };
    case "neon":
      return { type: "chromeGlow", animated: true, motion: "pulse" as DecorationMotion, intensity: 0.8, opacity: 0.8, accentA: "#22d3ee", accentB: "#d946ef", accentC: "#818cf8" };
    case "minimal":
      return { type: "none", animated: false, motion: "none" as DecorationMotion, intensity: 0, opacity: 0 };
    case "bubble":
      return { type: "bubblePop", animated: true, motion: "pop" as DecorationMotion, intensity: 0.8, opacity: 0.8 };
    case "handwritten":
      return { type: "handDrawnStroke", animated: true, motion: "none" as DecorationMotion, intensity: 0.8, opacity: 0.8 };
  }
}

function categoryOverrides(category: StyleCategory, idx: number): Partial<FontStylePreset> {
  switch (category) {
    case "retro":
      return { textTransform: "uppercase", strokeWidth: 2, shadowBlur: 8, glowStrength: 12, backgroundColor: "rgba(255,179,71,0.12)" };
    case "comic":
      return { textTransform: "uppercase", strokeWidth: 4, shadowBlur: 2, glowStrength: 4, backgroundColor: "rgba(255,255,255,0.12)" };
    case "futuristic":
      return { textTransform: "uppercase", letterSpacing: 1.8, shadowBlur: 10, glowStrength: 16, backgroundColor: "rgba(34,211,238,0.08)" };
    case "gamer":
      return { textTransform: "uppercase", strokeWidth: 3, shadowBlur: 12, glowStrength: 18, backgroundColor: "rgba(129,140,248,0.10)" };
    case "love":
      return { textTransform: "capitalize", italic: true, shadowBlur: 10, glowStrength: 8, backgroundColor: "rgba(244,114,182,0.10)" };
    case "pretty":
      return { textTransform: "capitalize", shadowBlur: 8, glowStrength: 6, backgroundColor: "rgba(240,171,252,0.10)" };
    case "dark":
      return { textTransform: "uppercase", strokeWidth: 2, shadowBlur: 18, glowStrength: 3, backgroundColor: "rgba(15,23,42,0.45)" };
    case "electric":
      return { textTransform: "uppercase", strokeWidth: 2, shadowBlur: 14, glowStrength: 22, backgroundColor: "rgba(59,130,246,0.08)" };
    case "cinematic":
      return { textTransform: "uppercase", letterSpacing: 2.2, shadowBlur: 14, glowStrength: 5, backgroundColor: "rgba(255,255,255,0.03)" };
    case "luxury":
      return { textTransform: "capitalize", shadowBlur: 8, glowStrength: 6, backgroundColor: "rgba(250,204,21,0.08)" };
    case "street":
      return { textTransform: "uppercase", strokeWidth: 3, shadowBlur: 6, glowStrength: 8, backgroundColor: "rgba(148,163,184,0.10)" };
    case "horror":
      return { textTransform: "uppercase", strokeWidth: 2, shadowBlur: 18, glowStrength: 10, backgroundColor: "rgba(127,29,29,0.18)" };
    case "neon":
      return { textTransform: "uppercase", strokeWidth: 1, shadowBlur: 16, glowStrength: 24, backgroundColor: "rgba(34,211,238,0.05)" };
    case "minimal":
      return { textTransform: "none", strokeWidth: 0, shadowBlur: 0, glowStrength: 0, backgroundColor: "rgba(255,255,255,0.04)" };
    case "bubble":
      return { textTransform: "capitalize", strokeWidth: 3, shadowBlur: 4, glowStrength: 4, backgroundColor: "rgba(244,114,182,0.10)" };
    case "handwritten":
      return { textTransform: "none", italic: true, strokeWidth: 1, shadowBlur: 5, glowStrength: 4, backgroundColor: "rgba(255,255,255,0.05)" };
  }
}

export const FONT_PRESETS: FontStylePreset[] = Array.from({ length: 200 }, (_, i) => {
  const category = categories[i % categories.length];
  const categoryFallbacks = fallbackByCategory[category];

  return {
    id: `font-preset-${String(i + 1).padStart(3, "0")}`,
    name: `${titleCase(category)} Flux ${String(i + 1).padStart(3, "0")}`,
    category,
    fontFamily: getFontByCategory(category, i),
    fallbackFonts: [
      categoryFallbacks[0] ?? fallbackPool[i % fallbackPool.length],
      categoryFallbacks[1] ?? "sans-serif",
    ],
    fontWeight: 400 + (i % 6) * 100,
    italic: i % 9 === 0,
    textTransform: "none",
    fontSize: 22 + (i % 10) * 3,
    lineHeight: 1 + (i % 6) * 0.08,
    letterSpacing: ((i % 7) - 2) * 0.25,
    textColor: palette[i % palette.length],
    strokeColor: palette[(i + 5) % palette.length],
    strokeWidth: 1 + (i % 4),
    shadowColor: palette[(i + 11) % palette.length],
    shadowBlur: 4 + (i % 8) * 2,
    glowColor: palette[(i + 8) % palette.length],
    glowStrength: 4 + (i % 12) * 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10 + (i % 8) * 2,
    paddingX: 10 + (i % 6) * 2,
    paddingY: 6 + (i % 5) * 2,
    placement: placements[i % placements.length],
    captionMode: modes[i % modes.length],
    animationHint: animations[i % animations.length],
    decoration: decorationFor(category, i),
    ...categoryOverrides(category, i),
  };
});
