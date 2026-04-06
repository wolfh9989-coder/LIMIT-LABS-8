import { mkdtemp, readFile, rm } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
import { allowLocalProcessExecution } from "@/lib/deployment";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getMemoryMediaAssets } from "@/lib/memory-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Clip, MediaAsset, MediaAnalysisSummary, TranscriptionSegment } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  userId?: string;
  assetId?: string;
  sourceUrl?: string;
  clipLimit?: number;
};

type AnalysisModelResponse = {
  exactScript: string;
  hooks: string[];
  clips: Array<{
    startMs: number;
    endMs: number;
    title: string;
    text: string;
    reason: string;
    hookScore: number;
  }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");

    if (!identity?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const clipLimit = clampClipLimit(body.clipLimit ?? 3);
    const assetId = body.assetId?.trim() ?? "";
    const sourceUrl = body.sourceUrl?.trim() ?? "";

    if (!assetId && !sourceUrl) {
      return NextResponse.json({ error: "assetId or sourceUrl is required" }, { status: 400 });
    }

    if (!assetId && sourceUrl) {
      const youtubeTranscript = await transcribeYouTubeFromUrl(sourceUrl);
      if (!youtubeTranscript) {
        return NextResponse.json({ error: "Unable to analyze source link audio. Upload media or use a supported transcript source." }, { status: 422 });
      }

      const durationSeconds = Math.max(1, youtubeTranscript.durationSeconds || estimateDurationFromSegments(youtubeTranscript.segments));
      const hookCandidates = estimateHookCandidates(youtubeTranscript.segments, youtubeTranscript.text);
      const suggestedClipCount = suggestClipCount(durationSeconds, clipLimit, hookCandidates);
      const derived = await analyzeTranscriptWithModel({
        text: youtubeTranscript.text,
        segments: youtubeTranscript.segments,
        durationSeconds,
        clipCount: suggestedClipCount,
      }) ?? fallbackAnalysis(youtubeTranscript.text, youtubeTranscript.segments, durationSeconds, suggestedClipCount);

      const analysis: MediaAnalysisSummary = {
        assetId: `link:${extractYouTubeId(sourceUrl) || "source"}`,
        assetName: "Source link transcript",
        durationSeconds,
        hasMusic: false,
        musicConfidence: 0.5,
        musicNote: "Transcript-based analysis from source link.",
        exactScript: derived.exactScript,
        wordCount: countWords(derived.exactScript),
        suggestedClipCount,
        suggestedClips: normalizeSuggestedClips(derived.clips, durationSeconds, suggestedClipCount),
      };

      return NextResponse.json({ analysis, hooks: derived.hooks, transcript: youtubeTranscript.text, segments: youtubeTranscript.segments });
    }

    const asset = await loadAsset(identity.userId, assetId);
    if (!asset) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    if (!asset.mimeType.startsWith("audio/") && !asset.mimeType.startsWith("video/")) {
      return NextResponse.json({ error: "Select an audio or video asset" }, { status: 400 });
    }

    let transcription: { text: string; durationSeconds: number; segments: TranscriptionSegment[] };
    try {
      transcription = await transcribeAsset(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to transcribe selected media.";
      return NextResponse.json({ error: message }, { status: 422 });
    }
    if (!transcription.text) {
      return NextResponse.json({ error: "Could not detect speech in this media" }, { status: 422 });
    }

    const durationSeconds = Math.max(1, transcription.durationSeconds || estimateDurationFromSegments(transcription.segments));
    const hookCandidates = estimateHookCandidates(transcription.segments, transcription.text);
    const suggestedClipCount = suggestClipCount(durationSeconds, clipLimit, hookCandidates);
    const speechCoverage = getSpeechCoverage(transcription.segments, durationSeconds);
    const signalMusic = await detectMusicFromSignal(asset.storagePath);
    const music = combineMusicSignals(transcription.text, speechCoverage, signalMusic);

    const modelInsights = await analyzeTranscriptWithModel({
      text: transcription.text,
      segments: transcription.segments,
      durationSeconds,
      clipCount: suggestedClipCount,
    });

    const derived = modelInsights ?? fallbackAnalysis(transcription.text, transcription.segments, durationSeconds, suggestedClipCount);
    const normalizedClips = normalizeSuggestedClips(derived.clips, durationSeconds, suggestedClipCount);

    const analysis: MediaAnalysisSummary = {
      assetId: asset.id,
      assetName: asset.fileName,
      durationSeconds,
      hasMusic: music.hasMusic,
      musicConfidence: music.confidence,
      musicNote: music.note,
      exactScript: derived.exactScript,
      wordCount: countWords(derived.exactScript),
      suggestedClipCount,
      suggestedClips: normalizedClips,
    };

    return NextResponse.json({ analysis, hooks: derived.hooks, transcript: transcription.text, segments: transcription.segments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function loadAsset(userId: string, assetId: string): Promise<MediaAsset | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data } = await supabase
      .from("media_assets")
      .select("id,user_id,kind,file_name,mime_type,storage_path,public_url,created_at")
      .eq("user_id", userId)
      .eq("id", assetId)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        userId: data.user_id,
        kind: data.kind,
        fileName: data.file_name,
        mimeType: data.mime_type,
        storagePath: data.storage_path,
        publicUrl: data.public_url,
        createdAt: data.created_at,
      };
    }
  }

  return getMemoryMediaAssets(userId).find((asset) => asset.id === assetId) ?? null;
}

