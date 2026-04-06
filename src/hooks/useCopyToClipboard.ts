import { useCallback, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

export function useCopyToClipboard(resetMs = 2000) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }

    timerRef.current = setTimeout(() => setStatus("idle"), resetMs);
  }, [resetMs]);

  return { status, copy, isCopied: status === "copied" };
}
