import type { Entitlement } from "@/lib/types";
import { deleteUserAccount } from "@/lib/account-cleanup";
import { getMemorySubscription } from "@/lib/memory-store";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const fallback: Entitlement = {
    userId,
    plan: "free",
    status: "inactive",
    canExport: false,
    lifecycle: deriveSubscriptionLifecycle({ plan: "free", status: "inactive" }),
  };

  if (!userId) {
    return fallback;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const local = getMemorySubscription(userId);
    const status = normalizeStatus(local.status ?? "inactive");
    const plan = local.plan === "pro" ? "pro" : "free";
    const lifecycle = deriveSubscriptionLifecycle({
      plan,
      status,
      renewalDate: local.renewalDate ?? null,
      gracePeriodEndsAt: local.gracePeriodEndsAt ?? null,
      deleteAt: local.deleteAt ?? null,
      updatedAt: local.updatedAt ?? null,
    });

    return {
      userId,
      plan,
      status,
      canExport: lifecycle.canExport,
      lifecycle,
    };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status,renewal_date,grace_period_ends_at,delete_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const lifecycle = deriveSubscriptionLifecycle({
    plan: data.plan === "pro" ? "pro" : "free",
    status: normalizeStatus(data.status),
    renewalDate: data.renewal_date,
    gracePeriodEndsAt: data.grace_period_ends_at,
    deleteAt: data.delete_at,
    updatedAt: data.updated_at,
  });

  if (lifecycle.accountDeletionDue) {
    await deleteUserAccount(userId);
    return fallback;
  }

  return {
    userId,
    plan: data.plan === "pro" ? "pro" : "free",
    status: normalizeStatus(data.status),
    canExport: lifecycle.canExport,
    lifecycle,
  };
}

function normalizeStatus(value: string | null): Entitlement["status"] {
  if (value === "active" || value === "trialing" || value === "past_due") {
    return value;
  }

  return "inactive";
}