async function transcribeAsset(asset: MediaAsset): Promise<{ text: string; durationSeconds: number; segments: TranscriptionSegment[] }> {
  const local = await transcribeWithLocalWhisper(asset);
  if (local) {
    return local;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No transcription backend is available. Install local Whisper CLI or configure OPENAI_API_KEY.");
  }

  const bytes = await readFile(asset.storagePath);
  const file = new File([bytes], asset.fileName || basename(asset.storagePath), { type: asset.mimeType || "application/octet-stream" });
  const formData = new FormData();
  formData.set("file", file);
  formData.set("model", "whisper-1");
  formData.set("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const payload = (await response.json()) as {
    text?: string;
    duration?: number;
    segments?: Array<{ id?: number; start?: number; end?: number; text?: string; avg_logprob?: number }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Transcription failed");
  }

  const text = (payload.text ?? "").trim();
  const segments = buildSegments(payload.segments ?? [], text, payload.duration ?? 0);

  return {
    text,
    durationSeconds: Math.max(payload.duration ?? 0, estimateDurationFromSegments(segments)),
    segments,
  };
}

async function analyzeTranscriptWithModel({
  text,
  segments,
  durationSeconds,
  clipCount,
}: {
  text: string;
  segments: TranscriptionSegment[];
  durationSeconds: number;
  clipCount: number;
}): Promise<AnalysisModelResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const trimmedSegments = segments.slice(0, 120).map((segment) => ({
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text,
  }));

  const prompt = [
    "You are an expert short-form video editor and transcript analyst.",
    "Goal: produce an exact creator script and the best hook-first clip breakdown.",
    "Rules:",
    "1) exactScript should preserve wording from transcript text, lightly fixing punctuation only.",
    "2) return 1 clip as strongest hook first, then remaining clips in chronological order.",
    "3) choose scene cuts with high retention potential.",
    "4) clip text should quote exact transcript lines from that scene.",
    `Need exactly ${clipCount} clips.`,
    `Duration seconds: ${durationSeconds}.`,
    "Transcript:",
    text,
    "Timestamped segments JSON:",
    JSON.stringify(trimmedSegments),
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
      max_output_tokens: 2800,
      text: {
        format: {
          type: "json_schema",
          name: "media_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              exactScript: { type: "string" },
              hooks: {
                type: "array",
                minItems: 3,
                maxItems: 8,
                items: { type: "string" },
              },
              clips: {
                type: "array",
                minItems: clipCount,
                maxItems: clipCount,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    startMs: { type: "number" },
                    endMs: { type: "number" },
                    title: { type: "string" },
                    text: { type: "string" },
                    reason: { type: "string" },
                    hookScore: { type: "number" },
                  },
                  required: ["startMs", "endMs", "title", "text", "reason", "hookScore"],
                },
              },
            },
            required: ["exactScript", "hooks", "clips"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { output_text?: string };
  if (!data.output_text) {
    return null;
  }

  try {
    return JSON.parse(data.output_text) as AnalysisModelResponse;
  } catch {
    return null;
  }
}

