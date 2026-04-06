import type { CaptionCandidate, CaptionCandidateType, CaptionMode, CaptionSegment } from "@/lib/caption/types";
import type { TranscriptionSegment } from "@/lib/types";

const impactfulWords = new Set([
  "stop",
  "now",
  "never",
  "this",
  "fast",
  "warning",
  "watch",
  "must",
  "truth",
  "secret",
  "mistake",
  "urgent",
  "boost",
  "double",
  "zero",
  "money",
  "free",
  "win",
  "viral",
  "today",
]);

const toneTemplates: Record<CaptionCandidateType, string[]> = {
  punchy: [
    "{input}. You need this now.",
    "Stop scrolling. {input} in one move.",
    "{input}. Fast. Clear. Viral.",
  ],
  normal: [
    "{input}",
    "Quick creator note: {input}.",
    "If you need consistency, start with this: {input}.",
  ],
  dramatic: [
    "Everyone ignores this, but {input} changes everything.",
    "This is the shift creators miss: {input}.",
    "One decision can flip your momentum: {input}.",
  ],
  social: [
    "If you post online, this helps: {input}.",
    "Creator workflow upgrade: {input}.",
    "Built for reels and shorts: {input}.",
  ],
  subtitle: [
    "{input}",
    "Today we are covering {input}.",
    "Let me explain {input} in simple steps.",
  ],
  hook: [
    "What if {input} is your unfair advantage?",
    "Most creators miss this: {input}.",
    "Want faster growth? Start with {input}.",
  ],
  cta: [
    "Save this and test {input} today.",
    "Comment your niche and use {input} next.",
    "Follow for more systems like {input}.",
  ],
};

const typeOrder: CaptionCandidateType[] = ["punchy", "normal", "dramatic", "social", "subtitle", "hook", "cta"];

export function generateCaptionCandidates(sourceInput: string) {
  const normalized = normalizeInput(sourceInput);
  const tokens = splitTokens(normalized);
  const keyPhrases = buildKeyPhrases(tokens);
  return typeOrder.map((type, index) => {
    const templates = toneTemplates[type];
    const template = templates[0] ?? "{input}";
    const phrase = keyPhrases[index % Math.max(1, keyPhrases.length)] ?? normalized;
    const text = template.replace("{input}", phrase);

    return {
      id: `${type}-001`,
      type,
      text,
      toneLabel: type.toUpperCase(),
    };
  });
}

export function detectPunchWords(input: string) {
  const words = splitTokens(input.toLowerCase());
  return words.filter((word) => shouldPunchWord(word));
}

export function buildCaptionSegments({
  text,
  mode,
  totalMs,
}: {
  text: string;
  mode: CaptionMode;
  totalMs: number;
}) {
  const sentences = splitSentences(text);
  const sentenceDuration = Math.max(1200, Math.floor(totalMs / Math.max(1, sentences.length)));

  const baseSegments: CaptionSegment[] = sentences.map((sentence, index) => {
    const startMs = index * sentenceDuration;
    const endMs = Math.min(totalMs, startMs + sentenceDuration);

    return {
      id: `seg-${index + 1}`,
      text: sentence,
      startMs,
      endMs,
      isPunch: false,
      x: 0.5,
      y: mode === "normal" ? 0.86 : 0.78,
      width: 0.82,
      align: "center",
    };
  });

  if (mode === "normal") {
    return baseSegments;
  }

  const punchWords = detectPunchWords(text).slice(0, 8);
  if (punchWords.length === 0) {
    return baseSegments;
  }

  const punchSegments: CaptionSegment[] = punchWords.map((word, index) => ({
    id: `punch-${index + 1}`,
    text: word.toUpperCase(),
    startMs: index * 700,
    endMs: Math.min(totalMs, index * 700 + 1000),
    isPunch: true,
    x: 0.5,
    y: 0.48,
    width: 0.54,
    align: "center",
  }));

  if (mode === "punchy") {
    return [...punchSegments, ...baseSegments.map((segment) => ({ ...segment, y: 0.88 }))];
  }

  // Hybrid mode
  return [...baseSegments, ...punchSegments];
}

export function buildCaptionSegmentsFromTranscript({
  transcriptSegments,
  mode,
}: {
  transcriptSegments: TranscriptionSegment[];
  mode: CaptionMode;
}) {
  return transcriptSegments.map((segment, index) => ({
    id: segment.id || `voice-${index + 1}`,
    text: segment.text,
    startMs: Math.max(0, segment.startMs),
    endMs: Math.max(segment.startMs + 240, segment.endMs),
    isPunch: mode !== "normal" && shouldPunchWord(segment.text.split(/\s+/)[0]?.toLowerCase() ?? ""),
    x: 0.5,
    y: mode === "normal" ? 0.86 : 0.8,
    width: 0.82,
    align: "center" as const,
  }));
}

function shouldPunchWord(word: string) {
  if (!word) {
    return false;
  }

  if (impactfulWords.has(word)) {
    return true;
  }

  if (/^\d+$/.test(word)) {
    return true;
  }

  return word.length <= 4 && /[A-Za-z]/.test(word);
}

function splitSentences(input: string) {
  return input
    .split(/[.!?]\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function splitTokens(input: string) {
  return input
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildKeyPhrases(tokens: string[]) {
  if (tokens.length <= 10) {
    return [tokens.join(" ") || "one powerful creator idea"];
  }

  const phrases: string[] = [];
  for (let i = 0; i < tokens.length; i += 4) {
    phrases.push(tokens.slice(i, i + 8).join(" "));
  }

  return phrases.filter(Boolean);
}

function normalizeInput(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : "one powerful creator idea";
}
