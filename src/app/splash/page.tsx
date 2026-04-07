"use client";

import { useRouter } from "next/navigation";
import { CinematicSplash } from "@/components/CinematicSplash";

const splashSeenKey = "limitlabs8.splash_seen_v2";

export default function SplashPreviewPage() {
  const router = useRouter();

  const completeSplash = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(splashSeenKey, "1");
      } catch {
        // Ignore storage failures and continue to home.
      }
    }
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-black">
      <CinematicSplash onComplete={completeSplash} />
    </main>
  );
}
