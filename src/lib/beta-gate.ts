export const BETA_ACCESS_COOKIE = "ll8_beta_access";
function getDefaultBetaRedirect() {
  return process.env.PRE_SPLASH_AUTH_GATE === "false" ? "/splash" : "/auth-access";
}

export function getBetaAccessCode() {
  return process.env.BETA_ACCESS_CODE?.trim() ?? "";
}

export function isBetaGateEnabled() {
  return getBetaAccessCode().length > 0;
}

export function sanitizeBetaRedirectPath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path === "/beta-access") {
    return getDefaultBetaRedirect();
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

export async function createBetaAccessCookieValue(code: string = getBetaAccessCode()) {
  if (!code) {
    return "";
  }

  return digestToHex(`limitlabs8-beta:${code}`);
}

export async function hasValidBetaAccess(token: string | null | undefined) {
  if (!isBetaGateEnabled()) {
    return true;
  }

  if (!token) {
    return false;
  }

  return token === await createBetaAccessCookieValue();
}

export function getBetaCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}