import type { PlanType, SubscriptionLifecycle, SubscriptionStatus } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const RENEWAL_WARNING_DAYS = 10;
export const GRACE_PERIOD_DAYS = 3;
export const HOLD_PERIOD_DAYS = 30;
export const PRO_BILLING_DAYS = 31;

export type LifecycleInput = {
  plan: PlanType;
  status: SubscriptionStatus;
  renewalDate?: string | null;
  gracePeriodEndsAt?: string | null;
  deleteAt?: string | null;
  updatedAt?: string | null;
  now?: Date;
};

export function deriveSubscriptionLifecycle(input: LifecycleInput): SubscriptionLifecycle {
  const now = input.now ?? new Date();
  const renewalDate = parseDate(input.renewalDate) ?? inferRenewalDate(input.updatedAt, input.plan);
  const warningStartsAt = renewalDate ? new Date(renewalDate.getTime() - RENEWAL_WARNING_DAYS * DAY_MS) : null;
  const gracePeriodEndsAt = parseDate(input.gracePeriodEndsAt) ?? (input.status === "past_due" && renewalDate ? new Date(renewalDate.getTime() + GRACE_PERIOD_DAYS * DAY_MS) : null);
  const deleteAt = parseDate(input.deleteAt) ?? (gracePeriodEndsAt ? new Date(gracePeriodEndsAt.getTime() + HOLD_PERIOD_DAYS * DAY_MS) : null);
  const holdEndsAt = deleteAt;

  if (input.plan !== "pro") {
    return buildLifecycle({
      phase: "inactive",
      renewalDate,
      warningStartsAt,
      gracePeriodEndsAt,
      holdEndsAt,
      deleteAt,
      canExport: false,
      notice: null,
      accountDeletionDue: false,
      now,
    });
  }

  if (deleteAt && now >= deleteAt) {
    return buildLifecycle({
      phase: "on_hold",
      renewalDate,
      warningStartsAt,
      gracePeriodEndsAt,
      holdEndsAt,
      deleteAt,
      canExport: false,
      notice: "Payment was not recovered during the 30-day hold. The account is scheduled for deletion now.",
      accountDeletionDue: true,
      now,
    });
  }

  if (input.status === "past_due") {
    if (gracePeriodEndsAt && now < gracePeriodEndsAt) {
      return buildLifecycle({
        phase: "grace_period",
        renewalDate,
        warningStartsAt,
        gracePeriodEndsAt,
        holdEndsAt,
        deleteAt,
        canExport: true,
        notice: "3 day grace period. Payment recovery is still being attempted.",
        accountDeletionDue: false,
        now,
      });
    }

    return buildLifecycle({
      phase: "on_hold",
      renewalDate,
      warningStartsAt,
      gracePeriodEndsAt,
      holdEndsAt,
      deleteAt,
      canExport: false,
      notice: "Subscription is on hold. Export stays blocked until payment is made. If payment is not made by the 30-day mark, the account is deleted.",
      accountDeletionDue: false,
      now,
    });
  }

  if (warningStartsAt && renewalDate && now >= warningStartsAt && now < renewalDate) {
    return buildLifecycle({
      phase: "renewal_countdown",
      renewalDate,
      warningStartsAt,
      gracePeriodEndsAt,
      holdEndsAt,
      deleteAt,
      canExport: true,
      notice: "Renewal countdown has started. Billing renews day by day until the renewal date is reached.",
      accountDeletionDue: false,
      now,
    });
  }

  return buildLifecycle({
    phase: input.status === "inactive" ? "inactive" : "active",
    renewalDate,
    warningStartsAt,
    gracePeriodEndsAt,
    holdEndsAt,
    deleteAt,
    canExport: input.status !== "inactive",
    notice: input.status === "inactive" ? "Subscription is inactive." : null,
    accountDeletionDue: false,
    now,
  });
}

function buildLifecycle({
  phase,
  renewalDate,
  warningStartsAt,
  gracePeriodEndsAt,
  holdEndsAt,
  deleteAt,
  canExport,
  notice,
  accountDeletionDue,
  now,
}: {
  phase: SubscriptionLifecycle["phase"];
  renewalDate: Date | null;
  warningStartsAt: Date | null;
  gracePeriodEndsAt: Date | null;
  holdEndsAt: Date | null;
  deleteAt: Date | null;
  canExport: boolean;
  notice: string | null;
  accountDeletionDue: boolean;
  now: Date;
}): SubscriptionLifecycle {
  return {
    phase,
    renewalDate: toIso(renewalDate),
    warningStartsAt: toIso(warningStartsAt),
    gracePeriodEndsAt: toIso(gracePeriodEndsAt),
    holdEndsAt: toIso(holdEndsAt),
    deleteAt: toIso(deleteAt),
    daysUntilRenewal: renewalDate ? remainingDays(now, renewalDate) : null,
    daysLeftInGrace: gracePeriodEndsAt && phase === "grace_period" ? remainingDays(now, gracePeriodEndsAt) : null,
    daysLeftOnHold: holdEndsAt && phase === "on_hold" ? remainingDays(now, holdEndsAt) : null,
    canExport,
    notice,
    accountDeletionDue,
  };
}

function inferRenewalDate(updatedAt: string | null | undefined, plan: PlanType) {
  if (plan !== "pro") {
    return null;
  }

  const base = parseDate(updatedAt) ?? new Date();
  return new Date(base.getTime() + PRO_BILLING_DAYS * DAY_MS);
}

function remainingDays(now: Date, target: Date) {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}