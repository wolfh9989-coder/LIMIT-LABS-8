"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type QAItem = {
  question: string;
  answer: string;
};

type FAQSection = {
  title: string;
  items: QAItem[];
};

const faqSections: FAQSection[] = [
  {
    title: "Making Music",
    items: [
      {
        question: "How does LIMIT LABS 8 support music workflows?",
        answer: "LIMIT LABS 8 lets you upload music and audio files, align captions, build clip timing, and export social-ready content around your track. The platform is focused on fast content production rather than full DAW-style audio engineering.",
      },
      {
        question: "Can I upload my own song and build short-form videos from it?",
        answer: "Yes. Upload your own audio asset, generate or edit supporting text, and use Studio tools to create clips, overlays, and captions matched to the message and pacing of your song.",
      },
      {
        question: "Can I create lyric-style captions for music?",
        answer: "Yes. You can use caption blocks and timing controls to present lyric-style text, hook lines, and callouts that follow the rhythm of your content.",
      },
      {
        question: "What if my music has no vocals?",
        answer: "You can still build effective outputs by using text prompts, hooks, and scene captions. Instrumental tracks are commonly used with visual storytelling and on-screen copy.",
      },
      {
        question: "Does Voice to Text work for songs?",
        answer: "Voice to Text is optimized for spoken-word clarity. It can assist with some music cases, but heavy effects or layered vocals may need manual caption editing for best quality.",
      },
      {
        question: "Can I make multiple content variations from one track?",
        answer: "Yes. The repurpose workflow is built for one input to many outputs. You can produce alternate hooks, caption styles, and clip sequences from the same source asset.",
      },
      {
        question: "How do I keep my music edits organized?",
        answer: "Use projects to group your assets, scripts, and exports by campaign or release. This keeps revisions and creative variants in one working space.",
      },
      {
        question: "Can I export music-backed content directly from LIMIT LABS 8?",
        answer: "Yes, Pro workflows include export features and background render jobs for supported outputs. Final output readiness depends on project settings and account plan.",
      },
      {
        question: "Can I use commercial music I do not own?",
        answer: "Only if you have legal rights or licenses for that music and intended use. You are responsible for rights clearance on all uploaded and published media.",
      },
      {
        question: "What is the best practice for music-first short content?",
        answer: "Start with a strong 1-2 second hook, keep captions readable, align edits to emotional beats, and produce multiple short variants for platform testing.",
      },
    ],
  },
  {
    title: "Accounts & Billing",
    items: [
      {
        question: "Do I need an account to use LIMIT LABS 8?",
        answer: "Some features are accessible in local/development mode, but account-backed usage is required for persistent projects, billing state, and cross-session continuity.",
      },
      {
        question: "What plans are available?",
        answer: "LIMIT LABS 8 includes free and Pro access levels. Free is limited, while Pro unlocks higher clip limits and export-related capabilities.",
      },
      {
        question: "How does subscription billing work?",
        answer: "Billing runs through Stripe subscription checkout. If auto-renew is active, Stripe handles recurring charges based on your subscription schedule.",
      },
      {
        question: "Is my payment method remembered for automatic renewal?",
        answer: "Yes. The checkout flow is configured to support saving payment methods for recurring subscription charges when available through Stripe.",
      },
      {
        question: "Where can I manage payment method or cancel?",
        answer: "Use the Billing Portal from your account billing flow. Stripe hosts payment method updates, invoice access, and subscription cancellation controls.",
      },
      {
        question: "What happens if a renewal payment fails?",
        answer: "Your subscription can move into a past-due or grace state, and entitlement can be reduced if payment is not resolved. Retry payment through billing portal access.",
      },
      {
        question: "Can I get invoice history?",
        answer: "Yes. Billing Summary surfaces recent invoice records and links when available from your billing provider integration.",
      },
      {
        question: "Are payments refundable?",
        answer: "Fees are generally non-refundable unless required by law or explicitly stated in your active terms and billing policies.",
      },
      {
        question: "Can I delete my account and data?",
        answer: "Yes. Account deletion options are available in billing/account flows and can remove subscription-linked access and associated account data according to retention rules.",
      },
      {
        question: "Who do I contact for billing support?",
        answer: "Email limitlabs8@gmail.com with your user ID, issue details, and any relevant timestamps or invoice IDs for faster support.",
      },
    ],
  },
  {
    title: "Mobile App",
    items: [
      {
        question: "Is LIMIT LABS 8 mobile-friendly?",
        answer: "Yes. The interface is designed for mobile-first creation while still supporting larger screens for deeper editing sessions.",
      },
      {
        question: "Can I start on mobile and continue later?",
        answer: "Yes, when authenticated with persistent account storage. Your projects and subscription state can carry across sessions.",
      },
      {
        question: "What mobile actions are most reliable?",
        answer: "Prompt entry, project iteration, caption style selection, and review workflows are strong mobile use cases. Larger exports are best done on stable connections.",
      },
      {
        question: "How can I improve mobile performance?",
        answer: "Use smaller files when testing, close heavy background apps, and keep browser tabs minimal during long editing sessions.",
      },
      {
        question: "Can I upload media directly from my phone?",
        answer: "Yes. Media upload endpoints support workflow files used in caption, repurpose, and export paths.",
      },
      {
        question: "Do caption tools work well on smaller screens?",
        answer: "Yes. Caption controls are structured into focused tabs so you can adjust style, placement, timing, and voice workflows without desktop-only dependency.",
      },
      {
        question: "Does mobile support export job tracking?",
        answer: "Yes. You can monitor export job status from the app flow where export job APIs are integrated.",
      },
      {
        question: "What if the mobile app seems stuck during generation?",
        answer: "Refresh the session, check connection quality, and verify asset upload completion. If issues persist, send your user ID and a reproduction path to support.",
      },
      {
        question: "Can I handle billing from mobile?",
        answer: "Yes. Billing summary and portal access are available through account/billing routes and can be used from mobile browsers.",
      },
      {
        question: "Is there a best mobile workflow?",
        answer: "Start with Input Chamber for source material, draft in Magic Studio, then finalize captions and export. This keeps the path fast and repeatable on mobile.",
      },
    ],
  },
  {
    title: "Rights & Ownership",
    items: [
      {
        question: "Who owns content I upload?",
        answer: "You retain responsibility and ownership rights for your uploads, subject to your legal rights to use that material.",
      },
      {
        question: "Who owns AI-assisted outputs I generate?",
        answer: "Outputs are provided for your use under the Terms. You are responsible for reviewing and clearing rights before commercial publication.",
      },
      {
        question: "Can generated outputs be similar to other users?",
        answer: "Yes. AI-assisted systems can produce similar patterns or phrasing across users. You should review and customize outputs before distribution.",
      },
      {
        question: "Can I upload copyrighted media?",
        answer: "Only if you have permission, license, or ownership rights. Do not upload content you do not have legal authority to use.",
      },
      {
        question: "Can I publish outputs to social platforms?",
        answer: "Yes, provided the underlying assets and claims are lawful and platform compliant. You are responsible for final compliance checks.",
      },
      {
        question: "Does LIMIT LABS 8 give legal advice on ownership?",
        answer: "No. The platform provides tooling, not legal advice. Consult counsel for specific rights questions.",
      },
      {
        question: "Can I use the platform to train a competing AI model?",
        answer: "No. Terms prohibit unauthorized extraction or use of the Service to create competing systems through bypass or scraping methods.",
      },
      {
        question: "How should I handle trademarked names in outputs?",
        answer: "Use caution, verify fair use or permission where needed, and avoid misleading claims about affiliation or endorsement.",
      },
      {
        question: "What about voice and likeness rights?",
        answer: "You are responsible for obtaining consent and rights for any identifiable person whose voice, image, or likeness appears in submitted media.",
      },
      {
        question: "What is the safest publication workflow?",
        answer: "Verify ownership, fact-check claims, remove unauthorized assets, and run a final policy review before export and posting.",
      },
    ],
  },
  {
    title: "Input Chamber",
    items: [
      {
        question: "What is Input Chamber in LIMIT LABS 8?",
        answer: "Input Chamber is the intake layer where you feed source material such as links, transcript text, concepts, and uploaded media for downstream creation.",
      },
      {
        question: "What input types work best?",
        answer: "Clear source text, structured ideas, and complete media context perform best. Include audience, goal, and tone for stronger outputs.",
      },
      {
        question: "Can I start with only a rough idea?",
        answer: "Yes. You can begin with minimal input and iterate quickly, then refine prompts and assets as the project develops.",
      },
      {
        question: "How should I structure prompts for better output quality?",
        answer: "Use concise objectives, platform target, audience angle, and hard constraints such as clip count or caption style.",
      },
      {
        question: "How does Input Chamber connect to Magic Studio?",
        answer: "Input Chamber provides the source context. Magic Studio transforms that context into editable scripts, clips, overlays, and platform-ready variants.",
      },
      {
        question: "Can I mix text input and uploaded assets?",
        answer: "Yes. Mixed input usually improves creative control because strategy text and media files can inform each other in generation steps.",
      },
      {
        question: "What if my output looks too generic?",
        answer: "Add stronger constraints and brand voice details in Input Chamber, then regenerate with explicit hooks, tone, and audience intent.",
      },
      {
        question: "Can I reuse previous prompt patterns?",
        answer: "Yes. Reusable prompt formulas are recommended for consistency across campaigns and to speed up iteration.",
      },
      {
        question: "Does Input Chamber store my data?",
        answer: "Input and project data can be stored as part of normal service operation depending on your account mode and configured providers.",
      },
      {
        question: "What is a good first-time Input Chamber workflow?",
        answer: "Start with one clear objective, one core source, and a defined platform output target, then iterate before scaling to multi-output packs.",
      },
    ],
  },
  {
    title: "Magic Studio",
    items: [
      {
        question: "What does Magic Studio do?",
        answer: "Magic Studio is the transformation workspace where source input becomes structured content outputs, including scripts, clips, and social variants.",
      },
      {
        question: "How is Magic Studio different from Input Chamber?",
        answer: "Input Chamber gathers context. Magic Studio performs creative transformation, editing, and output shaping.",
      },
      {
        question: "Can I generate multiple outputs from one source in Magic Studio?",
        answer: "Yes. Multi-variant generation is a core design goal so one source can become several platform-specific assets.",
      },
      {
        question: "Can Magic Studio help with hooks and post copy?",
        answer: "Yes. Hook ideation and short-form messaging are key use cases for quick publishing cycles.",
      },
      {
        question: "How do I keep brand voice consistent in Magic Studio?",
        answer: "Use stable prompt framing, repeat tone constraints, and apply structured editing passes before export.",
      },
      {
        question: "Can I connect Magic Studio output to caption editing?",
        answer: "Yes. Generated text and clip concepts can be refined in caption and timing tools for final delivery quality.",
      },
      {
        question: "What should I do if output quality drops?",
        answer: "Reduce prompt ambiguity, tighten constraints, and regenerate with explicit platform format instructions.",
      },
      {
        question: "Does Magic Studio replace manual editing?",
        answer: "No. It accelerates creation, but high-quality results still benefit from manual editorial review and factual checks.",
      },
      {
        question: "Can I use Magic Studio for campaign batching?",
        answer: "Yes. It is effective for batch generation where one campaign theme needs multiple clip and copy variations.",
      },
      {
        question: "What is the best Magic Studio workflow for speed?",
        answer: "Generate fast drafts first, shortlist high-performing directions, and then deepen only the winners for production.",
      },
    ],
  },
  {
    title: "Community Resources",
    items: [
      {
        question: "Where can I learn best practices for LIMIT LABS 8?",
        answer: "Use Help, What's New, and direct support channels for current workflows, release notes, and setup guidance.",
      },
      {
        question: "How should teams collaborate with LIMIT LABS 8 outputs?",
        answer: "Share project context, prompt templates, and approved style frameworks so teams can produce consistent outputs across campaigns.",
      },
      {
        question: "Can I submit feature ideas from the community?",
        answer: "Yes. Use the Feedback page and include clear use cases, expected outcome, and why the feature matters for creator workflow.",
      },
      {
        question: "How do I report bugs effectively?",
        answer: "Include user ID, route/page, reproduction steps, expected behavior, actual behavior, and screenshots or logs if available.",
      },
      {
        question: "What support information helps fastest resolution?",
        answer: "Provide timestamps, billing context if relevant, and asset IDs or project IDs linked to the issue.",
      },
      {
        question: "How can I keep up with product updates?",
        answer: "Use the What's New page and service notices to monitor feature additions, behavior changes, and release-related guidance.",
      },
      {
        question: "Is there a recommended onboarding sequence for new users?",
        answer: "Start with Input Chamber fundamentals, then Magic Studio iteration, then caption/timing polish and export review.",
      },
      {
        question: "Can educators or teams use LIMIT LABS 8 for structured training?",
        answer: "Yes. The product supports repeatable prompt workflows and revision loops that are useful for coaching and content operations training.",
      },
      {
        question: "How can community feedback improve the roadmap?",
        answer: "Actionable feedback with clear workflows and measurable outcomes helps prioritize features that improve creator performance.",
      },
      {
        question: "Where do I contact LIMIT LABS 8 directly?",
        answer: "Email limitlabs8@gmail.com for support, product questions, billing issues, and collaboration inquiries.",
      },
    ],
  },
];

