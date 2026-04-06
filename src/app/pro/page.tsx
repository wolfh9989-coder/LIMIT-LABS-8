"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CreditCard, ShieldAlert } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { createClientId } from "@/lib/client-id";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { BillingProfile, BillingSummary, Entitlement } from "@/lib/types";

const userStorageKey = "limitlabs8.user_id";
const billingProfileKey = "limitlabs8.billing_profile";
const proPriceLabel = "$5.00";
const proBillingCadence = "every 31 days";

const defaultProfile: BillingProfile = {
  email: "",
  phone: "",
  dateOfBirth: "",
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

type AuthUser = { id: string; email: string | null };

const defaultLifecycle = deriveSubscriptionLifecycle({ plan: "free", status: "inactive" });
const defaultEntitlement: Entitlement = { userId: "", plan: "free", status: "inactive", canExport: false, lifecycle: defaultLifecycle };
const defaultBillingSummary: BillingSummary = { email: null, customerId: null, invoices: [], lifecycle: defaultLifecycle };

export default function ProPage() {
  const [localUserId] = useState(() => {
    if (typeof window === "undefined") return "";
    const existing = localStorage.getItem(userStorageKey);
    if (existing) return existing;
    const created = createClientId();
    localStorage.setItem(userStorageKey, created);
    return created;
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [entitlement, setEntitlement] = useState<Entitlement>(defaultEntitlement);
  const [billingSummary, setBillingSummary] = useState<BillingSummary>(defaultBillingSummary);
  const [accountCode, setAccountCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [profile, setProfile] = useState<BillingProfile>(defaultProfile);
  const [isBilling, setIsBilling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(billingProfileKey);
    if (saved) {
      try {
        setProfile({ ...defaultProfile, ...(JSON.parse(saved) as BillingProfile) });
      } catch {
        localStorage.removeItem(billingProfileKey);
      }
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? null } : null);
      setSessionToken(data.session?.access_token ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
      setSessionToken(session?.access_token ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeUserId = authUser?.id ?? localUserId;

  useEffect(() => {
    if (!activeUserId) return;
    void refreshEntitlement(activeUserId, sessionToken, setEntitlement);
    void refreshBillingSummary(activeUserId, sessionToken, setBillingSummary);
    void refreshAccountCode(activeUserId, sessionToken, setAccountCode);
  }, [activeUserId, sessionToken]);

  const isPro = entitlement.plan === "pro";
  const rememberedIdentity = useMemo(() => profile.email || billingSummary.email || authUser?.email || activeUserId, [profile.email, billingSummary.email, authUser?.email, activeUserId]);
  const lifecycle = billingSummary.lifecycle.phase !== "inactive" ? billingSummary.lifecycle : entitlement.lifecycle;
  const lifecycleMilestones = [
    { label: "Countdown Starts", value: lifecycle.warningStartsAt, accent: "text-cyan-200" },
    { label: "Renewal Date", value: lifecycle.renewalDate, accent: "text-white" },
    { label: "Grace Ends", value: lifecycle.gracePeriodEndsAt, accent: "text-amber-200" },
    { label: "Account Delete", value: lifecycle.deleteAt, accent: "text-rose-200" },
  ].filter((item) => item.value);

  function updateProfile<K extends keyof BillingProfile>(key: K, value: BillingProfile[K]) {
    setProfile((current) => {
      const next = { ...current, [key]: value };
      if (typeof window !== "undefined") {
        localStorage.setItem(billingProfileKey, JSON.stringify(next));
      }
      return next;
    });
  }

  async function handleCheckout() {
    if (!activeUserId) return;
    if (!profile.email || !profile.phone || !profile.dateOfBirth || !profile.fullName || !profile.addressLine1 || !profile.city || !profile.state || !profile.postalCode || !profile.country) {
      setError("Complete all required Pro signup fields before payment.");
      return;
    }

    setIsBilling(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({ userId: activeUserId, profile }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start checkout.");
      }

      window.location.href = payload.url;
    } catch {
      setError("Unable to start secure payment.");
      setIsBilling(false);
    }
  }

  async function handleManageBilling() {
    if (!activeUserId) return;
    setIsBilling(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({ userId: activeUserId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open portal.");
      }
      window.location.href = payload.url;
    } catch {
      setError("Unable to open subscription portal.");
      setIsBilling(false);
    }
  }

  async function handleDeleteAccount() {
    if (!activeUserId) return;
    setIsDeleting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: buildHeaders(sessionToken),
        body: JSON.stringify({ userId: activeUserId, confirm: true }),
      });
      if (!response.ok) {
        throw new Error();
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(billingProfileKey);
        localStorage.removeItem(userStorageKey);
      }
      setMessage("Your account, billing link, and saved creations have been deleted. No refund will be issued.");
      setShowDeleteConfirm(false);
    } catch {
      setError("Unable to delete account.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#02030a] px-4 py-5 text-white">
      <div className="mx-auto max-w-sm space-y-4 pb-24">
        <header className="rounded-[28px] border border-cyan-400/12 bg-black/35 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">Pro</p>
              <h1 className="mt-2 text-2xl font-semibold">Subscription & Billing</h1>
              <p className="mt-2 text-sm text-white/58">No password or manual sign-in flow here. This device remembers the account after Pro signup.</p>
            </div>
            <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
              <ChevronLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </header>

        <section className="rounded-[30px] border border-fuchsia-400/12 bg-[linear-gradient(145deg,rgba(15,6,20,0.95),rgba(7,3,12,0.98))] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pro Signup</h2>
            <span className="text-xs text-fuchsia-200/80">{isPro ? "active" : proBillingCadence}</span>
          </div>
          <div className="mb-4 rounded-[20px] border border-white/10 bg-white/5 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-fuchsia-200/72">Plan Price</p>
            <p className="mt-2 text-2xl font-semibold text-white">{proPriceLabel}</p>
            <p className="mt-1 text-xs text-white/58">Recurring {proBillingCadence}. Auto-renews unless you unsubscribe and delete the account.</p>
          </div>
          <p className="mb-4 text-sm leading-6 text-white/62">
            Enter your billing identity here. Card details are collected on the secure payment page after you continue. Billing renews automatically at {proPriceLabel} {proBillingCadence} unless you unsubscribe.
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Input label="Full Name" value={profile.fullName} onChange={(value) => updateProfile("fullName", value)} className="col-span-2" />
            <Input label="Email" value={profile.email} onChange={(value) => updateProfile("email", value)} className="col-span-2" />
            <Input label="Phone" value={profile.phone} onChange={(value) => updateProfile("phone", value)} className="col-span-2" />
            <Input label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={(value) => updateProfile("dateOfBirth", value)} className="col-span-2" />
            <Input label="Billing Address 1" value={profile.addressLine1} onChange={(value) => updateProfile("addressLine1", value)} className="col-span-2" />
            <Input label="Billing Address 2" value={profile.addressLine2} onChange={(value) => updateProfile("addressLine2", value)} className="col-span-2" />
            <Input label="City" value={profile.city} onChange={(value) => updateProfile("city", value)} />
            <Input label="State" value={profile.state} onChange={(value) => updateProfile("state", value)} />
            <Input label="Postal Code" value={profile.postalCode} onChange={(value) => updateProfile("postalCode", value)} />
            <Input label="Country" value={profile.country} onChange={(value) => updateProfile("country", value)} />
          </div>

          {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
          {message ? <p className="mt-3 text-xs text-cyan-200">{message}</p> : null}

          <button onClick={handleCheckout} disabled={isBilling} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(90deg,#ffffff,#dbeafe)] px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">
            <CreditCard className="h-4 w-4" />
            {isBilling ? "Opening Secure Payment..." : isPro ? `Update Payment Method (${proPriceLabel})` : `Continue to Secure Payment (${proPriceLabel})`}
          </button>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Account Memory</h2>
            <span className="text-xs text-cyan-300/75">device remembered</span>
          </div>
          <p className="text-sm text-white/68">Current remembered account: {rememberedIdentity}</p>
          <p className="mt-2 text-xs leading-5 text-white/50">No sign out or password flow is exposed here. The app keeps using the remembered account on this device.</p>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Subscription Controls</h2>
            <span className="text-xs text-cyan-300/75">auto-renew on</span>
          </div>
          <p className="text-sm leading-6 text-white/64">Your Pro plan renews at {proPriceLabel} {proBillingCadence} unless you unsubscribe. After you cancel, account data and creations are deleted if you confirm the destructive action below. No refunds are issued.</p>
          <div className="mt-3 space-y-2 rounded-[20px] border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/75">Renewal State</p>
            <p className="text-sm text-white/82">{describeLifecycle(lifecycle)}</p>
            {lifecycle.notice ? <p className="text-xs leading-5 text-white/62">{lifecycle.notice}</p> : null}
            {lifecycle.renewalDate ? <p className="text-xs text-white/52">Renewal date: {new Date(lifecycle.renewalDate).toLocaleDateString()}</p> : null}
            {lifecycle.phase === "renewal_countdown" && lifecycle.daysUntilRenewal !== null ? <p className="text-xs text-amber-200">{lifecycle.daysUntilRenewal} day countdown until renewal.</p> : null}
            {lifecycle.phase === "grace_period" && lifecycle.daysLeftInGrace !== null ? <p className="text-xs text-amber-200">3 day grace period: {lifecycle.daysLeftInGrace} day{lifecycle.daysLeftInGrace === 1 ? "" : "s"} left.</p> : null}
            {lifecycle.phase === "on_hold" && lifecycle.daysLeftOnHold !== null ? <p className="text-xs text-rose-200">Subscription on hold: {lifecycle.daysLeftOnHold} day{lifecycle.daysLeftOnHold === 1 ? "" : "s"} until account deletion if payment is not made.</p> : null}
            {!entitlement.canExport && lifecycle.phase === "on_hold" ? <p className="text-xs text-rose-300">Export videos are blocked while the subscription is on hold.</p> : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={handleManageBilling} disabled={!isPro || isBilling} className="rounded-[18px] border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-sm font-medium text-cyan-100 disabled:opacity-50">Manage Subscription</button>
            <button onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className="rounded-[18px] border border-rose-300/20 bg-rose-500/10 px-3 py-2.5 text-sm font-medium text-rose-100 disabled:opacity-50">Unsubscribe & Delete</button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Lifecycle Timeline</h2>
            <span className="text-xs text-cyan-300/75">billing path</span>
          </div>
          {lifecycleMilestones.length === 0 ? (
            <p className="text-sm text-white/56">Start Pro billing to populate renewal, grace, and deletion milestones.</p>
          ) : (
            <div className="space-y-3">
              {lifecycleMilestones.map((milestone, index) => {
                const isCurrent =
                  (milestone.label === "Countdown Starts" && lifecycle.phase === "renewal_countdown") ||
                  (milestone.label === "Renewal Date" && (lifecycle.phase === "active" || lifecycle.phase === "renewal_countdown" || lifecycle.phase === "grace_period" || lifecycle.phase === "on_hold")) ||
                  (milestone.label === "Grace Ends" && lifecycle.phase === "grace_period") ||
                  (milestone.label === "Account Delete" && lifecycle.phase === "on_hold");

                return (
                  <div key={milestone.label} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${isCurrent ? "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.55)]" : "bg-white/25"}`} />
                      {index < lifecycleMilestones.length - 1 ? <div className="mt-1 h-10 w-px bg-white/10" /> : null}
                    </div>
                    <div className="pb-2">
                      <p className={`text-sm font-medium ${milestone.accent}`}>{milestone.label}</p>
                      <p className="mt-1 text-xs text-white/55">{formatLifecycleDate(milestone.value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Billing Summary</h2>
            <span className="text-xs text-cyan-300/75">stripe linked</span>
          </div>
          <div className="mb-3 flex items-center justify-between gap-2 rounded-[14px] border border-pink-300/20 bg-pink-500/10 px-3 py-2">
            <p className="text-xs text-white/80">
              Account ID:
              {" "}
              <span className="font-semibold tracking-[0.08em] text-pink-100">{accountCode || "Generating..."}</span>
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!accountCode) return;
                try {
                  await navigator.clipboard.writeText(accountCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 1300);
                } catch {
                  setCopiedCode(false);
                }
              }}
              className="rounded-full border border-pink-300/30 bg-black/30 px-2.5 py-1 text-[11px] text-pink-100"
            >
              {copiedCode ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-white/70">Customer: {billingSummary.email ?? profile.email ?? "Not created yet"}</p>
          <div className="mt-3 space-y-2">
            {billingSummary.invoices.length === 0 ? (
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 text-sm text-white/56">No invoices yet.</div>
            ) : (
              billingSummary.invoices.map((invoice) => (
                <a key={invoice.id} href={invoice.hostedInvoiceUrl ?? "#"} target="_blank" rel="noreferrer" className="block rounded-[18px] border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-medium text-white">${(invoice.amountPaid / 100).toFixed(2)} {invoice.currency.toUpperCase()}</p>
                  <p className="mt-1 text-xs text-white/52">{invoice.status} • {new Date(invoice.createdAt).toLocaleDateString()}</p>
                </a>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Support & Info</h2>
            <span className="text-xs text-cyan-300/75">resources</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Help", href: "/help" },
              { label: "Feedback", href: "/feedback" },
              { label: "What's New", href: "/whats-new" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-pink-200/90 underline-offset-4 transition-all duration-300 hover:text-pink-100 hover:[text-shadow:0_0_12px_rgba(244,114,182,0.72)] hover:underline"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>

        {showDeleteConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm rounded-3xl border border-rose-300/20 bg-[#12070d] p-4 shadow-[0_0_40px_rgba(244,63,94,0.18)]">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-300" />
                <div>
                  <h3 className="text-base font-semibold text-white">Delete account and creations?</h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">If you continue, your subscription is canceled, your saved account data and creations are deleted, and no payment is refunded.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80">Keep Account</button>
                <button onClick={handleDeleteAccount} disabled={isDeleting} className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3 py-2.5 text-sm font-medium text-rose-100 disabled:opacity-50">{isDeleting ? "Deleting..." : "Delete Forever"}</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <MobileNav />
    </div>
  );
}

function Input({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs text-white/55">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
    </label>
  );
}

async function refreshEntitlement(userId: string, token: string, setEntitlement: (value: Entitlement) => void) {
  const response = await fetch(`/api/entitlement?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) return;
  setEntitlement((await response.json()) as Entitlement);
}

async function refreshBillingSummary(userId: string, token: string, setBillingSummary: (value: BillingSummary) => void) {
  const response = await fetch(`/api/billing/summary?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) return;
  setBillingSummary((await response.json()) as BillingSummary);
}

async function refreshAccountCode(userId: string, token: string, setAccountCode: (value: string) => void) {
  const response = await fetch(`/api/account-code?userId=${encodeURIComponent(userId)}`, { headers: buildHeaders(token) });
  if (!response.ok) return;
  const payload = (await response.json()) as { accountCode?: string };
  setAccountCode(payload.accountCode ?? "");
}

function buildHeaders(token: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatLifecycleDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString();
}

function describeLifecycle(lifecycle: BillingSummary["lifecycle"]) {
  if (lifecycle.phase === "renewal_countdown") {
    return `Renewal countdown is live. ${lifecycle.daysUntilRenewal ?? 0} day${lifecycle.daysUntilRenewal === 1 ? "" : "s"} remain before auto-renew.`;
  }

  if (lifecycle.phase === "grace_period") {
    return "Renewal date was reached and the subscription is now in the 3 day grace period.";
  }

  if (lifecycle.phase === "on_hold") {
    return "Payment still has not cleared. The subscription is on hold for 30 days unless payment is made.";
  }

  if (lifecycle.phase === "active") {
    return "Subscription is active and auto-renew is enabled.";
  }

  return "Subscription is inactive until billing is started.";
}
