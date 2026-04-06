"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const categoryOptions = [
  "Something is broken, confusing, or frustrating",
  "I have an idea or something I really like",
  "I have an issue with my account or billing",
  "I want to apply to be an early tester for limit labs 8",
] as const;

const ratingOptions = [
  "Very Dissatisfied",
  "Dissatisfied",
  "Satisfied",
  "Very Satisfied",
] as const;

export default function FeedbackPage() {
  const [category, setCategory] = useState<string>(categoryOptions[0]);
  const [rating, setRating] = useState<string>("");
  const [improvements, setImprovements] = useState("");
  const [loved, setLoved] = useState("");
  const [interestingUse, setInterestingUse] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => rating.trim().length > 0 && feedback.trim().length > 0, [rating, feedback]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-[430px] space-y-4 sm:max-w-3xl sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-pink-100 sm:text-2xl">Share Your Feedback</h1>
          <Link href="/pro" className="rounded-full border border-pink-300/25 px-3 py-1.5 text-xs text-pink-200/90 hover:border-pink-200/45 hover:text-pink-100">Back</Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/80">
          <p className="text-base text-white/90">We love hearing from our users!</p>
          <p className="mt-2">
            As a reminder, this is for feedback only. For support requests (e.g. urgent issues with your account or credits), please email
            {" "}
            <a href="mailto:limitlabs8@gmail.com" className="text-pink-200 underline decoration-pink-300/70 underline-offset-4 hover:text-pink-100 hover:[text-shadow:0_0_12px_rgba(244,114,182,0.72)]">limitlabs8@gmail.com</a>
          </p>
        </section>

        <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/84">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-pink-100">What best describes your feedback?</legend>
            {categoryOptions.map((option) => (
              <label key={option} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <input
                  type="radio"
                  name="category"
                  value={option}
                  checked={category === option}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-1"
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-pink-100">How would you rate your overall experience with limit labs 8? *</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ratingOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <input
                    type="radio"
                    name="rating"
                    value={option}
                    checked={rating === option}
                    onChange={(event) => setRating(event.target.value)}
                    required
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/56">Consider sharing:</p>

            <label className="block space-y-1">
              <span className="text-white/88">What would you like to see improved or added?</span>
              <textarea
                value={improvements}
                onChange={(event) => setImprovements(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/88 outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-white/88">What did you love about your experience?</span>
              <textarea
                value={loved}
                onChange={(event) => setLoved(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/88 outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-white/88">What&apos;s the most interesting thing you&apos;ve used LIMIT LABS 8 for or seen others do?</span>
              <textarea
                value={interestingUse}
                onChange={(event) => setInterestingUse(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/88 outline-none"
              />
            </label>
          </section>

          <label className="block space-y-1">
            <span className="font-semibold text-pink-100">Your Feedback *</span>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={5}
              required
              className="w-full rounded-xl border border-pink-300/25 bg-black/35 p-3 text-sm text-white/92 outline-none"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/55">Category: <span className="text-pink-200">{category}</span></p>
            <button
              type="submit"
              disabled={!canSubmit || submitted}
              className="rounded-full border border-pink-300/35 bg-pink-500/12 px-4 py-2 text-sm font-medium text-pink-100 transition disabled:opacity-45"
            >
              {submitted ? "Feedback Submitted" : "Submit Feedback"}
            </button>
          </div>

          {submitted ? (
            <p className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Thanks for sharing feedback. We review submissions to improve LIMIT LABS 8.
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
