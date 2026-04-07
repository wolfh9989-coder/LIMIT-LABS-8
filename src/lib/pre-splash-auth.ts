export const AUTH_GATE_COOKIE = "ll8_auth_gate";
const DEFAULT_AUTH_REDIRECT = "/splash";

function getAuthGateSecret() {
  return (
    process.env.PRE_SPLASH_AUTH_SECRET
    ?? process.env.BETA_ACCESS_CODE
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? "limitlabs8-auth-gate"
  ).trim();
}

export function isAuthGateEnabled() {
  return process.env.PRE_SPLASH_AUTH_GATE !== "false";
}

export function sanitizeAuthRedirectPath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path === "/auth-access") {
    return DEFAULT_AUTH_REDIRECT;
  }

  return path;
}

async function digestToHex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAuthGateCookieValue(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return "";
  }

  const signature = await digestToHex(`limitlabs8-auth:${normalizedUserId}:${getAuthGateSecret()}`);
  return `${normalizedUserId}.${signature}`;
}

export async function hasValidAuthGate(token: string | null | undefined) {
  if (!isAuthGateEnabled()) {
    return true;
  }

  if (!token) {
    return false;
  }

  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) {
    return false;
  }

  const userId = token.slice(0, separator);
  return token === await createAuthGateCookieValue(userId);
}

export function getAuthGateCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
  };
}
