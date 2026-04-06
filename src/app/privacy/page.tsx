import Link from "next/link";
import type { ReactNode } from "react";

const contactEmail = "limitlabs8@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-[430px] space-y-4 sm:max-w-4xl sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-pink-100 sm:text-2xl">Privacy Notice</h1>
          <Link
            href="/pro"
            className="rounded-full border border-pink-300/25 px-3 py-1.5 text-xs text-pink-200/90 transition-colors hover:border-pink-200/45 hover:text-pink-100"
          >
            Back
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/72">Last Modified: April 3, 2026</p>
          <p className="mt-4 text-sm leading-7 text-white/80">
            This Privacy Notice explains how LIMIT LABS 8 ("LIMIT LABS 8," "we," "our," and "us") collects, uses, shares, stores, and protects your information when you use our websites, applications, APIs, and related services (collectively, the "Services"). It also explains your choices and rights regarding your information.
          </p>
        </section>

        <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          <Section
            title="Overview"
            body="LIMIT LABS 8 provides AI-assisted content and video tooling, including caption editing, repurposing workflows, media uploads, and export features. This notice covers the data we process to run those features. Our Services may link to third-party sites or tools. Those third parties control their own privacy practices, and their policies apply when you use their services."
          />

          <Section
            title="What Information We Collect"
            body="We collect information you provide directly (such as email, profile details, billing form details, support messages, and feedback). We collect account and subscription records (such as user ID, plan, status, customer IDs, and invoice metadata). We collect content and files you submit to the product (such as prompts, transcript text, project content, uploaded audio/video/images, generated outputs, and export job data). We also collect technical and usage data (such as IP address, browser/device information, feature interactions, and logs) to operate and secure the Services."
          />

          <Section
            title="How We Use Your Information"
            body="We use information to provide and improve core product functions, including project management, caption and repurpose workflows, media processing, exports, billing, authentication, and customer support. We use information to maintain security, prevent abuse, troubleshoot failures, enforce limits and terms, and satisfy legal obligations. We may also use service data to monitor performance and improve reliability and product quality."
          />

          <Section
            title="Cookies and Similar Technologies"
            body="We use cookies and similar technologies for essential session handling, security, sign-in state, preference memory, and analytics. You can control cookies in your browser settings, but disabling them may affect sign-in and feature availability."
          />

          <Section
            title="How We Share Your Information"
            body="We do not sell your personal information. We share data with service providers that help us run LIMIT LABS 8, such as infrastructure, authentication, storage, analytics, and payment processing providers. We may disclose information when required by law, to enforce our policies, to protect rights and safety, or as part of a business transaction (such as a merger or acquisition)."
          />

          <Section
            title="How We Store and Secure Your Information"
            body="Data is stored using our operational providers and systems, which may process data in the United States and other regions where those providers operate. We use commercially reasonable safeguards, but no method of transmission or storage is completely secure. You are responsible for protecting your account credentials and access to your devices."
          />

          <Section
            title="How Long We Retain Your Information"
            body="We retain data as long as needed to provide the Services, operate your account, maintain project and billing history, resolve disputes, enforce agreements, and comply with legal obligations. Retention periods vary by data type and legal requirements."
          />

          <Section
            title="How You Can Opt Out, Change, or Delete Your Information"
            body={
              <>
                You may opt out of marketing communications using unsubscribe options or by emailing <EmailLink />. You may request access, correction, or deletion of your information by emailing <EmailLink />. Some data may be retained where required for legal, security, billing, or operational reasons.
              </>
            }
          />

          <Section
            title="Payment Processing"
            body="Payments are processed by third-party payment providers, including Stripe. LIMIT LABS 8 does not store full payment card numbers on its own servers. Billing records such as subscription status, invoice metadata, and customer identifiers are stored to manage subscriptions and account access."
          />

          <Section
            title="Rights of U.S. Residents"
            body={
              <>
                Depending on your U.S. state of residence, you may have rights to access, correct, delete, or obtain information about processing of your personal data. To submit a request, email <EmailLink />. We may verify identity before fulfilling requests and will respond according to applicable law.
              </>
            }
          />

          <Section
            title="Rights of EEA and UK Residents"
            body={
              <>
                If you are in the EEA or UK, you may have rights including access, correction, deletion, portability, restriction, objection, and withdrawal of consent where processing relies on consent. To exercise rights, contact <EmailLink />. We respond within required legal timelines.
              </>
            }
          />

          <Section
            title="Other Important Privacy Information"
            body="Our Services are not directed to children under 13, and we do not knowingly collect personal information from children under 13. If we learn such data was collected, we will take steps to delete it. If you use audio-related features (such as transcription workflows), we process related audio/text data to provide requested functionality."
          />

          <Section
            title="Changes to This Privacy Notice"
            body="We may update this Privacy Notice from time to time. We will post updates with a revised date. Continued use of the Services after updates means you accept the revised notice."
          />

          <Section
            title="Contact"
            body={
              <>
                If you have any questions or concerns regarding this Privacy Notice, please contact us at <EmailLink />.
              </>
            }
          />
        </section>
      </div>
    </main>
  );
}

function EmailLink() {
  return (
    <a
      href={`mailto:${contactEmail}`}
      className="text-pink-200 underline decoration-pink-300/70 underline-offset-4 transition-all hover:text-pink-100 hover:[text-shadow:0_0_12px_rgba(244,114,182,0.72)]"
    >
      {contactEmail}
    </a>
  );
}

function Section({ title, body }: { title: string; body: ReactNode }) {
  return (
    <article>
      <h2 className="text-base font-semibold text-pink-100">{title}</h2>
      <p className="mt-2">{body}</p>
    </article>
  );
}