function buildSegments(rawSegments: Array<{ id?: number; start?: number; end?: number; text?: string; avg_logprob?: number }>, text: string, durationSeconds: number): TranscriptionSegment[] {
  const normalized = rawSegments
    .map((segment, index) => ({
      id: `voice-${segment.id ?? index + 1}`,
      text: (segment.text ?? "").trim(),
      startMs: Math.max(0, Math.round((segment.start ?? 0) * 1000)),
      endMs: Math.max(240, Math.round((segment.end ?? 0) * 1000)),
      confidence: typeof segment.avg_logprob === "number" ? Number((Math.exp(segment.avg_logprob) * 100).toFixed(2)) : null,
    }))
    .filter((segment) => segment.text.length > 0)
    .map((segment) => ({ ...segment, endMs: Math.max(segment.startMs + 240, segment.endMs) }));

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackParts = text
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (fallbackParts.length === 0) {
    return [];
  }

  const totalMs = Math.max(3000, Math.round(durationSeconds * 1000) || fallbackParts.length * 1600);
  const sliceMs = Math.max(800, Math.round(totalMs / fallbackParts.length));

  return fallbackParts.map((part, index) => ({
    id: `voice-${index + 1}`,
    text: part,
    startMs: index * sliceMs,
    endMs: Math.min(totalMs, (index + 1) * sliceMs),
    confidence: null,
  }));
}

function fallbackAnalysis(text: string, segments: TranscriptionSegment[], durationSeconds: number, clipCount: number): AnalysisModelResponse {
  const segmentPool = segments.length > 0 ? segments : buildSegments([], text, durationSeconds);
  const sortedByHook = [...segmentPool].sort((a, b) => scoreSegment(b.text) - scoreSegment(a.text));
  const strongest = sortedByHook[0];

  const chosen = strongest
    ? [strongest, ...segmentPool.filter((segment) => segment.id !== strongest.id)]
    : segmentPool;

  const step = Math.max(1, Math.floor(chosen.length / Math.max(1, clipCount)));
  const selected = Array.from({ length: clipCount }).map((_, index) => chosen[Math.min(index * step, chosen.length - 1)]).filter(Boolean) as TranscriptionSegment[];

  const clips = selected.map((segment, index) => {
    const next = selected[index + 1];
    const endMs = next ? Math.max(segment.endMs, next.startMs) : Math.min(Math.round(durationSeconds * 1000), segment.endMs + 4000);
    return {
      startMs: segment.startMs,
      endMs,
      title: index === 0 ? "Strongest Hook" : `Scene ${index + 1}`,
      text: segment.text,
      reason: index === 0 ? "Highest impact opening line for retention" : "Logical narrative continuation",
      hookScore: Math.min(100, Math.max(30, scoreSegment(segment.text))),
    };
  });

  const hooks = clips.slice(0, 5).map((clip) => clip.text);

  return {
    exactScript: text,
    hooks,
    clips,
  };
}

function normalizeSuggestedClips(raw: AnalysisModelResponse["clips"], durationSeconds: number, clipCount: number): Clip[] {
  const safeDurationMs = Math.max(1000, Math.round(durationSeconds * 1000));
  const subset = raw.slice(0, clipCount);

  return subset.map((clip, index) => {
    const startMs = clampNumber(clip.startMs, 0, safeDurationMs - 300);
    const endMs = clampNumber(Math.max(startMs + 300, clip.endMs), startMs + 300, safeDurationMs);

    return {
      id: String(index + 1).padStart(2, "0"),
      time: `${formatTime(startMs)}-${formatTime(endMs)}`,
      title: clip.title,
      text: clip.text,
      overlay: index === 0 ? "Strongest hook first" : "Scene highlight",
      startMs,
      endMs,
      hookScore: clampNumber(clip.hookScore, 0, 100),
      reason: clip.reason,
    };
  });
}

