const seenKeys = new Map<string, number>();

function purgeExpired(nowMs: number) {
  for (const [key, expiresAt] of seenKeys.entries()) {
    if (expiresAt <= nowMs) {
      seenKeys.delete(key);
    }
  }
}

export function registerIdempotencyKey(key: string, ttlMs: number) {
  const now = Date.now();
  purgeExpired(now);

  const existingExpiry = seenKeys.get(key);
  if (typeof existingExpiry === "number" && existingExpiry > now) {
    return false;
  }

  seenKeys.set(key, now + Math.max(1_000, ttlMs));
  return true;
}
