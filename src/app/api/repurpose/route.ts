import { NextResponse } from "next/server";
import { canUseOllamaHost } from "@/lib/deployment";
import { resolveRequestIdentity } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import type { Clip, InputType, MediaAnalysisSummary } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  userId?: string;
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  clipLimit?: number;
  mediaAnalysis?: MediaAnalysisSummary | null;
};

type GeneratedPack = {
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  scripts: string[];
  hooks: string[];
  captions: string[];
  tweets: string[];
  thread: string[];
  overlays: string[];
  clips: Clip[];
  blogs: string[];
  fonts: string[];
  analysis?: MediaAnalysisSummary | null;
};

type CurationProfile = {
  platformDirective: string;
  toneDirective: string;
  inputDirective: string;
  hookStrategy: string;
  editingStrategy: string;
};

type ContentIntent = "sales" | "story" | "education" | "general";

const stylePresets = ["Neon", "Minimal", "Luxury", "Glitch", "Cinematic", "Street"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const identity = await resolveRequestIdentity(request, body.userId?.trim() ?? "");
    const userId = identity.userId;
    const input = body.input?.trim();
    const inputType = body.inputType ?? "idea";
    const tone = body.tone ?? "Viral";
    const platform = body.platform ?? "TikTok";
    const mediaAnalysis = body.mediaAnalysis ?? null;

    const effectiveInput = input || mediaAnalysis?.exactScript?.trim() || "";

    if (!effectiveInput) {
      return NextResponse.json({ error: "Input is required." }, { status: 400 });
    }

    const entitlement = await getEntitlement(userId);
    const requestedClipLimit = clampClipLimit(body.clipLimit ?? 3);
    const clipLimit = entitlement.plan === "pro" ? requestedClipLimit : Math.min(requestedClipLimit, 3);
    const openaiKey = process.env.OPENAI_API_KEY;

    const curationProfile = await buildCurationProfile({
      input: effectiveInput,
      inputType,
      tone,
      platform,
      mediaAnalysis,
    });
    const primaryIntent = inferPrimaryIntent(effectiveInput, mediaAnalysis);

    if (openaiKey) {
      const aiPack = await generateWithOpenAI({
        input: effectiveInput,
        inputType,
        tone,
        platform,
        clipLimit,
        mediaAnalysis,
        curationProfile,
        primaryIntent,
        apiKey: openaiKey,
      });

      if (aiPack) {
        return NextResponse.json(aiPack);
      }
    }

    const fallback = buildFallbackPack({
      input: effectiveInput,
      inputType,
      tone,
      platform,
      clipLimit,
      mediaAnalysis,
      curationProfile,
      primaryIntent,
    });

    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

async function generateWithOpenAI({
  input,
  inputType,
  tone,
  platform,
  clipLimit,
  mediaAnalysis,
  curationProfile,
  primaryIntent,
  apiKey,
}: {
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  clipLimit: number;
  mediaAnalysis: MediaAnalysisSummary | null;
  curationProfile: CurationProfile;
  primaryIntent: ContentIntent;
  apiKey: string;
}): Promise<GeneratedPack | null> {
  const transcriptContext = mediaAnalysis
    ? [
        "Media analysis context is available. Keep outputs tightly grounded in this transcript and scene plan.",
        `Duration: ${mediaAnalysis.durationSeconds}s`,
        `Music detected: ${mediaAnalysis.hasMusic ? "yes" : "no"} (${mediaAnalysis.musicNote})`,
        "Suggested clips:",
        ...mediaAnalysis.suggestedClips.map((clip) => `${clip.id} ${clip.time} ${clip.title} :: ${clip.text}`),
      ].join("\n")
    : "";

  const prompt = [
    "You are a viral content strategist.",
    "You are NOT a chatbot. You are an autonomous background curation engine.",
    "Transform the input into a mobile-first content pack for LIMIT LABS 8.",
    "Return strict JSON with these keys:",
    "hooks: string[5]",
    "thread: string[5]",
    "tweets: string[8]",
    `captions: string[120]`,
    `scripts: string[3]`,
    `blogs: string[3]`,
    `overlays: string[${clipLimit}]`,
    `clips: {id,time,title,text,overlay}[${clipLimit}]`,
    "fonts: string[6] using Neon, Minimal, Luxury, Glitch, Cinematic, Street",
    "All content must be platform-optimized, modern, and concise.",
    "Tweets/Descriptions must reflect exact meaning from spoken audio/transcript context, not generic copy.",
    "Tweet/Description formatting rules:",
    "- TikTok/Instagram Reels/YouTube Shorts: write as strong video descriptions with hook + value + CTA.",
    "- X: write concise high-impact posts with quote-ready phrasing.",
    "- If intent is sales: include offer clarity, benefit, and direct action.",
    "- If intent is storytelling: include emotional setup, turning point, and payoff.",
    "- If intent is education: include clear lesson and practical takeaway.",
    "Apply these required curation directives:",
    `Platform directive: ${curationProfile.platformDirective}`,
    `Tone directive: ${curationProfile.toneDirective}`,
    `Input directive: ${curationProfile.inputDirective}`,
    `Hook strategy: ${curationProfile.hookStrategy}`,
    `Editing strategy: ${curationProfile.editingStrategy}`,
    `Primary intent: ${primaryIntent}`,
    `Platform: ${platform}`,
    `Tone: ${tone}`,
    `Input type: ${inputType}`,
    "Content:",
    input,
    transcriptContext,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: prompt,
      max_output_tokens: 3200,
      text: {
        format: {
          type: "json_schema",
          name: "repurpose_pack",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              hooks: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: { type: "string" },
              },
              thread: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: { type: "string" },
              },
              tweets: {
                type: "array",
                minItems: 8,
                maxItems: 8,
                items: { type: "string" },
              },
              captions: {
                type: "array",
                minItems: 120,
                maxItems: 120,
                items: { type: "string" },
              },
              scripts: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: { type: "string" },
              },
              blogs: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: { type: "string" },
              },
              overlays: {
                type: "array",
                minItems: clipLimit,
                maxItems: clipLimit,
                items: { type: "string" },
              },
              clips: {
                type: "array",
                minItems: clipLimit,
                maxItems: clipLimit,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    time: { type: "string" },
                    title: { type: "string" },
                    text: { type: "string" },
                    overlay: { type: "string" },
                  },
                  required: ["id", "time", "title", "text", "overlay"],
                },
              },
              fonts: {
                type: "array",
                minItems: 6,
                maxItems: 6,
                items: { type: "string" },
              },
            },
            required: [
              "hooks",
              "thread",
              "tweets",
              "captions",
              "scripts",
              "blogs",
              "overlays",
              "clips",
              "fonts",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    output_text?: string;
  };

  if (!data.output_text) {
    return null;
  }

  try {
    const parsed = JSON.parse(data.output_text) as Omit<GeneratedPack, "input" | "inputType" | "tone" | "platform">;

    return {
      input,
      inputType,
      tone,
      platform,
      scripts: parsed.scripts,
      hooks: parsed.hooks,
      captions: parsed.captions,
      tweets: parsed.tweets,
      thread: parsed.thread,
      overlays: parsed.overlays,
      clips: parsed.clips,
      blogs: parsed.blogs,
      fonts: parsed.fonts,
      analysis: mediaAnalysis,
    };
  } catch {
    return null;
  }
}

