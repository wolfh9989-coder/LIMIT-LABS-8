import type { CaptionCategory, CaptionDecoration, CaptionMode, CaptionPreset, CaptionThemePalette, PlacementMode } from "@/lib/caption/types";

const defaultFallbackFonts = ["Inter", "Segoe UI", "system-ui", "sans-serif"];

type CategoryPlan = {
  category: CaptionCategory;
  count: number;
  mode: CaptionMode;
  placements: PlacementMode[];
  fontFamilies: string[];
  baseColors: string[];
  accentColors: string[];
};

const retroFonts = ["Bebas Neue", "Anton", "Oswald", "Unica One", "Righteous", "Russo One", "Audiowide"];
const comicFonts = ["Bangers", "Luckiest Guy", "Comic Neue", "Fredoka", "Baloo 2", "Bubblegum Sans", "Chewy"];
const futuristicFonts = ["Orbitron", "Audiowide", "Exo 2", "Rajdhani", "Saira", "Michroma", "Syncopate", "Oxanium"];
const gamerFonts = ["Press Start 2P", "VT323", "Silkscreen", "Share Tech Mono", "Chakra Petch", "Teko", "Orbitron"];
const loveFonts = ["Pacifico", "Great Vibes", "Caveat", "Playfair Display", "Satisfy", "Dancing Script", "Parisienne"];
const prettyFonts = ["Quicksand", "Nunito", "Poppins", "Manrope", "DM Sans", "Comfortaa", "Mulish"];
const darkFonts = ["Cinzel", "Black Ops One", "Archivo Black", "Bebas Neue", "Oswald", "Barlow Condensed", "Teko"];
const electricFonts = ["Orbitron", "Major Mono Display", "Audiowide", "Exo 2", "Space Grotesk", "Saira", "Oxanium"];
const cinematicFonts = ["Playfair Display", "DM Serif Display", "Cinzel", "Merriweather", "Cormorant Garamond", "Libre Baskerville", "Lora"];
const luxuryFonts = ["DM Serif Display", "Playfair Display", "Cinzel", "Great Vibes", "Cormorant Garamond", "Prata", "Marcellus"];
const streetFonts = ["Permanent Marker", "Rubik Mono One", "Kanit", "Bebas Neue", "Anton", "Archivo Black", "Black Ops One"];
const horrorFonts = ["Creepster", "Nosifer", "Butcherman", "Black Ops One", "Cinzel", "Special Elite", "Bebas Neue"];
const neonFonts = ["Orbitron", "Major Mono Display", "Audiowide", "Monoton", "Megrim", "Oxanium", "Rajdhani"];
const minimalFonts = ["Inter", "Montserrat", "Poppins", "Manrope", "DM Sans", "Work Sans", "Source Sans 3"];
const bubbleFonts = ["Fredoka", "Comic Neue", "Baloo 2", "Bubblegum Sans", "Chewy", "Sniglet", "Comfortaa"];
const handwrittenFonts = ["Caveat", "Patrick Hand", "Shadows Into Light", "Architects Daughter", "Kalam", "Handlee", "Indie Flower"];
const boldFonts = ["Anton", "Archivo Black", "Bebas Neue", "Oswald"];
const softFonts = ["Quicksand", "Nunito", "DM Sans", "Manrope"];
const glitchFonts = ["Major Mono Display", "Share Tech Mono", "VT323", "Orbitron", "Oxanium"];
const metallicFonts = ["Cinzel", "Cormorant Garamond", "Prata", "Marcellus", "DM Serif Display"];

export const CATEGORY_FONT_SUGGESTIONS: Record<CaptionCategory, string[]> = {
  retro: retroFonts,
  comic: comicFonts,
  futuristic: futuristicFonts,
  gamer: gamerFonts,
  love: loveFonts,
  pretty: prettyFonts,
  dark: darkFonts,
  electric: electricFonts,
  cinematic: cinematicFonts,
  luxury: luxuryFonts,
  street: streetFonts,
  horror: horrorFonts,
  neon: neonFonts,
  minimal: minimalFonts,
  bubble: bubbleFonts,
  handwritten: handwrittenFonts,
  bold: boldFonts,
  soft: softFonts,
  glitch: glitchFonts,
  metallic: metallicFonts,
};

