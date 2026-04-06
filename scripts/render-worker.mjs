import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { createClient } from "@supabase/supabase-js";

const once = process.argv.includes("--once");
const intervalMs = Number(process.env.RENDER_WORKER_INTERVAL_MS ?? 5000);
const ffmpegTimeoutMs = Number(process.env.RENDER_WORKER_FFMPEG_TIMEOUT_MS ?? 180000);
const maxRenderAttempts = Number(process.env.RENDER_WORKER_MAX_ATTEMPTS ?? 3);
const cwd = process.cwd();
const storePath = join(cwd, ".limitlabs", "local-store.json");
const outputDir = join(cwd, "public", "renders");
const fontPath = existsSync("C:/Windows/Fonts/arial.ttf") ? "C\\:/Windows/Fonts/arial.ttf" : null;

mkdirSync(outputDir, { recursive: true });

async function main() {
  if (!ffmpegPath) {
    console.error("ffmpeg-static not available");
    process.exit(1);
  }

  if (once) {
    await processQueue();
    return;
  }

  while (true) {
    await processQueue();
    await sleep(intervalMs);
  }
}

async function processQueue() {
  const supabase = getSupabaseAdmin();
  const jobs = supabase ? await getSupabaseJobs(supabase) : getLocalJobs();

  logInfo("render-worker.queue.fetched", { count: jobs.length, backend: supabase ? "supabase" : "local" });

  for (const job of jobs) {
    try {
      if (supabase) {
        const claimed = await claimSupabaseJob(supabase, job.id);
        if (!claimed) {
          logInfo("render-worker.job.skipped_unclaimed", { jobId: job.id });
          continue;
        }
      }

      if (supabase) {
        await updateSupabaseJob(supabase, job.id, { status: "processing", error_message: null, updated_at: new Date().toISOString() });
      } else {
        updateLocalJob(job.id, { status: "processing", errorMessage: null, updatedAt: new Date().toISOString() });
      }

      logInfo("render-worker.job.processing", { jobId: job.id, userId: job.userId });

      const context = supabase ? await loadSupabaseContext(supabase, job) : loadLocalContext(job);
      if (!context.project) {
        throw new Error("Project payload not found for job");
      }

      const outputPath = join(outputDir, `${job.id}.mp4`);
      const args = buildFfmpegArgs({ job, project: context.project, assets: context.assets, outputPath });
      await runFfmpegWithRetry(args, {
        attempts: Math.max(1, maxRenderAttempts),
        timeoutMs: Math.max(20_000, ffmpegTimeoutMs),
        onRetry: ({ attempt, message }) => {
          logWarn("render-worker.job.retry", { jobId: job.id, attempt, message });
        },
      });

      const completedUpdate = {
        status: "completed",
        output_url: `/renders/${job.id}.mp4`,
        updated_at: new Date().toISOString(),
        error_message: null,
      };

      if (supabase) {
        await updateSupabaseJob(supabase, job.id, completedUpdate);
      } else {
        updateLocalJob(job.id, {
          status: "completed",
          outputUrl: `/renders/${job.id}.mp4`,
          updatedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }

      logInfo("render-worker.job.completed", { jobId: job.id, outputUrl: `/renders/${job.id}.mp4` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown render failure";
      logError("render-worker.job.failed", { jobId: job.id, message });
      if (supabase) {
        await updateSupabaseJob(supabase, job.id, { status: "failed", error_message: message, updated_at: new Date().toISOString() });
      } else {
        updateLocalJob(job.id, { status: "failed", errorMessage: message, updatedAt: new Date().toISOString() });
      }
    }
  }
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getSupabaseJobs(supabase) {
  const { data } = await supabase
    .from("export_jobs")
    .select("id,user_id,project_id,format,status,engine,command_preview,output_url,background_asset_id,logo_asset_id,audio_asset_id,error_message,created_at,updated_at")
    .eq("status", "queued")
    .eq("format", "mp4")
    .order("created_at", { ascending: true })
    .limit(3);

  return (data ?? []).map(mapSupabaseJob);
}

async function loadSupabaseContext(supabase, job) {
  const { data: projectRow } = await supabase
    .from("projects")
    .select("payload")
    .eq("id", job.projectId)
    .eq("user_id", job.userId)
    .maybeSingle();

  const assetIds = [job.backgroundAssetId, job.logoAssetId, job.audioAssetId, projectRow?.payload?.sourceAssetId, projectRow?.payload?.analysis?.assetId].filter(Boolean);
  let assets = [];
  if (assetIds.length > 0) {
    const { data } = await supabase
      .from("media_assets")
      .select("id,user_id,kind,file_name,mime_type,storage_path,public_url,created_at")
      .in("id", assetIds);

    assets = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      fileName: row.file_name,
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      publicUrl: row.public_url,
      createdAt: row.created_at,
    }));
  }

  return { project: projectRow?.payload ?? null, assets };
}

async function updateSupabaseJob(supabase, jobId, patch) {
  await supabase.from("export_jobs").update(patch).eq("id", jobId);
}

async function claimSupabaseJob(supabase, jobId) {
  const { data, error } = await supabase
    .from("export_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id")
    .limit(1);

  if (error) {
    logError("render-worker.job.claim_failed", { jobId, message: error.message, code: error.code });
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

function getLocalStore() {
  if (!existsSync(storePath)) {
    return {
      projectsByUser: {},
      subscriptionsByUser: {},
      jobsByUser: {},
      mediaAssetsByUser: {},
    };
  }

  return JSON.parse(readFileSync(storePath, "utf8"));
}

function writeLocalStore(store) {
  mkdirSync(join(cwd, ".limitlabs"), { recursive: true });
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function getLocalJobs() {
  const store = getLocalStore();
  const allJobs = Object.values(store.jobsByUser).flat();
  return allJobs.filter((job) => job.status === "queued" && job.format === "mp4");
}

function loadLocalContext(job) {
  const store = getLocalStore();
  const project = (store.projectsByUser[job.userId] ?? []).find((entry) => entry.id === job.projectId) ?? null;
  const allAssets = store.mediaAssetsByUser[job.userId] ?? [];
  const requiredIds = [job.backgroundAssetId, job.logoAssetId, job.audioAssetId, project?.sourceAssetId, project?.analysis?.assetId].filter(Boolean);
  const assets = requiredIds.length > 0 ? allAssets.filter((asset) => requiredIds.includes(asset.id)) : allAssets;
  return { project, assets };
}

function updateLocalJob(jobId, patch) {
  const store = getLocalStore();
  for (const userId of Object.keys(store.jobsByUser)) {
    store.jobsByUser[userId] = (store.jobsByUser[userId] ?? []).map((job) =>
      job.id === jobId ? { ...job, ...patch } : job,
    );
  }
  writeLocalStore(store);
}

function mapSupabaseJob(row) {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    format: row.format,
    status: row.status,
    engine: row.engine,
    commandPreview: row.command_preview,
    outputUrl: row.output_url,
    backgroundAssetId: row.background_asset_id,
    logoAssetId: row.logo_asset_id,
    audioAssetId: row.audio_asset_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildFfmpegArgs({ job, project, assets, outputPath }) {
  const clipIds = parseClipIds(job.commandPreview);
  const selectedClips = (project.clips ?? []).filter((clip) => clipIds.length === 0 || clipIds.includes(clip.id));
  const sourceAsset = assets.find((asset) => asset.id === project.sourceAssetId || asset.id === project.analysis?.assetId) ?? null;
  const canSliceSource = Boolean(sourceAsset?.mimeType?.startsWith("video/") && selectedClips.length > 0 && selectedClips.every((clip) => Number.isFinite(clip.startMs) && Number.isFinite(clip.endMs)));

  if (canSliceSource) {
    return buildClipSliceArgs({ job, assets, outputPath, sourceAsset, selectedClips });
  }

  const duration = Math.max(6, (selectedClips.length || project.clips?.length || 3) * 6);
  const background = assets.find((asset) => asset.id === job.backgroundAssetId) ?? null;
  const logo = assets.find((asset) => asset.id === job.logoAssetId) ?? null;
  const audio = assets.find((asset) => asset.id === job.audioAssetId) ?? null;

  const args = ["-y"];
  let nextInputIndex = 0;

  if (background?.mimeType.startsWith("image/")) {
    args.push("-loop", "1", "-framerate", "30", "-i", background.storagePath);
  } else if (background?.mimeType.startsWith("video/")) {
    args.push("-stream_loop", "-1", "-i", background.storagePath);
  } else {
    args.push("-f", "lavfi", "-i", `color=c=0x050612:s=1080x1920:d=${duration}`);
  }
  const backgroundIndex = nextInputIndex++;

  let logoIndex = null;
  if (logo) {
    args.push("-i", logo.storagePath);
    logoIndex = nextInputIndex++;
  }

  let audioIndex = null;
  if (audio) {
    args.push("-stream_loop", "-1", "-i", audio.storagePath);
    audioIndex = nextInputIndex++;
  }

  const filters = [];
  let currentLabel = "v0";
  filters.push(`[${backgroundIndex}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[${currentLabel}]`);

  const clips = (selectedClips.length > 0 ? selectedClips : (project.clips ?? [])).slice(0, 10);
  clips.forEach((clip, index) => {
    const nextLabel = `v${index + 1}`;
    const text = escapeDrawtext(clip.text || clip.overlay || `Clip ${index + 1}`);
    const enableStart = index * 6;
    const enableEnd = Math.min(duration, enableStart + 6);
    const fontClause = fontPath ? `fontfile='${fontPath}':` : "";
    filters.push(
      `[${currentLabel}]drawtext=${fontClause}text='${text}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h*0.76:box=1:boxcolor=black@0.35:boxborderw=28:enable='between(t,${enableStart},${enableEnd})'[${nextLabel}]`,
    );
    currentLabel = nextLabel;
  });

  if (logoIndex !== null) {
    const scaledLogo = `logoScaled`;
    const nextLabel = `vLogo`;
    filters.push(`[${logoIndex}:v]scale=180:-1[${scaledLogo}]`);
    filters.push(`[${currentLabel}][${scaledLogo}]overlay=W-w-48:48[${nextLabel}]`);
    currentLabel = nextLabel;
  }

  args.push("-filter_complex", filters.join(";"), "-map", `[${currentLabel}]`);

  if (audioIndex !== null) {
    args.push("-map", `${audioIndex}:a`, "-c:a", "aac", "-b:a", "192k");
  } else {
    args.push("-an");
  }

  args.push(
    "-t",
    String(duration),
    "-r",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    outputPath,
  );

  return args;
}

function buildClipSliceArgs({ job, assets, outputPath, sourceAsset, selectedClips }) {
  const args = ["-y", "-i", sourceAsset.storagePath];
  const backgroundAudio = assets.find((asset) => asset.id === job.audioAssetId && asset.mimeType.startsWith("audio/")) ?? null;
  if (backgroundAudio) {
    args.push("-stream_loop", "-1", "-i", backgroundAudio.storagePath);
  }

  const filters = [];
  selectedClips.forEach((clip, index) => {
    const start = Math.max(0, Number(clip.startMs || 0) / 1000);
    const end = Math.max(start + 0.2, Number(clip.endMs || clip.startMs || 0) / 1000);
    filters.push(`[0:v]trim=start=${start.toFixed(3)}:end=${end.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v${index}]`);
  });

  const concatInputs = selectedClips.map((_clip, index) => `[v${index}]`).join("");
  filters.push(`${concatInputs}concat=n=${selectedClips.length}:v=1:a=0[vcat]`);

  args.push("-filter_complex", filters.join(";"), "-map", "[vcat]");

  if (backgroundAudio) {
    args.push("-map", "1:a", "-shortest", "-c:a", "aac", "-b:a", "192k");
  } else {
    args.push("-an");
  }

  args.push("-r", "30", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart", outputPath);
  return args;
}

function parseClipIds(commandPreview) {
  const match = String(commandPreview || "").match(/-clips\s+([0-9,]+)/);
  if (!match) {
    return [];
  }

  return match[1].split(",").map((value) => value.trim()).filter(Boolean);
}

function escapeDrawtext(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function runFfmpeg(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function runFfmpegWithRetry(args, { attempts, timeoutMs, onRetry }) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runFfmpeg(args, timeoutMs);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) {
        break;
      }

      onRetry?.({
        attempt,
        message: error instanceof Error ? error.message : "Unknown ffmpeg error",
      });
      await sleep(Math.min(8_000, 500 * 2 ** attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ffmpeg failed after retries");
}

function logInfo(message, context = {}) {
  console.log(JSON.stringify({ at: new Date().toISOString(), level: "info", message, ...context }));
}

function logWarn(message, context = {}) {
  console.warn(JSON.stringify({ at: new Date().toISOString(), level: "warn", message, ...context }));
}

function logError(message, context = {}) {
  console.error(JSON.stringify({ at: new Date().toISOString(), level: "error", message, ...context }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