function buildFallbackPack({
  input,
  inputType,
  tone,
  platform,
  clipLimit,
  mediaAnalysis,
  curationProfile,
  primaryIntent,
}: {
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  clipLimit: number;
  mediaAnalysis: MediaAnalysisSummary | null;
  curationProfile: CurationProfile;
  primaryIntent: ContentIntent;
}): GeneratedPack {
  const normalized = normalizeInput(input);
  const analysisClips = mediaAnalysis?.suggestedClips ?? [];
  const effectiveClips = analysisClips.length > 0 ? analysisClips.slice(0, clipLimit) : createClips(clipLimit, [], normalized);

  const hooks = [
    effectiveClips[0]?.text || `Most people waste one ${inputType}. Here is how to turn it into seven days of content.`,
    effectiveClips[1]?.text || `If your ${platform} growth feels random, this ${tone.toLowerCase()} framework fixes it fast.`,
    effectiveClips[2]?.text || "Stop posting from scratch. Start multiplying one idea across every channel.",
    "Creators who win are not louder, they are more systematic.",
    "Use this 3-scene method to turn notes into high-retention short videos.",
  ];

    const scripts = [
      `Scene 1 Hook: ${hooks[0]} Scene 2 Value: ${asText(curationProfile.editingStrategy)} Scene 3 CTA: Ask viewers to comment their niche for a custom template.`,
      `Scene 2 Hook: ${hooks[1]} Scene 2 Value: ${asText(curationProfile.platformDirective)} Scene 3 CTA: Save this workflow for your next post batch.`,
      `Scene 3 Hook: ${hooks[2]} Scene 2 Value: ${asText(curationProfile.toneDirective)} Scene 3 CTA: Follow for a daily repurposing blueprint.`,
  ];

  const clips = effectiveClips.length > 0 ? effectiveClips : createClips(clipLimit, hooks, normalized);
  const overlays = clips.map((clip) => clip.overlay);

  const transcriptAnchor = (mediaAnalysis?.exactScript || input).split(/[.!?]/).map((part) => part.trim()).filter(Boolean)[0] ?? "";
  const intentLine =
    primaryIntent === "sales"
      ? "Clear offer. Clear value. Clear CTA."
      : primaryIntent === "story"
        ? "Strong setup, emotional turn, satisfying payoff."
        : primaryIntent === "education"
          ? "Teach one lesson with one practical next step."
          : "Lead with clarity, then give a focused action.";

  const tweets = [
    `${platform} description: ${intentLine}`,
    transcriptAnchor ? `From the audio: \"${transcriptAnchor}\"` : `Built from your ${inputType} source into a high-retention short-form sequence.`,
    primaryIntent === "sales"
      ? "If this solves your problem, save this and grab the offer before it closes."
      : primaryIntent === "story"
        ? "If this part hit you, stay to the end for the full arc."
        : primaryIntent === "education"
          ? "Apply this framework today and comment your result."
          : "Use this structure on your next post and track retention.",
    `Hook-first pacing tuned for ${platform}.`,
    "Audio-led scripting keeps the message authentic to what was actually said.",
    "Scene-by-scene flow: hook, value, and CTA without filler.",
    "Short overlay copy keeps attention on story and delivery.",
    "One source in, full publish-ready pack out.",
  ];

  const thread = [
    "Most creators burn out because every post starts from zero.",
    `Step 1: Capture one strong idea from your ${inputType}.`,
    "Step 2: Split it into hook, value, and call-to-action.",
    "Step 3: Convert each step into clips, captions, tweets, and overlays.",
    "Result: one source becomes a full week of focused content.",
  ];

  const blogs = [
    `How to turn one ${inputType} into a weekly publishing system optimized for ${platform}.`,
    `The mobile-first creator workflow for ${tone.toLowerCase()} scripts, captions, and short clips.`,
    "From input to output pack: a practical repurposing playbook for growth.",
  ];

  return {
    input,
    inputType,
    tone,
    platform,
    scripts,
    hooks,
    captions: buildCaptions(normalized),
    tweets,
    thread,
    overlays,
    clips,
    blogs,
    fonts: stylePresets,
    analysis: mediaAnalysis,
  };
}