function combineMusicSignals(
  text: string,
  speechCoverage: number,
  signal: { hasMusic: boolean; confidence: number; note: string } | null,
) {
  const lower = text.toLowerCase();
  const containsMusicTag = /\b(music|song|beat|instrumental|lyrics|chorus|melody|♪)\b/.test(lower);
  const signalConf = signal?.confidence ?? 0;
  const signalVote = signal?.hasMusic ?? false;

  if (containsMusicTag || (signalVote && signalConf >= 0.62)) {
    return {
      hasMusic: true,
      confidence: Math.min(0.95, Math.max(0.68, containsMusicTag ? 0.78 : signalConf)),
      note: containsMusicTag
        ? "Music cues were detected in transcript/audio context."
        : signal?.note ?? "Beat and harmonic motion indicate background music.",
    };
  }

  if (speechCoverage < 0.14) {
    return {
      hasMusic: true,
      confidence: 0.62,
      note: "Low speech coverage suggests background music or non-speech audio is present.",
    };
  }

  return {
    hasMusic: false,
    confidence: Math.max(0.62, 1 - signalConf),
    note: signal?.note ?? "No clear music cues detected. A subtle background track is recommended.",
  };
}

async function detectMusicFromSignal(storagePath: string): Promise<{ hasMusic: boolean; confidence: number; note: string } | null> {
  const samples = await extractMonoSamples(storagePath, 22050, 45);
  if (!samples || samples.length < 22050 * 3) {
    return null;
  }

  const frameSize = 1024;
  const hop = 512;
  const energies: number[] = [];
  let zcrSum = 0;

  for (let i = 0; i + frameSize < samples.length; i += hop) {
    let energy = 0;
    let zc = 0;
    for (let j = 0; j < frameSize; j += 1) {
      const value = samples[i + j];
      energy += value * value;
      if (j > 0 && Math.sign(samples[i + j - 1]) !== Math.sign(value)) {
        zc += 1;
      }
    }
    energies.push(Math.sqrt(energy / frameSize));
    zcrSum += zc / frameSize;
  }

  if (energies.length < 12) {
    return null;
  }

  const onset: number[] = [];
  for (let i = 1; i < energies.length; i += 1) {
    onset.push(Math.max(0, energies[i] - energies[i - 1]));
  }

  const meanOnset = onset.reduce((sum, value) => sum + value, 0) / onset.length;
  const onsetCentered = onset.map((value) => value - meanOnset);
  const minLag = Math.floor((60 / 180) * (22050 / hop));
  const maxLag = Math.floor((60 / 70) * (22050 / hop));
  let bestLagScore = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let i = lag; i < onsetCentered.length; i += 1) {
      score += onsetCentered[i] * onsetCentered[i - lag];
    }
    if (score > bestLagScore) {
      bestLagScore = score;
    }
  }

  const onsetPower = onsetCentered.reduce((sum, value) => sum + value * value, 0);
  const periodicity = onsetPower > 0 ? Math.max(0, bestLagScore / onsetPower) : 0;
  const meanZcr = zcrSum / energies.length;
  const confidence = Math.min(0.96, Math.max(0, periodicity * 1.8 + Math.max(0, meanZcr - 0.05) * 2.4));
  const hasMusic = confidence >= 0.62;

  return {
    hasMusic,
    confidence: Number(confidence.toFixed(2)),
    note: hasMusic
      ? "Signal analysis detected periodic beat/harmonic motion consistent with music."
      : "Signal analysis found speech-dominant cadence with weak beat periodicity.",
  };
}

