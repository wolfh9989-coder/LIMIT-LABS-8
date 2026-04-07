import { NextResponse } from "next/server";
import {
  AUTH_GATE_COOKIE,
  createAuthGateCookieValue,
  getAuthGateCookieOptions,
  isAuthGateEnabled,
} from "@/lib/pre-splash-auth";

type SessionBody = {
  userId?: string;
  remember?: boolean;
};

export async function POST(request: Request) {
  if (!isAuthGateEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = (await request.json()) as SessionBody;
    const userId = body.userId?.trim() ?? "";
    const remember = Boolean(body.remember);

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const value = await createAuthGateCookieValue(userId);
    if (!value) {
      return NextResponse.json({ error: "Unable to create auth session." }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_GATE_COOKIE, value, getAuthGateCookieOptions(remember));
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_GATE_COOKIE, "", {
    ...getAuthGateCookieOptions(false),
    maxAge: 0,
  });
  return response;
}
