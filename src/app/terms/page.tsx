import Link from "next/link";
import type { ReactNode } from "react";

const contactEmail = "limitlabs8@gmail.com";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-[430px] space-y-4 sm:max-w-4xl sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-pink-100 sm:text-2xl">Terms of Service</h1>
          <Link
            href="/pro"
            className="rounded-full border border-pink-300/25 px-3 py-1.5 text-xs text-pink-200/90 transition-colors hover:border-pink-200/45 hover:text-pink-100"
          >
            Back
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          <p>Date of Last Revision: April 3, 2026</p>
          <p className="mt-3">
            These Terms of Service ("Terms") govern your access to and use of LIMIT LABS 8 ("LIMIT LABS 8," "we," "us," and "our"), including our websites, applications, APIs, and related tools and features (collectively, the "Service").
          </p>
          <p className="mt-3">
            By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          <Section
            title="Acceptance of These Terms of Service"
            body="We may update these Terms at any time. If we do, we will revise the date above and may provide notice through the Service or other reasonable means. Your continued use of the Service after updated Terms become effective means you accept the updated Terms."
          />

          <Section
            title="Your Privacy"
            body="Your use of the Service is also governed by our Privacy Notice, which describes how we collect, use, and protect information."
          />

          <Section
            title="Additional Terms"
            body="Certain features may be subject to additional terms, policies, or guidelines that are incorporated into these Terms by reference."
          />

          <Section
            title="Access and Use of the Service"
            body="The Service allows users to submit input data, including text, audio, video, images, and other materials ('Submissions'), and to generate output content based on those Submissions ('Output'). Together, Submissions and Output are 'Content.' You are solely responsible for Content you provide or generate. You represent that you have all rights necessary to upload, process, and use your Submissions and that your use does not violate law or third-party rights."
          />

          <Section
            title="Account Registration and Security"
            body="Some features require an account. You agree to provide accurate information and keep credentials secure. You are responsible for all activity under your account and must promptly notify us of any suspected unauthorized access. You must be at least 13 years old to use the Service. If you are under 18, you may use the Service only with parent or guardian permission."
          />

          <Section
            title="Modifications to the Service"
            body="We may modify, suspend, or discontinue all or part of the Service at any time, with or without notice, to the extent permitted by law."
          />

          <Section
            title="User Conduct"
            body="You agree not to use the Service for unlawful, harmful, abusive, deceptive, or fraudulent activity. You may not upload or generate Content that infringes intellectual property or privacy rights, contains malware, violates law, or bypasses security controls. You may not use the Service to build or train competing systems using unauthorized access or extraction methods."
          />

          <Section
            title="Fees and Payments"
            body="Certain features require payment. You agree to provide valid payment details and authorize charges through our payment providers for applicable fees, taxes, and subscription renewals. Subscriptions may renew automatically unless canceled before renewal. Except where required by law, fees are non-refundable."
          />

          <Section
            title="Payment Processing"
            body="Payments are processed by third-party providers, including Stripe. LIMIT LABS 8 does not store full payment card numbers on its own servers. Billing records (for example, subscription status and invoice metadata) are retained to manage account access and billing operations."
          />

          <Section
            title="Intellectual Property Rights"
            body="The Service, including software, design, and related materials, is owned by LIMIT LABS 8 or its licensors and is protected by law. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable right to use the Service for its intended purpose. You may not copy, reverse engineer, distribute, or create derivative works from the Service except as allowed by law or with our written permission."
          />

          <Section
            title="License to Operate the Service"
            body="You grant us a non-exclusive, worldwide, royalty-free license to host, process, reproduce, adapt, and display your Content solely as needed to operate, secure, and improve the Service, provide support, and comply with law. This license ends when your Content is deleted from our active systems, except to the extent retention is required for legal, security, backup, or billing purposes."
          />

          <Section
            title="Output and Similarity"
            body="Because the Service may use AI-assisted systems, generated Output may not be unique and may be similar to output generated for other users."
          />

          <Section
            title="Third-Party Services"
            body="The Service may integrate with or link to third-party services. We are not responsible for third-party services, content, or policies."
          />

          <Section
            title="Termination"
            body="We may suspend or terminate access to the Service if you violate these Terms or if necessary to protect the Service, users, or legal compliance. You may stop using the Service at any time."
          />

          <Section
            title="Disclaimer of Warranties"
            body="The Service is provided 'as is' and 'as available' without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement, to the maximum extent permitted by law."
          />

          <Section
            title="Limitation of Liability"
            body="To the fullest extent permitted by law, LIMIT LABS 8 will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or loss of profits, revenues, data, or goodwill arising out of or related to your use of the Service."
          />

          <Section
            title="Indemnification"
            body="You agree to defend, indemnify, and hold harmless LIMIT LABS 8 and its affiliates from claims, liabilities, damages, and expenses arising out of your use of the Service, your Content, or your violation of these Terms or applicable law."
          />

          <Section
            title="Governing Law"
            body="These Terms are governed by the laws of the United States and applicable state law, without regard to conflict of law principles, unless otherwise required by applicable consumer protection law."
          />

          <Section
            title="Changes to These Terms"
            body="We may update these Terms from time to time. Continued use of the Service after updates become effective constitutes acceptance of the revised Terms."
          />

          <Section
            title="Contact"
            body={
              <>
                If you have any questions regarding these Terms of Service, contact us at <EmailLink />.
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