async function extractMonoSamples(storagePath: string, sampleRate: number, maxSeconds: number): Promise<Float32Array | null> {
  if (!allowLocalProcessExecution() || !ffmpegPath) {
    return null;
  }

  return new Promise((resolve) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      "0",
      "-t",
      String(maxSeconds),
      "-i",
      storagePath,
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "-f",
      "f32le",
      "pipe:1",
    ];

    const proc = spawn(ffmpegPath as string, args, { stdio: ["ignore", "pipe", "ignore"] });
    const chunks: Buffer[] = [];

    proc.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    proc.on("close", (code) => {
      if (code !== 0 || chunks.length === 0) {
        resolve(null);
        return;
      }

      const buffer = Buffer.concat(chunks);
      const usableBytes = buffer.length - (buffer.length % 4);
      const view = new Float32Array(usableBytes / 4);
      for (let i = 0; i < view.length; i += 1) {
        view[i] = buffer.readFloatLE(i * 4);
      }
      resolve(view);
    });
    proc.on("error", () => resolve(null));
  });
}

function getSpeechCoverage(segments: TranscriptionSegment[], durationSeconds: number) {
  const totalMs = Math.max(1, Math.round(durationSeconds * 1000));
  const speechMs = segments.reduce((sum, segment) => sum + Math.max(0, segment.endMs - segment.startMs), 0);
  return Math.min(1, speechMs / totalMs);
}

function estimateDurationFromSegments(segments: TranscriptionSegment[]) {
  if (!segments.length) {
    return 0;
  }

  const maxEndMs = segments.reduce((max, segment) => Math.max(max, segment.endMs), 0);
  return Math.round(maxEndMs / 1000);
}

function suggestClipCount(durationSeconds: number, clipLimit: number, hookCandidates: number) {
  const durationCap = durationSeconds <= 30
    ? 2
    : durationSeconds <= 60
      ? 3
      : durationSeconds <= 90
        ? 4
        : durationSeconds <= 150
          ? 5
          : durationSeconds <= 240
            ? 7
            : 10;

  const hookDriven = Math.max(1, Math.min(10, Math.round(hookCandidates)));
  const blended = Math.round((hookDriven * 0.65) + (durationCap * 0.35));
  return Math.max(1, Math.min(clipLimit, durationCap, blended));
}

function estimateHookCandidates(segments: TranscriptionSegment[], text: string) {
  if (segments.length > 0) {
    const strong = segments.filter((segment) => scoreSegment(segment.text) >= 58).length;
    if (strong > 0) {
      return strong;
    }
  }

  const sentences = text
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const strongSentences = sentences.filter((sentence) => scoreSegment(sentence) >= 58).length;
  return strongSentences || Math.min(2, Math.max(1, sentences.length));
}

function scoreSegment(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const urgency = /\b(stop|why|secret|never|best|fast|easy|mistake|truth|today|now)\b/i.test(text) ? 18 : 0;
  const punctuation = /[!?]/.test(text) ? 12 : 0;
  const lengthScore = Math.min(30, Math.max(8, words * 2));
  return Math.min(100, lengthScore + urgency + punctuation);
}

function clampClipLimit(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

async function transcribeYouTubeFromUrl(sourceUrl: string): Promise<{ text: string; durationSeconds: number; segments: TranscriptionSegment[] } | null> {
  const videoId = extractYouTubeId(sourceUrl);
  if (!videoId) {
    return null;
  }

  const transcript = await fetchYouTubeTimedText(videoId);
  if (!transcript) {
    return null;
  }

  const durationSeconds = Math.max(1, Math.round((transcript.segments.at(-1)?.endMs ?? 0) / 1000));
  return {
    text: transcript.text,
    durationSeconds,
    segments: transcript.segments,
  };
}

function extractYouTubeId(sourceUrl: string) {
  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (host.includes("youtube.com")) {
      return parsed.searchParams.get("v") ?? parsed.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] ?? "";
    }

    return "";
  } catch {
    return "";
  }
}

