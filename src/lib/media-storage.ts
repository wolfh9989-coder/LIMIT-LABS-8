import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaAssetKind } from "@/lib/types";

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
  const folder = join(process.cwd(), "public", "uploads", userId, kind);
  await mkdir(folder, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const storagePath = join(folder, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, bytes);

  return {
    fileName,
    mimeType: file.type || inferMimeTypeFromName(file.name),
    storagePath,
    publicUrl: `/uploads/${userId}/${kind}/${fileName}`,
  };
}

export async function removeUploadedMediaAsset(storagePath: string) {
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