function createClips(clipLimit: number, hooks: string[], normalized: string): Clip[] {
  const clips: Clip[] = [];

  for (let index = 0; index < clipLimit; index += 1) {
    const start = index * 6;
    const end = start + 6;
    clips.push({
      id: String(index + 1).padStart(2, "0"),
      time: `0:${String(start).padStart(2, "0")}-0:${String(end).padStart(2, "0")}`,
      title: index === 0 ? "Hook Scene" : index === clipLimit - 1 ? "CTA Scene" : "Value Scene",
      text:
        index === 0
          ? hooks[index % hooks.length]
          : `Use this part to expand ${normalized} with one clear teaching point and one practical action.`,
      overlay: index === 0 ? "STOP SCROLLING" : index === clipLimit - 1 ? "SAVE THIS SYSTEM" : "ONE IDEA -> MANY POSTS",
    });
  }

  return clips;
}

function buildCaptions(topic: string): string[] {
  const openers = [
    "One idea can fuel your whole week.",
    "This is your sign to repurpose smarter.",
    "Posting gets easier when your system is tighter.",
    "Most creators are one workflow away from consistency.",
    "Your content pipeline starts with one clear message.",
  ];

  const middles = [
    `Built from: ${topic}.`,
    "Structured for reels, shorts, and threads.",
    "Scripted in scenes so retention stays high.",
    "Designed for phone-first publishing speed.",
    "Made to remove guesswork from content planning.",
    "Created for fast remix and repost cycles.",
  ];

  const closers = [
    "Save this and use it before your next batch day.",
    "Comment your niche and I will suggest 3 hooks.",
    "Follow for daily content systems.",
    "Send this to a creator who needs more consistency.",
  ];

  const captions: string[] = [];

  for (const opener of openers) {
    for (const middle of middles) {
      for (const closer of closers) {
        captions.push(`${opener} ${middle} ${closer}`);
        if (captions.length === 120) {
          return captions;
        }
      }
    }
  }

  while (captions.length < 120) {
    captions.push(`${captions[captions.length % 10]} #repurpose #creatorworkflow`);
  }

  return captions;
}

