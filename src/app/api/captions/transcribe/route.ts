import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
import { allowLocalProcessExecution } from "@/lib/deployment";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getMemoryMediaAssets } from "@/lib/memory-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { MediaAsset, TranscriptionSegment } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  userId?: string;
  assetId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");

    if (!identity?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const assetId = body.assetId?.trim() ?? "";
    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const asset = await loadAsset(identity.userId, assetId);
    if (!asset) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    if (!asset.mimeType.startsWith("audio/") && !asset.mimeType.startsWith("video/")) {
      return NextResponse.json({ error: "Select an audio or video asset for transcription" }, { status: 400 });
    }

    const local = await transcribeWithLocalWhisper(asset);
    if (local) {
      return NextResponse.json({ text: local.text, segments: local.segments });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No transcription backend is available. Install local Whisper CLI or configure OPENAI_API_KEY." }, { status: 422 });
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
      return NextResponse.json({ error: payload.error?.message ?? "Transcription failed" }, { status: response.status });
    }

    const text = (payload.text ?? "").trim();
    const segments = buildResponseSegments(payload.segments ?? [], text, payload.duration ?? 0);

    return NextResponse.json({ text, segments });
  } catch {
    return NextResponse.json({ error: "Unable to transcribe media" }, { status: 500 });
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

function buildResponseSegments(rawSegments: Array<{ id?: number; start?: number; end?: number; text?: string; avg_logprob?: number }>, text: string, durationSeconds: number): TranscriptionSegment[] {
  const normalized = rawSegments
    .map((segment, index) => ({
      id: `voice-${segment.id ?? index + 1}`,
      text: (segment.text ?? "").trim(),
      startMs: Math.max(0, Math.round((segment.start ?? 0) * 1000)),
      endMs: Math.max(240, Math.round((segment.end ?? 0) * 1000)),
      confidence: typeof segment.avg_logprob === "number" ? Number((Math.exp(segment.avg_logprob) * 100).toFixed(2)) : null,
    }))
    .filter((segment) => segment.text.length > 0)
    .map((segment) => ({
      ...segment,
      endMs: Math.max(segment.startMs + 240, segment.endMs),
    }));

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

async function transcribeWithLocalWhisper(asset: MediaAsset): Promise<{ text: string; segments: TranscriptionSegment[] } | null> {
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
    const segments = buildResponseSegments(parsed.segments ?? [], text, 0);
    if (!text && segments.length === 0) {
      return null;
    }

    return { text, segments };
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