import type { AuthIdentity } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase";

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
    return null;
  }

  return identity;
}