function normalizeInput(value: string): string {
  const cleaned = value
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 80);
}

function clampClipLimit(value: number) {
  if (Number.isNaN(value)) {
    return 3;
  }

  return Math.max(1, Math.min(10, value));
}

function inferPrimaryIntent(input: string, mediaAnalysis: MediaAnalysisSummary | null): ContentIntent {
  const corpus = `${input} ${mediaAnalysis?.exactScript ?? ""}`.toLowerCase();

  const salesHits = countMatches(corpus, [
    "buy", "sale", "offer", "discount", "price", "launch", "product", "service", "client", "order", "subscribe", "checkout",
  ]);
  const storyHits = countMatches(corpus, [
    "story", "when i", "i was", "then", "after", "before", "journey", "moment", "remember", "happened",
  ]);
  const educationHits = countMatches(corpus, [
    "how to", "step", "tips", "learn", "guide", "framework", "lesson", "mistake", "strategy", "tutorial",
  ]);

  if (salesHits >= storyHits && salesHits >= educationHits && salesHits > 0) {
    return "sales";
  }

  if (storyHits >= salesHits && storyHits >= educationHits && storyHits > 0) {
    return "story";
  }

  if (educationHits > 0) {
    return "education";
  }

  return "general";
}

function countMatches(value: string, terms: string[]) {
  return terms.reduce((sum, term) => sum + (value.includes(term) ? 1 : 0), 0);
}

async function buildCurationProfile({
  input,
  inputType,
  tone,
  platform,
  mediaAnalysis,
}: {
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  mediaAnalysis: MediaAnalysisSummary | null;
}): Promise<CurationProfile> {
  const base = buildRuleBasedCuration({ inputType, tone, platform, mediaAnalysis });
  const ollama = await getOllamaCuration({ input, inputType, tone, platform, mediaAnalysis });

  return {
      platformDirective: pickDirective(ollama?.platformDirective, base.platformDirective),
      toneDirective: pickDirective(ollama?.toneDirective, base.toneDirective),
      inputDirective: pickDirective(ollama?.inputDirective, base.inputDirective),
      hookStrategy: pickDirective(ollama?.hookStrategy, base.hookStrategy),
      editingStrategy: pickDirective(ollama?.editingStrategy, base.editingStrategy),
  };
}

  function asText(value: unknown) {
    if (typeof value === "string") {
      return value;
    }

    if (value == null) {
      return "";
    }

    return String(value);
  }

  function pickDirective(candidate: unknown, fallback: string) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    return fallback;
  }

