import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_14%_14%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_82%_26%,rgba(244,114,182,0.12),transparent_36%),#040406] px-4 py-8 text-white">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl animate-[ll8ModulePulse_10s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-pink-400/16 blur-3xl animate-[ll8PanelOrbit_14s_linear_infinite]" />

      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-pink-100">Contact</h1>
          <Link href="/pro" className="rounded-full border border-pink-300/25 px-3 py-1.5 text-xs text-pink-200/90 hover:border-pink-200/45 hover:text-pink-100">Back</Link>
        </div>

        <section className="ll8-module-card ll8-module-fuchsia rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(8,8,14,0.94),rgba(8,6,14,0.96))] p-6 text-sm leading-7 text-white/80">
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200/80">Let&apos;s Connect</p>
          <p className="mt-3 text-base leading-8 text-white/86">
            LIMIT LABS 8 is built for creators and teams who move fast, and we genuinely value direct conversation with the people using the product every day. Whether you are reaching out with a feature request, collaboration idea, account question, or feedback on your current workflow, we are listening and we use these insights to shape what we build next.
          </p>
          <p className="mt-4">
            Reach us at
            {" "}
            <a href="mailto:limitlabs8@gmail.com" className="text-pink-200 underline decoration-pink-300/70 underline-offset-4 hover:text-pink-100 hover:[text-shadow:0_0_12px_rgba(244,114,182,0.72)]">limitlabs8@gmail.com</a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
