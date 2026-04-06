import { NextResponse } from "next/server";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getMemoryJobs } from "@/lib/memory-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ExportJob } from "@/lib/types";

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const job = getMemoryJobs(identity.userId).find((entry) => entry.id === jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  }

  const { data, error } = await supabase
    .from("export_jobs")
    .select("id,user_id,project_id,format,status,engine,command_preview,output_url,background_asset_id,logo_asset_id,audio_asset_id,error_message,created_at,updated_at")
    .eq("id", jobId)
    .eq("user_id", identity.userId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job: ExportJob = {
    id: data.id,
    userId: data.user_id,
    projectId: data.project_id,
    format: data.format,
    status: data.status,
    engine: data.engine,
    commandPreview: data.command_preview,
    outputUrl: data.output_url,
    backgroundAssetId: data.background_asset_id,
    logoAssetId: data.logo_asset_id,
    audioAssetId: data.audio_asset_id,
    clipIds: parseClipIds(data.command_preview),
    errorMessage: data.error_message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return NextResponse.json({ job });
}

function parseClipIds(commandPreview: string) {
  const match = commandPreview.match(/-clips\s+([0-9,]+)/);
  if (!match) {
    return [];
  }

  return match[1].split(",").map((value) => value.trim()).filter(Boolean);
}
