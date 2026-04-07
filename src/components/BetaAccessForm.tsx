"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type BetaAccessFormProps = {
  nextTarget: string;
};

export function BetaAccessForm({ nextTarget }: BetaAccessFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, next: nextTarget }),
      });

      const payload = (await response.json()) as { error?: string; next?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to unlock beta access.");
        setIsSubmitting(false);
        return;
      }

      router.replace(payload.next ?? nextTarget);
      router.refresh();
    } catch {
      setError("Unable to verify the beta access code right now.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-[11px] uppercase tracking-[0.28em] bg-[linear-gradient(90deg,#8be9ff_0%,#7dd3fc_38%,#d8b4fe_72%,#f4f8ff_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-[ll8TitleSweep_4.4s_linear_infinite]">
          Beta Access Code
        </span>
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="current-password"
          placeholder="Enter access code"
          className="w-full rounded-2xl border border-white/12 bg-white/4 px-5 py-4 text-base tracking-[0.18em] text-white outline-none transition focus:border-cyan-300/55 focus:bg-cyan-400/5 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_22px_rgba(34,211,238,0.12)]"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-rose-400/22 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl border border-cyan-300/35 bg-[linear-gradient(90deg,rgba(34,211,238,0.22),rgba(59,130,246,0.22),rgba(217,70,239,0.22))] px-5 py-4 text-sm font-semibold uppercase tracking-[0.26em] text-white shadow-[0_0_24px_rgba(34,211,238,0.18)] transition hover:shadow-[0_0_36px_rgba(34,211,238,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Verifying" : "Enter Beta"}
      </button>
    </form>
  );
}