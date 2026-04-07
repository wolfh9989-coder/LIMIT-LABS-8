import type { AuthIdentity } from "@/lib/types";
import { AUTH_GATE_COOKIE, hasValidAuthGate } from "@/lib/pre-splash-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

function readCookieValue(request: Request, key: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (!cookieHeader) {
    return "";
  }

  for (const part of cookieHeader.split(";")) {
    const segment = part.trim();
    if (!segment.startsWith(`${key}=`)) {
      continue;
    }
    return decodeURIComponent(segment.slice(key.length + 1));
  }

  return "";
}

export async function resolveRequestIdentity(request: Request, fallbackUserId = ""): Promise<AuthIdentity> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabase = getSupabaseAdmin();

  if (token && supabase) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      return {
        userId: data.user.id,
        email: data.user.email ?? null,
        source: "supabase",
      };
    }
  }

  return {
    userId: fallbackUserId,
    email: null,
    source: "local",
  };
}

export async function resolveProtectedIdentity(request: Request, fallbackUserId = "") {
  const identity = await resolveRequestIdentity(request, fallbackUserId);

  if (process.env.NODE_ENV === "production" && identity.source !== "supabase") {
    const normalizedFallbackUserId = fallbackUserId.trim();
    if (!normalizedFallbackUserId) {
      return null;
    }

    const authGateCookie = readCookieValue(request, AUTH_GATE_COOKIE);
    const hasAuthGate = await hasValidAuthGate(authGateCookie);
    if (!hasAuthGate) {
      return null;
    }

    return {
      userId: normalizedFallbackUserId,
      email: null,
      source: "local",
    } satisfies AuthIdentity;
  }

  return identity;
}