export const GOOGLE_FONT_LIBRARY = Array.from(
  new Set([
    ...retroFonts,
    ...comicFonts,
    ...futuristicFonts,
    ...gamerFonts,
    ...loveFonts,
    ...prettyFonts,
    ...darkFonts,
    ...electricFonts,
    ...cinematicFonts,
    ...luxuryFonts,
    ...streetFonts,
    ...horrorFonts,
    ...neonFonts,
    ...minimalFonts,
    ...bubbleFonts,
    ...handwrittenFonts,
    ...boldFonts,
    ...softFonts,
    ...glitchFonts,
    ...metallicFonts,
    "Tangerine",
    "Abril Fatface",
    "Alfa Slab One",
    "Bungee",
    "Bungee Shade",
    "Cabin Condensed",
    "Fjalla One",
    "IBM Plex Sans",
    "IBM Plex Mono",
    "Libre Franklin",
    "Noto Sans",
    "PT Sans",
    "Roboto Condensed",
    "Titillium Web",
    "Ubuntu",
  ]),
);

const categoryPlan: CategoryPlan[] = [
  { category: "retro", count: 12, mode: "normal", placements: ["lowerThird", "bottom"], fontFamilies: retroFonts, baseColors: ["#FFEAA7", "#FDCB6E", "#FAB1A0"], accentColors: ["#E17055", "#D35400", "#F39C12"] },
  { category: "comic", count: 12, mode: "punchy", placements: ["center", "split", "stacked"], fontFamilies: comicFonts, baseColors: ["#F9E79F", "#F5B041", "#AED6F1"], accentColors: ["#E74C3C", "#8E44AD", "#2471A3"] },
  { category: "futuristic", count: 16, mode: "hybrid", placements: ["center", "topBottom", "lowerThird"], fontFamilies: futuristicFonts, baseColors: ["#00E5FF", "#7DF9FF", "#8AB4F8"], accentColors: ["#7C4DFF", "#00B8D4", "#651FFF"] },
  { category: "gamer", count: 14, mode: "punchy", placements: ["center", "split", "right"], fontFamilies: gamerFonts, baseColors: ["#39FF14", "#00FFC6", "#A3E635"], accentColors: ["#FF00A8", "#7C3AED", "#00E5FF"] },
  { category: "love", count: 10, mode: "normal", placements: ["bottom", "lowerThird"], fontFamilies: loveFonts, baseColors: ["#FFD1DC", "#FFC0CB", "#FFE4E1"], accentColors: ["#FF4D6D", "#D63384", "#F06292"] },
  { category: "pretty", count: 10, mode: "normal", placements: ["bottom", "left"], fontFamilies: prettyFonts, baseColors: ["#F8E8FF", "#E0BBE4", "#D6E5FA"], accentColors: ["#9B5DE5", "#F15BB5", "#00BBF9"] },
  { category: "dark", count: 14, mode: "hybrid", placements: ["lowerThird", "left", "right"], fontFamilies: darkFonts, baseColors: ["#F5F5F5", "#D9D9D9", "#BFBFBF"], accentColors: ["#111827", "#374151", "#4B5563"] },
  { category: "electric", count: 14, mode: "punchy", placements: ["center", "stacked", "split"], fontFamilies: electricFonts, baseColors: ["#7DF9FF", "#00E5FF", "#E0FBFC"], accentColors: ["#FF00FF", "#00FFCC", "#3A86FF"] },
  { category: "cinematic", count: 12, mode: "hybrid", placements: ["topBottom", "lowerThird", "center"], fontFamilies: cinematicFonts, baseColors: ["#F3E9DC", "#E8D8C4", "#FFF8E7"], accentColors: ["#3C2F2F", "#6B4F4F", "#2F4858"] },
  { category: "luxury", count: 10, mode: "normal", placements: ["lowerThird", "topBottom"], fontFamilies: luxuryFonts, baseColors: ["#F5E6C8", "#D4AF37", "#FFF1CC"], accentColors: ["#8C6A00", "#6C4F00", "#3D2C00"] },
  { category: "street", count: 12, mode: "punchy", placements: ["left", "right", "split"], fontFamilies: streetFonts, baseColors: ["#FFFFFF", "#F1F5F9", "#E2E8F0"], accentColors: ["#1E293B", "#EF4444", "#334155"] },
  { category: "horror", count: 10, mode: "hybrid", placements: ["center", "topBottom", "lowerThird"], fontFamilies: horrorFonts, baseColors: ["#F8F8F8", "#E5E7EB", "#F3F4F6"], accentColors: ["#7F1D1D", "#991B1B", "#111827"] },
  { category: "neon", count: 14, mode: "punchy", placements: ["center", "stacked", "split"], fontFamilies: neonFonts, baseColors: ["#22D3EE", "#A78BFA", "#67E8F9"], accentColors: ["#EC4899", "#7C3AED", "#06B6D4"] },
  { category: "minimal", count: 12, mode: "normal", placements: ["bottom", "lowerThird", "left"], fontFamilies: minimalFonts, baseColors: ["#FFFFFF", "#F9FAFB", "#F3F4F6"], accentColors: ["#111827", "#1F2937", "#374151"] },
  { category: "bubble", count: 8, mode: "normal", placements: ["center", "bottom"], fontFamilies: bubbleFonts, baseColors: ["#FDE2FF", "#FBCFE8", "#DDD6FE"], accentColors: ["#C026D3", "#DB2777", "#7C3AED"] },
  { category: "handwritten", count: 8, mode: "normal", placements: ["lowerThird", "left"], fontFamilies: handwrittenFonts, baseColors: ["#FFF7ED", "#FEF3C7", "#FDE68A"], accentColors: ["#92400E", "#78350F", "#B45309"] },
  { category: "bold", count: 1, mode: "punchy", placements: ["center"], fontFamilies: boldFonts, baseColors: ["#FFFFFF"], accentColors: ["#111827"] },
  { category: "soft", count: 1, mode: "normal", placements: ["bottom"], fontFamilies: softFonts, baseColors: ["#FDF2F8"], accentColors: ["#BE185D"] },
];