export default function HelpPage() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  const activeSection = useMemo(
    () => faqSections.find((section) => section.title === openCategory) ?? null,
    [openCategory],
  );

  const neonTones = [
    "border-cyan-300/35 shadow-[0_0_24px_rgba(34,211,238,0.22)]",
    "border-fuchsia-300/35 shadow-[0_0_24px_rgba(217,70,239,0.22)]",
    "border-emerald-300/35 shadow-[0_0_24px_rgba(16,185,129,0.22)]",
    "border-pink-300/35 shadow-[0_0_24px_rgba(244,114,182,0.22)]",
  ] as const;

  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-[430px] space-y-4 sm:max-w-5xl sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-pink-100 sm:text-2xl">Help</h1>
          <Link href="/pro" className="rounded-full border border-pink-300/25 px-3 py-1.5 text-xs text-pink-200/90 hover:border-pink-200/45 hover:text-pink-100">Back</Link>
        </div>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          <p>Welcome to LIMIT LABS 8 Help. Below are detailed category guides in Q&A form to help you move faster across creation, billing, ownership, and production workflows.</p>
          <p className="mt-3">For account-level support, email <a href="mailto:limitlabs8@gmail.com" className="text-pink-200 underline decoration-pink-300/70 underline-offset-4 hover:text-pink-100 hover:[text-shadow:0_0_12px_rgba(244,114,182,0.72)]">limitlabs8@gmail.com</a> with your user ID and issue details.</p>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {faqSections.map((section, index) => (
            <button
              key={section.title}
              type="button"
              onClick={() => {
                setOpenCategory(section.title);
                setSelectedQuestionIndex(0);
              }}
              className={`rounded-3xl border bg-[linear-gradient(160deg,rgba(6,6,10,0.94),rgba(16,8,20,0.76))] p-4 text-left transition-transform duration-300 hover:-translate-y-0.5 ${neonTones[index % neonTones.length]}`}
            >
              <p className="text-base font-semibold text-pink-100">{section.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/55">{section.items.length} questions</p>
              <p className="mt-3 text-sm text-white/70">Tap to open this category.</p>
            </button>
          ))}
        </div>

        {activeSection ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/78 px-3 py-4 sm:items-center sm:py-6">
            <div className="w-full max-w-[430px] max-h-[92vh] overflow-y-auto rounded-3xl border border-pink-300/30 bg-[linear-gradient(160deg,rgba(9,5,12,0.97),rgba(6,6,10,0.95))] p-4 shadow-[0_0_44px_rgba(244,114,182,0.25)] sm:max-w-4xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-pink-100">{activeSection.title}</h2>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/50">Select a question to read</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenCategory(null)}
                  className="rounded-full border border-pink-300/30 px-3 py-1.5 text-xs text-pink-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr,1.25fr]">
                <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                  {activeSection.items.map((item, idx) => (
                    <button
                      key={item.question}
                      type="button"
                      onClick={() => setSelectedQuestionIndex(idx)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selectedQuestionIndex === idx
                          ? "border-pink-300/40 bg-pink-500/12 text-pink-100"
                          : "border-white/10 bg-black/30 text-white/76"
                      }`}
                    >
                      Q{idx + 1}. {item.question}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-sm font-semibold text-white">Q: {activeSection.items[selectedQuestionIndex]?.question}</p>
                  <p className="mt-3 text-sm leading-7 text-white/82">A: {activeSection.items[selectedQuestionIndex]?.answer}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
