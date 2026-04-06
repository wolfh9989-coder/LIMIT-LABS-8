import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import { registerIdempotencyKey } from "@/lib/idempotency";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { getMemoryJobs, saveMemoryJob } from "@/lib/memory-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ExportJob } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    logWarn("export.jobs.get.unauthorized", { fallbackUserId });
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logInfo("export.jobs.get.memory", { userId: identity.userId });
    return NextResponse.json({ jobs: getMemoryJobs(identity.userId) });
  }

  const { data, error } = await supabase
    .from("export_jobs")
    .select("id,user_id,project_id,format,status,engine,command_preview,output_url,background_asset_id,logo_asset_id,audio_asset_id,error_message,created_at,updated_at")
    .eq("user_id", identity.userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    logError("export.jobs.get.failed", { userId: identity.userId, code: error.code, message: error.message });
    return NextResponse.json({ error: "Failed to load export jobs" }, { status: 500 });
  }

  const jobs: ExportJob[] = (data ?? []).map((row) => ({
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
    clipIds: parseClipIds(row.command_preview),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      projectId?: string;
      backgroundAssetId?: string | null;
      logoAssetId?: string | null;
      audioAssetId?: string | null;
      clipIds?: string[];
    };
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");

    if (!identity?.userId || !body.projectId) {
      logWarn("export.jobs.post.invalid_identity_or_project", { hasIdentity: Boolean(identity?.userId), projectId: body.projectId ?? null });
      return NextResponse.json({ error: "Authentication and projectId are required" }, { status: 401 });
    }

    const idempotencyKey = request.headers.get("x-idempotency-key")?.trim() ?? "";
    if (idempotencyKey) {
      const accepted = registerIdempotencyKey(`export-job:${identity.userId}:${idempotencyKey}`, 10 * 60 * 1000);
      if (!accepted) {
        logInfo("export.jobs.post.duplicate", { userId: identity.userId, idempotencyKey });
        return NextResponse.json({ error: "Duplicate request" }, { status: 409 });
      }
    }

    const entitlement = await getEntitlement(identity.userId);
    if (entitlement.plan !== "pro" || !entitlement.canExport) {
      logWarn("export.jobs.post.forbidden", { userId: identity.userId, plan: entitlement.plan, canExport: entitlement.canExport });
      return NextResponse.json({ error: "MP4 render queue is available on Pro plan only" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const job: ExportJob = {
      id: randomUUID(),
      userId: identity.userId,
      projectId: body.projectId,
      format: "mp4",
      status: "queued",
      engine: "ffmpeg-worker",
      commandPreview: buildCommandPreview({
        projectId: body.projectId,
        backgroundAssetId: body.backgroundAssetId ?? null,
        logoAssetId: body.logoAssetId ?? null,
        audioAssetId: body.audioAssetId ?? null,
        clipIds: Array.isArray(body.clipIds) ? body.clipIds : [],
      }),
      outputUrl: null,
      backgroundAssetId: body.backgroundAssetId ?? null,
      logoAssetId: body.logoAssetId ?? null,
      audioAssetId: body.audioAssetId ?? null,
      clipIds: Array.isArray(body.clipIds) ? body.clipIds : [],
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      saveMemoryJob(identity.userId, job);
      logInfo("export.jobs.post.queued_memory", { userId: identity.userId, jobId: job.id, projectId: body.projectId });
      return NextResponse.json({ job });
    }

    const { error } = await supabase.from("export_jobs").insert({
      id: job.id,
      user_id: job.userId,
      project_id: job.projectId,
      format: job.format,
      status: job.status,
      engine: job.engine,
      command_preview: job.commandPreview,
      output_url: job.outputUrl,
      background_asset_id: job.backgroundAssetId,
      logo_asset_id: job.logoAssetId,
      audio_asset_id: job.audioAssetId,
      error_message: job.errorMessage,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    });

    if (error) {
      logError("export.jobs.post.insert_failed", { userId: identity.userId, projectId: body.projectId, code: error.code, message: error.message });
      return NextResponse.json({ error: "Failed to queue export job" }, { status: 500 });
    }

    logInfo("export.jobs.post.queued", { userId: identity.userId, jobId: job.id, projectId: body.projectId });

    return NextResponse.json({ job });
  } catch (error) {
    logError("export.jobs.post.invalid_request", { error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function parseClipIds(commandPreview: string) {
  const match = commandPreview.match(/-clips\s+([0-9,]+)/);
  if (!match) {
    return [];
  }

  return match[1].split(",").map((value) => value.trim()).filter(Boolean);
}

function buildCommandPreview({
  projectId,
  backgroundAssetId,
  logoAssetId,
  audioAssetId,
  clipIds,
}: {
  projectId: string;
  backgroundAssetId: string | null;
  logoAssetId: string | null;
  audioAssetId: string | null;
  clipIds: string[];
}) {
  const parts = ["ffmpeg -y"];

  if (backgroundAssetId) {
    parts.push(`-i <background:${backgroundAssetId}>`);
  } else {
    parts.push("-f lavfi -i color=c=0x050612:s=1080x1920:d=18");
  }

  if (logoAssetId) {
    parts.push(`-i <logo:${logoAssetId}>`);
  }

  if (audioAssetId) {
    parts.push(`-i <audio:${audioAssetId}>`);
  }

  if (clipIds.length > 0) {
    parts.push(`-clips ${clipIds.join(",")}`);
  }

  parts.push(`-filter_complex \"vertical render stack for ${projectId}\"`);
  parts.push(`public/renders/${projectId}.mp4`);
  return parts.join(" ");
}
