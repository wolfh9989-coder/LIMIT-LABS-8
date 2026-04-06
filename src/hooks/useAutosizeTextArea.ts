import { useLayoutEffect, useRef } from "react";

interface UseAutosizeTextAreaProps {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  maxHeight?: number;
  borderWidth?: number;
  dependencies: React.DependencyList;
}

export function useAutosizeTextArea({
  ref,
  maxHeight = Number.MAX_SAFE_INTEGER,
  borderWidth = 0,
  dependencies,
}: UseAutosizeTextAreaProps) {
  const originalHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const borderAdjustment = borderWidth * 2;

    if (originalHeight.current === null) {
      originalHeight.current = el.scrollHeight - borderAdjustment;
    }

    el.style.removeProperty("height");
    const scrollHeight = el.scrollHeight;
    const clampedToMax = Math.min(scrollHeight, maxHeight);
    const clampedToMin = Math.max(clampedToMax, originalHeight.current);
    el.style.height = `${clampedToMin + borderAdjustment}px`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxHeight, ref, ...dependencies]);
}
