import { CaptionMode, CaptionTemplate, StyleCategory } from "./types";

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

const modes: CaptionMode[] = ["normal", "punchy", "hybrid"];

const tones = [
  "bold",
  "playful",
  "soft",
  "aggressive",
  "romantic",
  "dramatic",
  "viral",
  "clean",
  "luxury",
  "edgy",
  "electric",
  "cute",
  "dark",
  "heroic",
  "confident",
  "snappy",
];

const hooks = [
  "Stop scrolling",
  "Watch this",
  "Nobody talks about this",
  "This changes everything",
  "You need this",
  "That part matters",
  "This is the move",
  "Here is the truth",
  "Don't miss this",
  "This hits different",
  "Not the way you think",
  "This is your sign",
  "Now look closer",
  "This is the upgrade",
  "Locked in",
  "Pure signal",
  "Real talk",
  "Big energy",
  "Stay with me",
  "Watch till the end",
];

const messages = [
  "one idea can become your whole week of content",
  "your captions should sound like you, not a robot",
  "clean design always wins attention",
  "strong visuals turn average posts into saved posts",
  "a better hook changes the whole video",
  "your content deserves stronger pacing",
  "this is how creators stop overthinking",
  "simple edits can feel premium fast",
  "punchy text makes the message land harder",
  "the right caption can carry the entire scene",
  "visual rhythm keeps people watching",
  "good typography changes the mood instantly",
  "strong overlays make short-form content feel bigger",
  "smart placement makes words hit on mobile",
  "you do not need more content, just better formatting",
  "this is where your brand voice becomes visible",
  "the screen should feel alive, not flat",
  "the right style can make basic footage feel cinematic",
  "captions are part of the design, not an afterthought",
  "great editing starts with great text",
];

const ctas = [
  "save this",
  "try this",
  "use this next",
  "build on this",
  "make it yours",
  "post smarter",
  "ship faster",
  "keep going",
  "turn it up",
  "run this back",
];

const baseTemplates = [
  "{hook} {message}",
  "{hook} - {message}",
  "{hook}. {message}. {cta}",
  "{message} {cta}",
  "{hook} {message} {cta}",
  "{hook}\n{message}",
  "{hook}\n{message}\n{cta}",
  "{hook} // {message}",
  "{hook}: {message}",
  "{message} - {cta}",
];

const punchWordPools = [
  ["STOP", "WATCH", "NOW"],
  ["THIS", "HITS", "DIFFERENT"],
  ["BIG", "MOVE", "ENERGY"],
  ["REAL", "TALK", "FAST"],
  ["LOCKED", "IN", "GO"],
  ["WARNING", "LOOK", "HERE"],
  ["LOVE", "THAT", "GLOW"],
  ["DARK", "MODE", "ACTIVE"],
  ["BOOST", "YOUR", "HOOK"],
  ["PURE", "SIGNAL", "ONLY"],
];

export const CAPTION_TEMPLATES: CaptionTemplate[] = Array.from({ length: 200 }, (_, i) => {
  const template = baseTemplates[i % baseTemplates.length]
    .replace("{hook}", hooks[i % hooks.length])
    .replace("{message}", messages[(i * 3) % messages.length])
    .replace("{cta}", ctas[(i * 5) % ctas.length]);

  return {
    id: `caption-template-${String(i + 1).padStart(3, "0")}`,
    name: `${categories[i % categories.length]} Caption ${String(i + 1).padStart(3, "0")}`,
    category: categories[i % categories.length],
    mode: modes[i % modes.length],
    tone: tones[i % tones.length],
    template,
    punchWords: punchWordPools[i % punchWordPools.length],
  };
});
