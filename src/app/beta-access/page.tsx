import Image from "next/image";
import { BetaAccessForm } from "@/components/BetaAccessForm";

const particles = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  left: `${(index * 17) % 100}%`,
  top: `${(index * 29) % 100}%`,
  size: 6 + ((index * 11) % 18),
  delay: (index % 7) * 0.35,
  duration: 3.8 + (index % 5) * 0.9,
  opacity: 0.16 + (index % 4) * 0.08,
}));

const rails = [
  { left: "6%", top: "14%", width: "32%", rotate: "-18deg" },
  { right: "8%", top: "18%", width: "28%", rotate: "16deg" },
  { left: "12%", bottom: "16%", width: "26%", rotate: "12deg" },
  { right: "10%", bottom: "12%", width: "30%", rotate: "-14deg" },
];

function normalizeNextTarget(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path === "/beta-access") {
    return "/splash";
  }

  return path;
}

export default async function BetaAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextTarget = normalizeNextTarget(params.next ?? null);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(217,70,239,0.16),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.12),transparent_36%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "72px 72px" }} />

      {rails.map((rail, index) => (
        <div
          key={index}
          className="absolute h-px rounded-full bg-gradient-to-r from-transparent via-cyan-300/85 to-transparent blur-[1px]"
          style={{
            ...rail,
            animation: `ll8Drift ${5.2 + index * 0.8}s ease-in-out ${index * 0.2}s infinite`,
            boxShadow: "0 0 18px rgba(34,211,238,0.24)",
          }}
        />
      ))}

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute rounded-full bg-cyan-300"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            boxShadow: "0 0 24px rgba(34,211,238,0.5), 0 0 36px rgba(217,70,239,0.18)",
            animation: `ll8Float ${particle.duration}s ease-in-out ${particle.delay}s infinite, ll8Pulse ${particle.duration * 0.7}s ease-in-out ${particle.delay}s infinite`,
          }}
        />
      ))}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <section className="w-full max-w-xl overflow-hidden rounded-[30px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(4,9,19,0.95),rgba(2,4,11,0.98))] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <div className="relative p-8 sm:p-10">
            <div className="mx-auto mb-7 flex w-full max-w-[280px] justify-center">
              <div className="relative animate-[ll8Float_4.8s_ease-in-out_infinite]">
                <div className="absolute inset-4 rounded-[32px] bg-cyan-300/18 blur-3xl" />
                <div className="absolute inset-0 translate-y-4 rounded-[32px] bg-black/55 blur-2xl" />
                <Image
                  src="/images/futuristic-limit-labs-logo.png"
                  alt="Futuristic LIMIT LABS logo design"
                  width={280}
                  height={280}
                  priority
                  className="relative h-auto w-full rounded-[32px] border border-cyan-300/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] shadow-[0_18px_40px_rgba(0,0,0,0.58),0_0_34px_rgba(34,211,238,0.22),0_0_72px_rgba(217,70,239,0.12)]"
                />
              </div>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-300/72">Private Beta Access</p>
              <h1 className="font-display text-3xl font-semibold tracking-[0.08em] sm:text-4xl">
                <span className="bg-[linear-gradient(90deg,#f4f8ff_0%,#8be9ff_32%,#7dd3fc_48%,#d8b4fe_72%,#f4f8ff_100%)] bg-[length:220%_100%] bg-clip-text text-transparent [text-shadow:0_0_18px_rgba(34,211,238,0.18)] animate-[ll8TitleSweep_4.6s_linear_infinite,ll8TitleGlow_3s_ease-in-out_infinite]">
                  Unlock LIMIT LABS
                </span>{" "}
                <span className="text-cyan-300 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)] animate-[ll8Spark_1.8s_ease-in-out_infinite]">
                  8
                </span>
              </h1>
              <p className="mx-auto max-w-md text-sm leading-6 text-white/64 sm:text-[15px]">
                Enter the current access code to continue.
              </p>
            </div>

            <BetaAccessForm nextTarget={nextTarget} />

            <div className="mt-6 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-white/34">
              <span>Temporary Gate</span>
              <span>Blackout Access Layer</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}