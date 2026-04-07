"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientId } from "@/lib/client-id";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const userStorageKey = "limitlabs8.user_id";
const rememberedEmailKey = "limitlabs8.remembered_email";
const localAccountsKey = "limitlabs8.local_auth_accounts";
const accountCodeStorageKey = "limitlabs8.account_code";

type AuthAccessClientProps = {
  nextTarget: string;
};

type LocalAccount = {
  userId: string;
  email: string;
  password: string;
};

type LocalAccountMap = Record<string, LocalAccount>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readLocalAccounts(): LocalAccountMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(localAccountsKey);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as LocalAccountMap;
  } catch {
    return {};
  }
}

function writeLocalAccounts(map: LocalAccountMap) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(localAccountsKey, JSON.stringify(map));
}

export function AuthAccessClient({ nextTarget }: AuthAccessClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(rememberedEmailKey) ?? "";
  });
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [accountCode, setAccountCode] = useState("");

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  async function createSession(userId: string) {
    await fetch("/api/auth-gate/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, remember: keepLoggedIn }),
    });
  }

  async function fetchAccountCode(userId: string, accessToken = "") {
    const response = await fetch(`/api/account-code?userId=${encodeURIComponent(userId)}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as { accountCode?: string };
    return payload.accountCode ?? "";
  }

  async function handleLoginOrSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setAccountCode("");

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    window.localStorage.setItem(rememberedEmailKey, normalizedEmail);

    try {
      let userId = "";
      let accessToken = "";

      if (supabase) {
        if (mode === "signup") {
          const signup = await supabase.auth.signUp({ email: normalizedEmail, password });
          if (signup.error) {
            throw new Error(signup.error.message);
          }

          userId = signup.data.user?.id ?? "";
          accessToken = signup.data.session?.access_token ?? "";

          if (!userId) {
            throw new Error("Signup created no user. Check email confirmation settings.");
          }
        } else {
          const login = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
          if (login.error) {
            throw new Error(login.error.message);
          }

          userId = login.data.user?.id ?? "";
          accessToken = login.data.session?.access_token ?? "";

          if (!userId) {
            throw new Error("Unable to login user.");
          }
        }
      } else {
        const accounts = readLocalAccounts();
        const existing = accounts[normalizedEmail];

        if (mode === "signup") {
          if (existing) {
            throw new Error("An account already exists for this email.");
          }

          const nextUserId = createClientId();
          accounts[normalizedEmail] = { userId: nextUserId, email: normalizedEmail, password };
          writeLocalAccounts(accounts);
          userId = nextUserId;
        } else {
          if (!existing || existing.password !== password) {
            throw new Error("Invalid email or password.");
          }
          userId = existing.userId;
        }
      }

      if (!userId) {
        throw new Error("No user id available for session.");
      }

      window.localStorage.setItem(userStorageKey, userId);
      await createSession(userId);
      const code = await fetchAccountCode(userId, accessToken);
      setAccountCode(code);
      if (code && code.startsWith("LAB")) {
        window.localStorage.setItem(accountCodeStorageKey, code);
      }

      window.setTimeout(() => {
        router.replace(nextTarget);
        router.refresh();
      }, 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 text-[11px] uppercase tracking-[0.24em]">
        {([
          ["login", "Login"],
          ["signup", "Sign Up"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-xl px-3 py-2 transition ${mode === value ? "bg-cyan-400/20 text-cyan-100" : "text-white/55 hover:bg-white/8"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleLoginOrSignup} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.28em] bg-[linear-gradient(90deg,#8be9ff_0%,#7dd3fc_38%,#d8b4fe_72%,#f4f8ff_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-[ll8TitleSweep_4.4s_linear_infinite]">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/12 bg-white/4 px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/55 focus:bg-cyan-400/5 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_22px_rgba(34,211,238,0.12)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.28em] bg-[linear-gradient(90deg,#8be9ff_0%,#7dd3fc_38%,#d8b4fe_72%,#f4f8ff_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-[ll8TitleSweep_4.4s_linear_infinite]">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Enter password"
            className="w-full rounded-2xl border border-white/12 bg-white/4 px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/55 focus:bg-cyan-400/5 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_22px_rgba(34,211,238,0.12)]"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-white/72">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(event) => setKeepLoggedIn(event.target.checked)}
            className="h-4 w-4 rounded border border-white/20 bg-white/5"
          />
          Keep me logged in on this device
        </label>

        {error ? (
          <p className="rounded-2xl border border-rose-400/22 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        ) : null}

        {accountCode ? (
          <p className="rounded-2xl border border-cyan-300/22 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            Account Created: <span className="font-semibold tracking-[0.18em]">{accountCode}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl border border-cyan-300/35 bg-[linear-gradient(90deg,rgba(34,211,238,0.22),rgba(59,130,246,0.22),rgba(217,70,239,0.22))] px-5 py-4 text-sm font-semibold uppercase tracking-[0.26em] text-white shadow-[0_0_24px_rgba(34,211,238,0.18)] transition hover:shadow-[0_0_36px_rgba(34,211,238,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Processing" : mode === "signup" ? "Sign Up" : "Login"}
        </button>
      </form>
    </div>
  );
}
