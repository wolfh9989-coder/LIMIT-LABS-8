type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function baseLog(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    at: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(message: string, context: LogContext = {}) {
  baseLog("info", message, context);
}

export function logWarn(message: string, context: LogContext = {}) {
  baseLog("warn", message, context);
}

export function logError(message: string, context: LogContext = {}) {
  baseLog("error", message, context);
}
