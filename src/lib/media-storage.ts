import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { MediaAssetKind } from "@/lib/types";

const DEFAULT_MEDIA_BUCKET = "media-assets";
const DEFAULT_INLINE_LIMIT_BYTES = 20 * 1024 * 1024;

export async function saveUploadedMediaAsset({
  file,
  userId,
  kind,
}: {
  file: File;
  userId: string;
  kind: MediaAssetKind;
}) {
  const safeName = sanitizeFileName(file.name || `${kind}.bin`);
  const mimeType = file.type || inferMimeTypeFromName(file.name);
  const fileName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const bucket = (process.env.SUPABASE_MEDIA_BUCKET ?? DEFAULT_MEDIA_BUCKET).trim() || DEFAULT_MEDIA_BUCKET;
    const objectPath = `${userId}/${kind}/${fileName}`;
    const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      return {
        fileName,
        mimeType,
        storagePath: `supabase:${bucket}/${objectPath}`,
        publicUrl: data.publicUrl,
      };
    }
  }

  try {
    const folder = join(process.cwd(), "public", "uploads", userId, kind);
    await mkdir(folder, { recursive: true });
    const storagePath = join(folder, fileName);
    await writeFile(storagePath, bytes);

    return {
      fileName,
      mimeType,
      storagePath,
      publicUrl: `/uploads/${userId}/${kind}/${fileName}`,
    };
  } catch {
    const inlineLimit = Number(process.env.MEDIA_INLINE_MAX_BYTES ?? DEFAULT_INLINE_LIMIT_BYTES);
    if (bytes.byteLength > inlineLimit) {
      throw new Error("Upload storage is unavailable. Configure Supabase storage or use a smaller file.");
    }

    return {
      fileName,
      mimeType,
      storagePath: `inline:${userId}/${kind}/${fileName}`,
      publicUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    };
  }
}

export async function removeUploadedMediaAsset(storagePath: string) {
  if (!storagePath) {
    return;
  }

  if (storagePath.startsWith("supabase:")) {
    const locator = storagePath.slice("supabase:".length);
    const separator = locator.indexOf("/");
    if (separator > 0) {
      const bucket = locator.slice(0, separator);
      const objectPath = locator.slice(separator + 1);
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.storage.from(bucket).remove([objectPath]);
      }
    }
    return;
  }

  if (storagePath.startsWith("inline:")) {
    return;
  }

  try {
    await unlink(storagePath);
  } catch {
    // Ignore missing-file errors; metadata deletion should still succeed.
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function inferMimeTypeFromName(value: string) {
  const lower = value.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
