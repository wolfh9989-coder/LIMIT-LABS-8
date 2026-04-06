import { NextResponse } from "next/server";
import { resolveRequestIdentity } from "@/lib/auth";
import { getOrCreateAccountCode } from "@/lib/account-code";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";

  const identity = await resolveRequestIdentity(request, fallbackUserId);
  if (!identity.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const account = await getOrCreateAccountCode({ userId: identity.userId, email: identity.email });

  return NextResponse.json({
    userId: identity.userId,
    accountCode: account.accountCode,
    isOwner: account.isOwner,
  });
}
