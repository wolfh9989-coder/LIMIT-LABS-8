export function isVercelDeployment() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

export function allowLocalProcessExecution() {
  if (!isVercelDeployment()) {
    return true;
  }

  return process.env.ALLOW_LOCAL_PROCESS_EXECUTION_ON_VERCEL === "true";
}

export function resolveAppUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (!request) {
    return "http://localhost:3000";
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`.replace(/\/$/, "");
}

export function isLocalOnlyHost(host: string) {
  const normalized = host.trim().toLowerCase();
  return normalized.includes("127.0.0.1") || normalized.includes("localhost") || normalized.includes("0.0.0.0");
}

export function canUseOllamaHost(host: string) {
  if (!isVercelDeployment()) {
    return true;
  }

  return !isLocalOnlyHost(host);
}
