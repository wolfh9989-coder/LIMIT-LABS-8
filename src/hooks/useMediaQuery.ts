import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** ≥1280px */
export function useIsLargeScreen() {
  return useMediaQuery("(min-width: 1280px)");
}

/** ≥768px */
export function useIsMediumScreen() {
  return useMediaQuery("(min-width: 768px)");
}

/** <768px */
export function useIsSmallScreen() {
  return useMediaQuery("(max-width: 767px)");
}