const placementCycle: PlacementMode[] = ["bottom", "lowerThird", "center", "split", "topBottom", "stacked", "left", "right"];
const animationCycle: CaptionPreset["animationHint"][] = ["pop", "glitch", "slideUp", "pulse", "typeOn", "shake"];

export const captionThemePalettes: CaptionThemePalette[] = [
  { id: "neon-cyan", name: "Neon Cyan", text: "#D5FFFF", stroke: "#00E5FF", glow: "#22D3EE", background: "#022B34CC", accent: "#22D3EE" },
  { id: "electric-violet", name: "Electric Violet", text: "#F4E8FF", stroke: "#8B5CF6", glow: "#A78BFA", background: "#2E1065CC", accent: "#A78BFA" },
  { id: "retro-sunset", name: "Retro Sunset", text: "#FFF7ED", stroke: "#F97316", glow: "#FB7185", background: "#7C2D12CC", accent: "#F59E0B" },
  { id: "comic-pop", name: "Comic Pop", text: "#FFFBEB", stroke: "#DC2626", glow: "#FACC15", background: "#1D4ED8CC", accent: "#FACC15" },
  { id: "gamer-rgb", name: "Gamer RGB", text: "#ECFEFF", stroke: "#00FFC6", glow: "#FF00A8", background: "#111827CC", accent: "#00FFC6" },
  { id: "soft-love-pink", name: "Soft Love Pink", text: "#FFF1F2", stroke: "#FB7185", glow: "#FDA4AF", background: "#881337CC", accent: "#F472B6" },
  { id: "chrome-dark", name: "Chrome Dark", text: "#E5E7EB", stroke: "#6B7280", glow: "#9CA3AF", background: "#111827CC", accent: "#94A3B8" },
  { id: "horror-red", name: "Horror Red", text: "#FEE2E2", stroke: "#B91C1C", glow: "#EF4444", background: "#1F2937CC", accent: "#DC2626" },
  { id: "luxury-gold", name: "Luxury Gold", text: "#FEF3C7", stroke: "#D4AF37", glow: "#FBBF24", background: "#3D2C00CC", accent: "#D4AF37" },
  { id: "ice-blue", name: "Ice Blue", text: "#E0F2FE", stroke: "#38BDF8", glow: "#7DD3FC", background: "#0C4A6ECC", accent: "#38BDF8" },
];

