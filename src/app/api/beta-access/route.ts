import { NextResponse } from "next/server";
import { createBetaAccessCookieValue, getBetaAccessCode, getBetaCookieOptions, isBetaGateEnabled, sanitizeBetaRedirectPath, BETA_ACCESS_COOKIE } from "@/lib/beta-gate";

type AccessRequestBody = {
  code?: string;
  next?: string;
};

export async function POST(request: Request) {
  if (!isBetaGateEnabled()) {
    return NextResponse.json({ error: "Beta gate is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as AccessRequestBody;
    const submittedCode = body.code?.trim() ?? "";

    if (!submittedCode || submittedCode !== getBetaAccessCode()) {
      return NextResponse.json({ error: "Incorrect beta access code." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, next: sanitizeBetaRedirectPath(body.next) });
    response.cookies.set(BETA_ACCESS_COOKIE, await createBetaAccessCookieValue(submittedCode), getBetaCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BETA_ACCESS_COOKIE, "", {
    ...getBetaCookieOptions(),
    maxAge: 0,
  });
  return response;
}