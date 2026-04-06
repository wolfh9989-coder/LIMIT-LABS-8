import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";

describe("deriveSubscriptionLifecycle", () => {
  it("returns inactive phase for free plan", () => {
    const lifecycle = deriveSubscriptionLifecycle({
      plan: "free",
      status: "inactive",
      now: new Date("2026-04-05T00:00:00.000Z"),
    });

    expect(lifecycle.phase).toBe("inactive");
    expect(lifecycle.canExport).toBe(false);
  });

  it("enters renewal countdown for active pro near renewal", () => {
    const lifecycle = deriveSubscriptionLifecycle({
      plan: "pro",
      status: "active",
      renewalDate: "2026-04-10T00:00:00.000Z",
      now: new Date("2026-04-05T00:00:00.000Z"),
    });

    expect(lifecycle.phase).toBe("renewal_countdown");
    expect(lifecycle.canExport).toBe(true);
    expect(lifecycle.daysUntilRenewal).toBe(5);
  });

  it("enters grace period for past_due before grace end", () => {
    const lifecycle = deriveSubscriptionLifecycle({
      plan: "pro",
      status: "past_due",
      renewalDate: "2026-04-05T00:00:00.000Z",
      gracePeriodEndsAt: "2026-04-08T00:00:00.000Z",
      now: new Date("2026-04-06T00:00:00.000Z"),
    });

    expect(lifecycle.phase).toBe("grace_period");
    expect(lifecycle.canExport).toBe(true);
    expect(lifecycle.daysLeftInGrace).toBe(2);
  });

  it("flags account deletion due after hold ends", () => {
    const lifecycle = deriveSubscriptionLifecycle({
      plan: "pro",
      status: "past_due",
      deleteAt: "2026-04-01T00:00:00.000Z",
      now: new Date("2026-04-05T00:00:00.000Z"),
    });

    expect(lifecycle.phase).toBe("on_hold");
    expect(lifecycle.accountDeletionDue).toBe(true);
    expect(lifecycle.canExport).toBe(false);
  });
});