async function fetchYouTubeTimedText(videoId: string): Promise<{ text: string; segments: TranscriptionSegment[] } | null> {
  const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) {
    return null;
  }

  const listXml = await listResponse.text();
  const tracks = parseTimedTextTracks(listXml);
  if (tracks.length === 0) {
    return null;
  }

  const preferred = prioritizeTracks(tracks);
  for (const track of preferred) {
    const url = `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(track.langCode)}&v=${encodeURIComponent(videoId)}&fmt=srv3${track.kind ? `&kind=${encodeURIComponent(track.kind)}` : ""}`;
    const response = await fetch(url);
    if (!response.ok) {
      continue;
    }

    const xml = await response.text();
    if (!xml.includes("<text")) {
      continue;
    }

    const parsed = parseTimedTextXml(xml);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function parseTimedTextXml(xml: string): { text: string; segments: TranscriptionSegment[] } | null {

  const segments: TranscriptionSegment[] = [];
  const regex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(xml)) !== null) {
    const start = Number(match[1] ?? 0);
    const dur = Number(match[2] ?? 0);
    const raw = decodeXmlEntities((match[3] ?? "").replace(/<[^>]+>/g, "").trim());
    if (!raw) {
      continue;
    }

    index += 1;
    const startMs = Math.max(0, Math.round(start * 1000));
    const endMs = Math.max(startMs + 240, Math.round((start + Math.max(0.24, dur)) * 1000));
    segments.push({
      id: `yt-${index}`,
      text: raw,
      startMs,
      endMs,
      confidence: null,
    });
  }

  if (segments.length === 0) {
    return null;
  }

  const text = segments.map((segment) => segment.text).join(" ");
  return { text, segments };
}

type TimedTextTrack = {
  langCode: string;
  kind: string;
};

function parseTimedTextTracks(xml: string): TimedTextTrack[] {
  const tracks: TimedTextTrack[] = [];
  const regex = /<track\s+([^>]+?)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const attrs = match[1] ?? "";
    const langCode = (attrs.match(/lang_code="([^"]+)"/)?.[1] ?? "").trim();
    const kind = (attrs.match(/kind="([^"]+)"/)?.[1] ?? "").trim();
    if (!langCode) {
      continue;
    }

    tracks.push({ langCode, kind });
  }

  return tracks;
}

function prioritizeTracks(tracks: TimedTextTrack[]) {
  const deduped = Array.from(new Map(tracks.map((track) => [`${track.langCode}:${track.kind}`, track])).values());

  return deduped.sort((a, b) => {
    const aScore = trackScore(a);
    const bScore = trackScore(b);
    return bScore - aScore;
  });
}

function trackScore(track: TimedTextTrack) {
  const lang = track.langCode.toLowerCase();
  let score = 0;

  if (lang === "en" || lang.startsWith("en-")) {
    score += 30;
  }

  if (!track.kind) {
    score += 10;
  }

  if (track.kind === "asr") {
    score += 8;
  }

  return score;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#10;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function transcribeWithLocalWhisper(asset: MediaAsset): Promise<{ text: string; durationSeconds: number; segments: TranscriptionSegment[] } | null> {
  if (!allowLocalProcessExecution()) {
    return null;
  }

  const commandValue = process.env.WHISPER_STT_COMMAND?.trim() || "whisper";
  const model = process.env.WHISPER_STT_MODEL?.trim() || "base";
  const commandCandidates = getWhisperCommandCandidates(commandValue);
  if (commandCandidates.length === 0) {
    return null;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "ll8-whisper-"));
  const stem = basename(asset.fileName || asset.storagePath, extname(asset.fileName || asset.storagePath));
  try {
    let executed = false;
    for (const candidate of commandCandidates) {
      const executable = candidate[0];
      if (!executable) {
        continue;
      }

      const args = buildWhisperArgs(candidate, asset.storagePath, tempDir, model);
      const result = await runProcess(executable, args);
      if (result.ok) {
        executed = true;
        break;
      }
    }

    if (!executed) {
      return null;
    }

    const outputPath = join(tempDir, `${stem}.json`);
    if (!existsSync(outputPath)) {
      return null;
    }

    const raw = await readFile(outputPath, "utf8");
    const parsed = JSON.parse(raw) as {
      text?: string;
      segments?: Array<{ id?: number; start?: number; end?: number; text?: string; avg_logprob?: number }>;
    };

    const text = (parsed.text ?? "").trim();
    const segments = buildSegments(parsed.segments ?? [], text, 0);
    if (!text && segments.length === 0) {
      return null;
    }

    return {
      text,
      durationSeconds: Math.max(estimateDurationFromSegments(segments), 1),
      segments,
    };
  } catch {
    return null;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function runProcess(command: string, args: string[]) {
  return new Promise<{ ok: boolean; code: number | null; error: string | null; stderr: string }>((resolve) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
      env: buildWhisperEnv(),
    });
    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4000) {
        stderr = stderr.slice(-4000);
      }
    });
    proc.on("close", (code) => resolve({ ok: code === 0, code, error: null, stderr: stderr.trim() }));
    proc.on("error", (error) => resolve({ ok: false, code: null, error: error.message, stderr: stderr.trim() }));
  });
}

