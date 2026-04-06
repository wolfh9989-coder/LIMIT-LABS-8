"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientId } from "@/lib/client-id";

const userStorageKey = "limitlabs8.user_id";

export function AccountTrackingBanner() {
  const [accountCode, setAccountCode] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const fallbackUserId = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const existing = localStorage.getItem(userStorageKey);
    if (existing) {
      return existing;
    }

    const created = createClientId();
    localStorage.setItem(userStorageKey, created);
    return created;
  }, []);

  useEffect(() => {
    if (!fallbackUserId) {
      return;
    }

    let active = true;

    void fetch(`/api/account-code?userId=${encodeURIComponent(fallbackUserId)}`)
      .then((response) => response.json())
      .then((payload: { accountCode?: string; isOwner?: boolean }) => {
        if (!active) {
          return;
        }

        setAccountCode(payload.accountCode ?? "");
        setIsOwner(Boolean(payload.isOwner));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setAccountCode("");
      });

    return () => {
      active = false;
    };
  }, [fallbackUserId]);

  if (!accountCode) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[70] border-b border-pink-300/20 bg-black/92 px-3 py-1.5 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 text-[11px] sm:text-xs">
        <p className="text-white/70">
          Account ID:
          {" "}
          <span className="font-semibold tracking-[0.08em] text-pink-100">{accountCode}</span>
        </p>
        {isOwner ? (
          <span className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-100 sm:text-[11px]">
            Owner Access
          </span>
        ) : null}
      </div>
    </div>
  );
}
