import { NextResponse } from "next/server";
import { resolveProtectedIdentity } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account-cleanup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; confirm?: boolean };
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");
    if (!identity?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!body.confirm) {
      return NextResponse.json({ error: "Deletion confirmation required" }, { status: 400 });
    }

    await deleteUserAccount(identity.userId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete account" }, { status: 500 });
  }
}