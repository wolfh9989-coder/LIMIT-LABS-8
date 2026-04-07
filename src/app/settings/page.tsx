"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, LogOut, Save } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const userStorageKey = "limitlabs8.user_id";
const rememberedEmailKey = "limitlabs8.remembered_email";

type AuthUser = {
  id: string;
  email: string | null;
};

export default function SettingsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [fallbackUser, setFallbackUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resolvedUser = authUser ?? fallbackUser;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fallbackId = window.localStorage.getItem(userStorageKey) ?? "";
    const fallbackEmail = window.localStorage.getItem(rememberedEmailKey) ?? "";
    if (fallbackId || fallbackEmail) {
      setFallbackUser({ id: fallbackId || "local-account", email: fallbackEmail || null });
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      const nextUser = data.session?.user
        ? { id: data.session.user.id, email: data.session.user.email ?? null }
        : null;
      setAuthUser(nextUser);
      setSessionToken(data.session?.access_token ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      setAuthUser(nextUser);
      setSessionToken(session?.access_token ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!resolvedUser?.id) {
      setAccountCode("");
      return;
    }

    let active = true;
    void fetchAccountCode(resolvedUser.id, sessionToken).then((code) => {
      if (!active) {
        return;
      }
      setAccountCode(code);
    });

    return () => {
      active = false;
    };
  }, [resolvedUser?.id, sessionToken]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth client is not configured.");
      return;
    }

    if (!authUser) {
      setError("You must be signed in to update settings.");
      return;
    }

    const trimmedEmail = newEmail.trim().toLowerCase();
    const currentEmail = (authUser.email ?? fallbackUser?.email ?? "").trim().toLowerCase();

    if (!trimmedEmail && !newPassword) {
      setError("Enter a new email or a new password to save changes.");
      return;
    }

    if (trimmedEmail && trimmedEmail === currentEmail) {
      setError("New email must be different from the current email.");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and re-enter password must match.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const payload: { email?: string; password?: string } = {};
      if (trimmedEmail && trimmedEmail !== currentEmail) {
        payload.email = trimmedEmail;
      }
      if (newPassword) {
        payload.password = newPassword;
      }

      if (!payload.email && !payload.password) {
        setMessage("No changes to save.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser(payload);
      if (updateError) {
        throw updateError;
      }

      setMessage(payload.email ? "Settings updated. Check your email if confirmation is required." : "Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught) {
      const nextError = caught instanceof Error ? caught.message : "Unable to update settings.";
      setError(nextError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();

    setIsLoggingOut(true);
    setMessage("");
    setError("");

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Continue cleanup and redirect even if sign out fails.
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(userStorageKey);
      }
      await fetch("/api/auth-gate/session", { method: "DELETE" });
    } catch {
      // Continue redirect even if cookie cleanup fails.
    } finally {
      window.location.href = "/auth-access";
    }
  }

  return (
    <div className="min-h-screen bg-[#02030a] px-4 py-5 text-white">
      <div className="mx-auto max-w-sm space-y-4 pb-24">
        <header className="rounded-[28px] border border-cyan-400/12 bg-black/35 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">Settings</p>
              <h1 className="mt-2 text-2xl font-semibold">Account & Login</h1>
              <p className="mt-2 text-sm text-white/58">Update your login email or password anytime.</p>
            </div>
            <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
              <ChevronLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">Current Account</p>
          <div className="mt-3 space-y-3">
            <label className="block text-xs uppercase tracking-[0.18em] text-cyan-200">
              Current Email
              <input
                type="text"
                value={resolvedUser?.email ?? "Not signed in"}
                readOnly
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white/80 outline-none"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.18em] text-cyan-200">
              Account ID
              <input
                type="text"
                value={accountCode || "LAB code unavailable"}
                readOnly
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white/80 outline-none"
              />
            </label>
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-3 rounded-[28px] border border-cyan-400/12 bg-black/35 p-4 backdrop-blur-xl">
          <label className="block text-xs uppercase tracking-[0.18em] text-cyan-200">
            New Email
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none ring-cyan-300/30 transition focus:ring"
              autoComplete="email"
              placeholder="Enter a different email"
            />
          </label>

          <label className="block text-xs uppercase tracking-[0.18em] text-cyan-200">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none ring-cyan-300/30 transition focus:ring"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
            />
          </label>

          <label className="block text-xs uppercase tracking-[0.18em] text-cyan-200">
            Re-Enter Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none ring-cyan-300/30 transition focus:ring"
              autoComplete="new-password"
              placeholder="Re-enter new password for confirmation"
            />
          </label>

          {error ? <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          {message ? <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
      <MobileNav />
    </div>
  );
}

async function fetchAccountCode(userId: string, accessToken: string) {
  try {
    const response = await fetch(`/api/account-code?userId=${encodeURIComponent(userId)}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as { accountCode?: string };
    const code = payload.accountCode?.trim() ?? "";
    return code.startsWith("LAB") ? code : "";
  } catch {
    return "";
  }
}
