import { NextRequest, NextResponse } from "next/server";
import { BETA_ACCESS_COOKIE, hasValidBetaAccess, isBetaGateEnabled, sanitizeBetaRedirectPath } from "@/lib/beta-gate";

function isPublicPath(pathname: string) {
  if (pathname === "/beta-access") {
    return true;
  }

  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname.startsWith("/images/") || pathname.startsWith("/splash/")) {
    return true;
  }

  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return true;
  }

  return /\.[a-z0-9]+$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  if (!isBetaGateEnabled()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const requestedPath = pathname === "/" ? "/splash" : `${pathname}${request.nextUrl.search}`;
  const unlocked = await hasValidBetaAccess(request.cookies.get(BETA_ACCESS_COOKIE)?.value ?? null);

  if (pathname === "/beta-access") {
    if (!unlocked) {
      return NextResponse.next();
    }

    const nextPath = sanitizeBetaRedirectPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (isPublicPath(pathname) || unlocked) {
    return NextResponse.next();
  }

  const gateUrl = new URL("/beta-access", request.url);
  gateUrl.searchParams.set("next", sanitizeBetaRedirectPath(requestedPath));
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/:path*"],
};