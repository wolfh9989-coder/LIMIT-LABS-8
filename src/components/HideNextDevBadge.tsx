"use client";

import { useEffect } from "react";

function removeNextDevUi() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("nextjs-portal, [id^='__next-dev'], [class*='nextjs-dev'], [data-nextjs-devtools], [data-nextjs-dev-tools-button]"));

  for (const node of candidates) {
    node.remove();
  }

  const customElements = Array.from(document.querySelectorAll<HTMLElement>("*"));
  for (const node of customElements) {
    if (node.tagName.startsWith("NEXTJS-")) {
      node.remove();
    }
  }
}

export function HideNextDevBadge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    removeNextDevUi();

    const observer = new MutationObserver(() => {
      removeNextDevUi();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const interval = window.setInterval(removeNextDevUi, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