function buildRuleBasedCuration({
  inputType,
  tone,
  platform,
  mediaAnalysis,
}: {
  inputType: InputType;
  tone: string;
  platform: string;
  mediaAnalysis: MediaAnalysisSummary | null;
}): CurationProfile {
  const platformDirective =
    platform === "TikTok"
      ? "Front-load hook in first 1.2 seconds, use fast cuts every 1-2 beats, and keep overlays concise for thumb-stop retention."
      : platform === "Instagram Reels"
        ? "Use aesthetic pacing, clear emotional beat shifts, and concise overlays suitable for loopable replay."
        : platform === "YouTube Shorts"
          ? "Keep educational value dense, maintain clear chapter flow, and end with a curiosity payoff to encourage rewatch."
          : "Prioritize one strong insight, quote-ready phrasing, and concise argument flow for shareability on X.";

  const toneDirective =
    tone === "Futuristic"
      ? "Use future-facing language, system metaphors, and high-clarity momentum."
      : tone === "Viral"
        ? "Prioritize emotional contrast, curiosity gaps, and high-velocity punch lines."
        : tone === "Expert"
          ? "Use authority framing, precise wording, and practical tactical depth."
          : "Use narrative arc with setup, tension, and satisfying payoff.";

  const inputDirective =
    inputType === "youtube"
      ? "Extract the strongest teaching sequence from the video and compress into short-form scenes."
      : inputType === "blog"
        ? "Convert key paragraphs into spoken-style scenes with clear visual beats."
        : inputType === "transcript"
          ? "Preserve the creator's exact wording and only tighten punctuation for readability."
          : inputType === "video"
            ? "Listen-first curation: keep clip suggestions aligned to detected transcript and scene timings."
            : "Transform raw concept into a direct hook-value-CTA scene sequence.";

  const hookStrategy = mediaAnalysis?.suggestedClips?.[0]?.text
    ? "Always begin with the strongest detected spoken hook from analysis clip 1."
    : "Always start with a pattern-interrupt hook in under 9 words, then prove value quickly.";

  const editingStrategy = mediaAnalysis?.hasMusic
    ? "Sync cuts and caption rhythm to the detected beat bed while preserving vocal clarity."
    : "Use speech-led pacing and suggest subtle background music where needed for energy.";

  return { platformDirective, toneDirective, inputDirective, hookStrategy, editingStrategy };
}

async function getOllamaCuration({
  input,
  inputType,
  tone,
  platform,
  mediaAnalysis,
}: {
  input: string;
  inputType: InputType;
  tone: string;
  platform: string;
  mediaAnalysis: MediaAnalysisSummary | null;
}): Promise<Partial<CurationProfile> | null> {
  if (process.env.OLLAMA_ENABLED === "false") {
    return null;
  }

  const model = process.env.OLLAMA_MODEL || "llama3.2";
  const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  if (!canUseOllamaHost(host)) {
    return null;
  }

  const prompt = [
    "You are a background content curation planner.",
    "Never output chat text. Return JSON only.",
    "Return keys: platformDirective, toneDirective, inputDirective, hookStrategy, editingStrategy.",
    `Platform: ${platform}`,
    `Tone: ${tone}`,
    `Input type: ${inputType}`,
    `Music detected: ${mediaAnalysis?.hasMusic ? "yes" : "no"}`,
    "Source text:",
    input.slice(0, 5000),
  ].join("\n");

  try {
    const response = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { response?: string };
    const content = payload.response?.trim() ?? "";
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as Partial<CurationProfile>;
    return parsed;
  } catch {
    return null;
  }
}
