import { NextResponse } from "next/server";
import { resolveRequestIdentity } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import { getMemorySubscription } from "@/lib/memory-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";
  const identity = await resolveRequestIdentity(request, fallbackUserId);

  if (!identity.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const entitlement = await getEntitlement(identity.userId);

  if (entitlement.plan === "free" && entitlement.status === "inactive") {
    const memory = getMemorySubscription(identity.userId);
    const lifecycle = entitlement.lifecycle;
    return NextResponse.json({
      userId: identity.userId,
      plan: memory.plan,
      status: memory.status,
      canExport: memory.plan === "pro" && lifecycle.canExport,
      lifecycle,
    });
  }

  return NextResponse.json(entitlement);
}