export const captionPresets: CaptionPreset[] = buildCaptionPresets();

function buildCaptionPresets() {
  const presets: CaptionPreset[] = [];

  for (const plan of categoryPlan) {
    for (let index = 0; index < plan.count; index += 1) {
      const fontFamily = plan.fontFamilies[index % plan.fontFamilies.length];
      const textColor = plan.baseColors[index % plan.baseColors.length];
      const accent = plan.accentColors[index % plan.accentColors.length];
      const placement = plan.placements[index % plan.placements.length] ?? placementCycle[index % placementCycle.length];

      presets.push({
        id: `${plan.category}-${String(index + 1).padStart(3, "0")}`,
        name: `${titleCase(plan.category)} ${index + 1}`,
        category: plan.category,
        fontFamily,
        fallbackFonts: defaultFallbackFonts,
        fontWeight: 500 + ((index % 4) * 100),
        textTransform: index % 5 === 0 ? "uppercase" : index % 7 === 0 ? "capitalize" : "none",
        fontSize: 22 + (index % 5) * 4,
        lineHeight: 1.1 + (index % 4) * 0.08,
        letterSpacing: (index % 3) * 0.6,
        textColor,
        strokeColor: accent,
        strokeWidth: 1 + (index % 4),
        shadowColor: `${accent}99`,
        shadowBlur: 10 + (index % 6) * 2,
        glowColor: accent,
        glowStrength: 12 + (index % 5) * 8,
        backgroundColor: `${accent}22`,
        borderRadius: 8 + (index % 6) * 2,
        paddingX: 10 + (index % 4) * 2,
        paddingY: 6 + (index % 3) * 2,
        placement,
        captionMode: plan.mode,
        animationHint: animationCycle[index % animationCycle.length],
        decoration: decorationForCategory(plan.category, index, accent, textColor),
      });
    }
  }

  // Ensures exactly 200 presets while preserving category distribution intent.
  while (presets.length < 200) {
    const extra = presets[presets.length % Math.max(1, presets.length)];
    presets.push({
      ...extra,
      id: `bonus-${String(presets.length + 1).padStart(3, "0")}`,
      name: `Bonus ${presets.length + 1}`,
      category: presets.length % 2 === 0 ? "glitch" : "metallic",
      animationHint: presets.length % 2 === 0 ? "glitch" : "pulse",
      decoration: decorationForCategory(
        presets.length % 2 === 0 ? "glitch" : "metallic",
        presets.length,
        extra.strokeColor ?? "#22D3EE",
        extra.textColor,
      ),
    });
  }

  return presets.slice(0, 200);
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function decorationForCategory(
  category: CaptionCategory,
  index: number,
  accentA: string,
  accentB: string,
): CaptionDecoration {
  switch (category) {
    case "retro":
      return {
        type: "retroDisco",
        animated: true,
        motion: "pulse",
        intensity: 0.84,
        opacity: 0.78,
        accentA,
        accentB,
        accentC: "#22D3EE",
      };
    case "comic":
      {
        const comicVariants: CaptionDecoration["type"][] = [
          "comicBubble",
          "comicThought",
          "comicPunch",
          "comicShatter",
          "comicZap",
        ];
      return {
        type: comicVariants[index % comicVariants.length],
        animated: true,
        motion: "pop",
        intensity: 1,
        opacity: 0.95,
        accentA,
        accentB,
      };
      }
    case "futuristic":
      return {
        type: index % 2 === 0 ? "metallicPanel" : "particles",
        animated: true,
        motion: "drift",
        intensity: 0.82,
        opacity: 0.86,
        accentA,
        accentB,
        accentC: "#7DD3FC",
      };
    case "gamer":
      return {
        type: index % 2 === 0 ? "pixelFrame" : "glitchBars",
        animated: true,
        motion: "flicker",
        intensity: 0.9,
        opacity: 0.88,
        accentA,
        accentB,
      };
    case "love":
      return {
        type: index % 2 === 0 ? "hearts" : "stars",
        animated: true,
        motion: "float",
        intensity: 0.76,
        opacity: 0.86,
        accentA: "#F472B6",
        accentB: "#FDA4AF",
      };
    case "pretty":
      return {
        type: "stars",
        animated: true,
        motion: "drift",
        intensity: 0.62,
        opacity: 0.7,
        accentA,
        accentB,
      };
    case "dark":
      return {
        type: "smoke",
        animated: true,
        motion: "drift",
        intensity: 0.7,
        opacity: 0.74,
        accentA: "#111827",
        accentB: "#7F1D1D",
      };
    case "electric":
      return {
        type: "lightning",
        animated: true,
        motion: "spark",
        intensity: 0.92,
        opacity: 0.9,
        accentA,
        accentB,
      };
    case "cinematic":
      return {
        type: "chromeGlow",
        animated: true,
        motion: "pulse",
        intensity: 0.54,
        opacity: 0.5,
        accentA,
        accentB,
      };
    case "luxury":
      return {
        type: "luxuryShimmer",
        animated: true,
        motion: "drift",
        intensity: 0.68,
        opacity: 0.66,
        accentA,
        accentB,
      };
    case "street":
      return {
        type: "graffitiSpray",
        animated: true,
        motion: "flicker",
        intensity: 0.86,
        opacity: 0.82,
        accentA,
        accentB,
        accentC: "#22D3EE",
      };
    case "horror":
      return {
        type: "horrorDrip",
        animated: true,
        motion: "shake",
        intensity: 0.88,
        opacity: 0.78,
        accentA: "#7F1D1D",
        accentB,
      };
    case "neon":
      return {
        type: "glitchBars",
        animated: true,
        motion: "flicker",
        intensity: 0.9,
        opacity: 0.86,
        accentA,
        accentB,
      };
    case "minimal":
      return {
        type: "none",
        animated: false,
        motion: "none",
        intensity: 0,
        opacity: 0,
      };
    case "bubble":
      return {
        type: "bubblePop",
        animated: true,
        motion: "float",
        intensity: 0.8,
        opacity: 0.82,
        accentA,
        accentB,
      };
    case "handwritten":
      return {
        type: "handDrawnStroke",
        animated: true,
        motion: "spark",
        intensity: 0.55,
        opacity: 0.65,
        accentA,
        accentB,
      };
    case "bold":
      return {
        type: "comicPunch",
        animated: true,
        motion: "pop",
        intensity: 1,
        opacity: 0.85,
        accentA,
        accentB,
      };
    case "soft":
      return {
        type: "stars",
        animated: true,
        motion: "float",
        intensity: 0.5,
        opacity: 0.58,
        accentA,
        accentB,
      };
    case "glitch":
      return {
        type: "glitchBars",
        animated: true,
        motion: "flicker",
        intensity: 0.92,
        opacity: 0.9,
        accentA,
        accentB,
      };
    case "metallic":
      return {
        type: "metallicPanel",
        animated: true,
        motion: "pulse",
        intensity: 0.72,
        opacity: 0.8,
        accentA,
        accentB,
      };
    default:
      return {
        type: "none",
        animated: false,
        motion: "none",
        intensity: 0,
        opacity: 0,
      };
  }
}
