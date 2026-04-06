"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CinematicSplashProps = {
  onComplete: () => void;
  durationMs?: number;
};

export function CinematicSplash({ onComplete, durationMs = 20500 }: CinematicSplashProps) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const completeRef = useRef(false);

  const triggerClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    console.log("[Splash] Triggering close, setting closing=true");
    setClosing(true);
  }, []);

  // When closing, wait for fade to complete then call onComplete
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      if (completeRef.current) return; // Prevent multiple calls
      completeRef.current = true;
      console.log("[Splash] 900ms elapsed, calling onComplete to unmount splash");
      onComplete();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [closing, onComplete]);

  // Listen for the splash HTML signalling completion via postMessage (bonus)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "ll8-splash-done") {
        console.log("[Splash React] Received ll8-splash-done postMessage");
        triggerClose();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [triggerClose]);

  // Primary: auto-complete after durationMs - this is the reliable fallback that works on all devices
  useEffect(() => {
    const timer = window.setTimeout(() => {
      console.log("[Splash React] Timer fired, closing splash");
      triggerClose();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, triggerClose]);

  // If fully closed (onComplete called), return nothing to unmount completely from DOM
  if (completeRef.current) {
    console.log("[Splash] Fully unmounted from DOM");
    return null;
  }

  return (
    <div className={`ll8-splash ${closing ? "ll8-splash--closing" : ""}`}>
      <div className="ll8-splash__phone">
        <iframe
          className="ll8-splash__iframe"
          src="/splash/limit-labs-play-button.html"
          title="LIMIT LABS 8 Splash"
          allow="autoplay"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}





