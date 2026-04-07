"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Clapperboard, Cpu, Library, Settings, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Entitlement } from "@/lib/types";

const userStorageKey = "limitlabs8.user_id";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavStatus = {
  label: string;
  className: string;
  dotClass: string;
  neonLabel?: boolean;
};

type AuthUser = {
  id: string;
  email: string | null;
};

const items: NavItem[] = [
  { label: "Home", href: "/", icon: Cpu },
  { label: "Create", href: "/create", icon: Sparkles },
  { label: "Projects", href: "/projects", icon: Library },
  { label: "Studio", href: "/studio", icon: Clapperboard },
  { label: "Pro", href: "/pro", icon: Zap },
  { label: "Settings", href: "/settings", icon: Settings },
];

const proNavDisabled = true;

const defaultEntitlement: Entitlement = {
  userId: "",
  plan: "free",
  status: "inactive",
  canExport: false,
  lifecycle: deriveSubscriptionLifecycle({ plan: "free", status: "inactive" }),
};

export function MobileNav() {
  const pathname = usePathname();
  const [localUserId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(userStorageKey) ?? "";
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [entitlement, setEntitlement] = useState<Entitlement>(defaultEntitlement);

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
    if (!activeUserId) {
      return;
    }

    void refreshEntitlement(activeUserId, sessionToken, setEntitlement);
  }, [activeUserId, sessionToken]);

  const navStatus = useMemo(() => describeLifecycle(entitlement), [entitlement]);

  return (
    <nav className="ll8-footer-neon fixed bottom-0 left-1/2 z-40 w-full max-w-sm -translate-x-1/2 border-t border-cyan-400/10 px-3 py-3 backdrop-blur-2xl">
      <div className="ll8-footer-neon__orb-layer" aria-hidden="true">
        <span className="ll8-footer-neon__orb ll8-footer-neon__orb--a" />
        <span className="ll8-footer-neon__orb ll8-footer-neon__orb--b" />
        <span className="ll8-footer-neon__orb ll8-footer-neon__orb--c" />
        <span className="ll8-footer-neon__orb ll8-footer-neon__orb--d" />
      </div>
      <div className="mb-2 flex justify-center">
        {proNavDisabled ? (
          <div
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/40"
          >
            <span className="h-2 w-2 rounded-full bg-white/25" />
            <span>Pro Locked</span>
          </div>
        ) : (
          <Link
            href="/pro"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${navStatus.className}`}
          >
            <span className={`h-2 w-2 rounded-full ${navStatus.dotClass}`} />
            <span
              className={navStatus.neonLabel ? "bg-[linear-gradient(90deg,#22d3ee,#8b5cf6,#d946ef)] bg-clip-text font-semibold text-transparent [text-shadow:0_0_10px_rgba(34,211,238,0.22)]" : undefined}
            >
              {navStatus.label}
            </span>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-6 gap-2 text-center text-[11px]">
        {items.map((item) => {
          const Icon = item.icon;
          const isDisabled = proNavDisabled && item.label === "Pro";
          const active = pathname === item.href;
          if (isDisabled) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                className="cursor-not-allowed rounded-[18px] bg-white/5 px-2 py-2 text-white/28"
              >
                <Icon className="mx-auto h-4 w-4" />
                <div className="mt-1">{item.label}</div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[18px] px-2 py-2 ${
                active
                  ? "bg-[linear-gradient(90deg,rgba(217,70,239,0.22),rgba(34,211,238,0.16))] text-white shadow-[0_0_22px_rgba(34,211,238,0.14)] ring-1 ring-cyan-400/12"
                  : "bg-white/5 text-white/55"
              }`}
            >
              <Icon className="mx-auto h-4 w-4" />
              <div className="mt-1">{item.label}</div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

async function refreshEntitlement(userId: string, token: string, setEntitlement: (value: Entitlement) => void) {
  const response = await fetch(`/api/entitlement?userId=${encodeURIComponent(userId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    return;
  }

  setEntitlement((await response.json()) as Entitlement);
}

function describeLifecycle(entitlement: Entitlement): NavStatus {
  const phase = entitlement.lifecycle.phase;

  if (phase === "renewal_countdown") {
    return {
      label: `Countdown ${entitlement.lifecycle.daysUntilRenewal ?? 0}d`,
      className: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
      dotClass: "bg-cyan-300",
    };
  }

  if (phase === "grace_period") {
    return {
      label: `Grace ${entitlement.lifecycle.daysLeftInGrace ?? 0}d`,
      className: "border-amber-300/20 bg-amber-400/10 text-amber-100",
      dotClass: "bg-amber-300",
    };
  }

  if (phase === "on_hold") {
    return {
      label: `Hold ${entitlement.lifecycle.daysLeftOnHold ?? 0}d`,
      className: "border-rose-300/20 bg-rose-500/10 text-rose-100",
      dotClass: "bg-rose-300",
    };
  }

  if (phase === "active") {
    return {
      label: "Billing Active",
      className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
      dotClass: "bg-emerald-300",
    };
  }

  return {
    label: "Billing Inactive",
    className: "border-white/10 bg-white/5 text-white/60",
    dotClass: "bg-white/35",
    neonLabel: true,
  };
}