function buildWhisperEnv() {
  const env = { ...process.env };
  const resolvedFfmpegPath = getResolvedFfmpegPath();
  if (!resolvedFfmpegPath) {
    return env;
  }

  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const currentPath = env[pathKey] ?? "";
  const ffmpegDir = dirname(resolvedFfmpegPath);
  env[pathKey] = currentPath ? `${currentPath};${ffmpegDir}` : ffmpegDir;
  return env;
}


function buildWhisperArgs(candidate: string[], storagePath: string, tempDir: string, model: string) {
  const sharedArgs = [
    storagePath,
    "--output_format",
    "json",
    "--output_dir",
    tempDir,
    "--model",
    model,
    "--task",
    "transcribe",
    "--fp16",
    "False",
  ];

  if (isPythonModuleWhisperCommand(candidate)) {
    return ["-c", buildWhisperBootstrap(), ...sharedArgs];
  }

  return [...candidate.slice(1), ...sharedArgs];
}

function isPythonModuleWhisperCommand(candidate: string[]) {
  return candidate.length >= 3 && candidate[1] === "-m" && candidate[2] === "whisper";
}

function buildWhisperBootstrap() {
  const resolvedFfmpegPath = getResolvedFfmpegPath();
  const ffmpegDir = resolvedFfmpegPath ? dirname(resolvedFfmpegPath) : "";
  const pathPrefix = ffmpegDir ? `${ffmpegDir};` : "";
  return [
    "import os",
    `os.environ['PATH'] = ${JSON.stringify(pathPrefix)} + os.environ.get('PATH', '')`,
    "from whisper.transcribe import cli",
    "cli()",
  ].join("; ");
}

function getResolvedFfmpegPath() {
  const candidates = [
    typeof ffmpegPath === "string" ? ffmpegPath : "",
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}
function splitCommand(value: string) {
  return value.match(/"[^"]+"|'[^']+'|\S+/g)?.map((part) => part.replace(/^['"]|['"]$/g, "")) ?? [];
}

function getWhisperCommandCandidates(commandValue: string) {
  const cwd = process.cwd();
  const venvWhisper = join(cwd, ".venv", "Scripts", "whisper.exe");
  const venvPython = join(cwd, ".venv", "Scripts", "python.exe");
  const windowsPy = join(process.env.SystemRoot ?? "C:\\Windows", "py.exe");
  const installedPythons = getInstalledPythonExecutables();
  const explicit = splitCommand(commandValue);

  const candidates = [
    ...(explicit.length > 0 && commandValue !== "whisper" ? [explicit] : []),
    existsSync(venvWhisper) ? [venvWhisper] : [],
    existsSync(venvPython) ? [venvPython, "-m", "whisper"] : [],
    existsSync(windowsPy) ? [windowsPy, "-m", "whisper"] : [],
    ...installedPythons.map((pythonPath) => [pythonPath, "-m", "whisper"]),
    ...(commandValue === "whisper" ? [splitCommand(commandValue)] : []),
    ["python", "-m", "whisper"],
    ["py", "-m", "whisper"],
  ].filter((parts) => parts.length > 0);

  return Array.from(new Map(candidates.map((parts) => [parts.join(" "), parts])).values());
}

function getInstalledPythonExecutables() {
  const localAppData = process.env.LOCALAPPDATA ?? "";
  const root = join(localAppData, "Programs", "Python");
  if (!localAppData || !existsSync(root)) {
    return [] as string[];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name, "python.exe"))
    .filter((pythonPath) => existsSync(pythonPath));
}
