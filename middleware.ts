import { NextRequest, NextResponse } from "next/server";
import { BETA_ACCESS_COOKIE, hasValidBetaAccess, isBetaGateEnabled, sanitizeBetaRedirectPath } from "@/lib/beta-gate";
import {
  AUTH_GATE_COOKIE,
  hasValidAuthGate,
  isAuthGateEnabled,
  sanitizeAuthRedirectPath,
} from "@/lib/pre-splash-auth";

function isPublicPath(pathname: string) {
  if (pathname === "/beta-access" || pathname === "/auth-access") {
    return true;
  }

  if (
    pathname.startsWith("/_next/")
    || pathname.startsWith("/api/")
    || pathname.startsWith("/images/")
    || pathname.startsWith("/splash/")
  ) {
    return true;
  }

  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return true;
  }

  return /\.[a-z0-9]+$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestedPath = pathname === "/" ? "/splash" : `${pathname}${request.nextUrl.search}`;
  const betaUnlocked = await hasValidBetaAccess(request.cookies.get(BETA_ACCESS_COOKIE)?.value ?? null);

  if (isBetaGateEnabled()) {
    const betaNextPath = pathname === "/" && isAuthGateEnabled() ? "/auth-access" : requestedPath;

    if (pathname === "/beta-access") {
      if (!betaUnlocked) {
        return NextResponse.next();
      }

      const nextPath = sanitizeBetaRedirectPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    if (pathname === "/auth-access" && !betaUnlocked) {
      const gateUrl = new URL("/beta-access", request.url);
      gateUrl.searchParams.set("next", "/auth-access");
      return NextResponse.redirect(gateUrl);
    }

    if (!isPublicPath(pathname) && !betaUnlocked) {
      const gateUrl = new URL("/beta-access", request.url);
      gateUrl.searchParams.set("next", sanitizeBetaRedirectPath(betaNextPath));
      return NextResponse.redirect(gateUrl);
    }
  }

  if (!isAuthGateEnabled()) {
    return NextResponse.next();
  }

  const authUnlocked = await hasValidAuthGate(request.cookies.get(AUTH_GATE_COOKIE)?.value ?? null);
  if (pathname === "/auth-access") {
    if (!authUnlocked) {
      return NextResponse.next();
    }

    const nextPath = sanitizeAuthRedirectPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (isPublicPath(pathname) || authUnlocked) {
    return NextResponse.next();
  }

  const gateUrl = new URL("/auth-access", request.url);
  gateUrl.searchParams.set("next", sanitizeAuthRedirectPath(requestedPath));
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/:path*"],
};