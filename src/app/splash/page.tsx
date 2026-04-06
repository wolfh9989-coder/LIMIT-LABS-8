"use client";

import { useRouter } from "next/navigation";
import { CinematicSplash } from "@/components/CinematicSplash";

export default function SplashPreviewPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black">
      <CinematicSplash onComplete={() => router.replace("/")} />
    </main>
  );
}
