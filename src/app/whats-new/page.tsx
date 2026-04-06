import Link from "next/link";

const releaseDate = "April 3, 2026";

const releases = [
  {
    title: "Caption Studio Upgrade",
    version: "v2.4",
    notes: [
      "Caption editing panels were redesigned with clearer controls across Styles, Fonts, Captions, Voice, Placement, Colors, Manual, and Timing.",
      "Category, tab, and preset selection flows were tuned for faster browsing and reduced misclicks during mobile editing.",
      "The preview viewer now supports explicit aspect mode control for 9:16 and 16:9 production workflows.",
      "The viewer background was simplified to true black to improve caption contrast while reviewing text treatments.",
    ],
  },
  {
    title: "Timeline and Cut Workflow",
    version: "v2.3",
    notes: [
      "A Cut tool was added as a first-class quick edit action so users can drop cut points directly at the playhead.",
      "Transition mapping now follows cut points, allowing users to reason about clip-to-clip transitions more clearly.",
      "Timeline indicators show cut positions visually in preview controls for faster sequence verification.",
      "Transition summaries now surface in the UI so users can validate where effects begin and end before export.",
    ],
  },
  {
    title: "Placement Reliability Improvements",
    version: "v2.2",
    notes: [
      "Placement selection now applies exactly to the chosen mode (Bottom, Lower Third, Center, Split, Top + Bottom, Stacked, Left, Right).",
      "Smart placement and manual placement states were reconciled so the active placement reflects what users click.",
      "Placement labels were made human-readable in the UI and active state status was clarified in the panel.",
      "Manual drag adjustments continue to work while preserving the selected base placement logic.",
    ],
  },
  {
    title: "Voice to Text and Captions",
    version: "v2.1",
    notes: [
      "Voice to Text panel copy and structure were simplified to emphasize transcription action and fragment editing.",
      "Transcript fragment cards were upgraded for better readability and easier scan behavior during review.",
      "Caption block editing remains directly accessible after transcription, with style assignment and text correction controls.",
      "Voice workflows continue to support uploaded media as source material for spoken-content caption generation.",
    ],
  },
  {
    title: "Billing, Legal, and Support Surface",
    version: "v2.0",
    notes: [
      "Billing Summary now includes dedicated navigation to Privacy, Terms of Service, Help, Feedback, What's New, About, and Contact.",
      "Privacy Notice and Terms of Service pages were expanded and aligned to LIMIT LABS 8's real product behavior and billing stack.",
      "Contact email links on legal pages are now clickable mailto links and visually highlighted for accessibility.",
      "Support pages were added so users can access feedback intake, guidance, and product information without leaving the app.",
    ],
  },
];

export default function WhatsNewPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.12),transparent_38%),radial-gradient(circle_at_82%_26%,rgba(244,114,182,0.12),transparent_36%),#040406] px-4 py-8 text-white">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-[ll8ModulePulse_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-fuchsia-400/18 blur-3xl animate-[ll8PanelOrbit_14s_linear_infinite]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-90px] h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/12 blur-3xl animate-[ll8ModulePulse_11s_ease-in-out_infinite]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8">
        <div className="ll8-module-card ll8-module-fuchsia rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,7,16,0.92),rgba(6,7,12,0.96))] px-6 py-6 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-pink-200/80">Release Notes</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">What&apos;s New in LIMIT LABS 8</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">A modern, detailed changelog that discloses exactly what features are live, how they behave, and where users should expect improvements in workflow speed, reliability, and output quality.</p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-cyan-200/80">Last updated: {releaseDate}</p>
            </div>
            <Link href="/pro" className="rounded-full border border-pink-300/30 bg-pink-500/10 px-3 py-1.5 text-xs font-medium text-pink-100 hover:border-pink-200/60">Back</Link>
          </div>
        </div>

        <div className="space-y-7">
          {releases.map((entry, index) => {
            const tone = index % 4 === 0 ? "ll8-module-cyan" : index % 4 === 1 ? "ll8-module-fuchsia" : index % 4 === 2 ? "ll8-module-emerald" : "ll8-module-amber";
            return (
              <section key={entry.title} className={`ll8-module-card ${tone} rounded-[28px] border border-white/10 bg-[linear-gradient(150deg,rgba(8,10,18,0.9),rgba(5,7,12,0.95))] px-5 py-6 sm:px-7`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">{entry.title}</h2>
                  <span className="rounded-full border border-pink-300/30 bg-pink-500/12 px-3 py-1 text-xs font-medium tracking-[0.08em] text-pink-100">
                    {entry.version}
                  </span>
                </div>
                <ul className="mt-5 grid grid-cols-1 gap-3 text-sm leading-7 text-white/80">
                  {entry.notes.map((note) => (
                    <li key={note} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="ll8-module-card ll8-module-cyan rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,12,20,0.9),rgba(5,8,14,0.95))] px-5 py-6 sm:px-7">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Disclosure</p>
          <p className="mt-3 text-sm leading-7 text-white/78">These notes are intended to keep users informed about currently available functionality. Feature behavior may continue to evolve as workflows are refined, but the sections above reflect the active product experience available right now.</p>
        </section>
      </div>
    </main>
  );
}
