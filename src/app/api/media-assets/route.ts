import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveProtectedIdentity } from "@/lib/auth";
import { deleteMemoryMediaAsset, getMemoryMediaAssets, saveMemoryMediaAsset } from "@/lib/memory-store";
import { removeUploadedMediaAsset, saveUploadedMediaAsset } from "@/lib/media-storage";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { MediaAsset, MediaAssetKind } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ assets: getMemoryMediaAssets(identity.userId) });
  }

  const { data, error } = await supabase
    .from("media_assets")
    .select("id,user_id,kind,file_name,mime_type,storage_path,public_url,created_at")
    .eq("user_id", identity.userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: "Failed to load media assets" }, { status: 500 });
  }

  const assets: MediaAsset[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    fileName: row.file_name,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const fallbackUserId = String(formData.get("userId") ?? "").trim();
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const kind = String(formData.get("kind") ?? "background") as MediaAssetKind;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File upload is required" }, { status: 400 });
  }

  if (!["background", "logo", "audio", "video"].includes(kind)) {
    return NextResponse.json({ error: "Invalid asset kind" }, { status: 400 });
  }

  let stored: Awaited<ReturnType<typeof saveUploadedMediaAsset>>;
  try {
    stored = await saveUploadedMediaAsset({
      file,
      userId: identity.userId,
      kind,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store media upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const asset: MediaAsset = {
    id: randomUUID(),
    userId: identity.userId,
    kind,
    fileName: stored.fileName,
    mimeType: stored.mimeType,
    storagePath: stored.storagePath,
    publicUrl: stored.publicUrl,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    saveMemoryMediaAsset(identity.userId, asset);
    return NextResponse.json({ asset });
  }

  const { error } = await supabase.from("media_assets").insert({
    id: asset.id,
    user_id: asset.userId,
    kind: asset.kind,
    file_name: asset.fileName,
    mime_type: asset.mimeType,
    storage_path: asset.storagePath,
    public_url: asset.publicUrl,
    created_at: asset.createdAt,
  });

  if (error) {
    await removeUploadedMediaAsset(stored.storagePath);
    return NextResponse.json({ error: "Failed to save media asset metadata" }, { status: 500 });
  }

  return NextResponse.json({ asset });
}

export async function DELETE(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { userId?: string; assetId?: string };
  const fallbackUserId = String(payload.userId ?? "").trim();
  const assetId = String(payload.assetId ?? "").trim();
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const deleted = deleteMemoryMediaAsset(identity.userId, assetId);
    if (!deleted) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (deleted.storagePath) {
      await removeUploadedMediaAsset(deleted.storagePath);
    }

    return NextResponse.json({ ok: true, assetId });
  }

  const { data: existing, error: existingError } = await supabase
    .from("media_assets")
    .select("id,user_id,storage_path")
    .eq("id", assetId)
    .eq("user_id", identity.userId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Failed to load media asset" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", assetId)
    .eq("user_id", identity.userId);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete media asset" }, { status: 500 });
  }

  if (existing.storage_path) {
    await removeUploadedMediaAsset(existing.storage_path);
  }

  return NextResponse.json({ ok: true, assetId });
}
