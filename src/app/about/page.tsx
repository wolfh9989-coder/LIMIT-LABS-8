import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-pink-100">About</h1>
          <Link href="/pro" className="rounded-full border border-pink-300/25 px-3 py-1.5 text-xs text-pink-200/90 hover:border-pink-200/45 hover:text-pink-100">Back</Link>
        </div>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          <p>LIMIT LABS 8 is an AI mobile video and content studio designed to turn one input into a complete multi-platform content pack.</p>
          <p className="mt-3">Core workflows include repurposing, caption customization, media handling, and export support.</p>
        </section>
      </div>
    </main>
  );
}
