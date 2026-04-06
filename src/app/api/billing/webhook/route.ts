import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { GRACE_PERIOD_DAYS, HOLD_PERIOD_DAYS, PRO_BILLING_DAYS } from "@/lib/subscription-lifecycle";
import { registerIdempotencyKey } from "@/lib/idempotency";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { setMemorySubscription } from "@/lib/memory-store";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    logWarn("billing.webhook.skipped", { reason: "stripe_not_configured" });
    return NextResponse.json({ received: true });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    logWarn("billing.webhook.missing_signature");
    return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    logWarn("billing.webhook.invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!registerIdempotencyKey(`stripe:${event.id}`, 24 * 60 * 60 * 1000)) {
    logInfo("billing.webhook.duplicate", { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  logInfo("billing.webhook.received", { eventId: event.id, eventType: event.type });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
    const customerId = typeof session.customer === "string" ? session.customer : "";
    const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;

    if (userId) {
      await upsertSubscription({
        userId,
        plan: "pro",
        status: "active",
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        renewalDate: resolveStripeRenewalDate(subscription),
        gracePeriodEndsAt: null,
        deleteAt: null,
      });
      logInfo("billing.webhook.checkout_completed", { userId, eventId: event.id });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : "";

    if (customerId) {
      await syncByCustomerId(customerId, subscription);
      logInfo("billing.webhook.subscription_synced", { customerId, eventId: event.id });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
    if (customerId) {
      await markPaymentFailure(customerId);
      logWarn("billing.webhook.payment_failed", { customerId, eventId: event.id });
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
    if (customerId) {
      await clearPaymentFailure(customerId, invoice);
      logInfo("billing.webhook.payment_cleared", { customerId, eventId: event.id });
    }
  }

  return NextResponse.json({ received: true });
}

async function syncByCustomerId(customerId: string, subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdmin();
  const status = normalizeStripeStatus(subscription.status);
  const plan = status === "active" || status === "trialing" || status === "past_due" ? "pro" : "free";

  if (!supabase) {
    logWarn("billing.webhook.sync_skipped", { reason: "supabase_not_configured", customerId });
    return;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const userId = data?.user_id;
  if (!userId) {
    logWarn("billing.webhook.sync_missing_user", { customerId });
    return;
  }

  await upsertSubscription({
    userId,
    plan,
    status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    renewalDate: resolveStripeRenewalDate(subscription),
    gracePeriodEndsAt: status === "past_due" ? addDays(GRACE_PERIOD_DAYS) : null,
    deleteAt: status === "past_due" ? addDays(GRACE_PERIOD_DAYS + HOLD_PERIOD_DAYS) : null,
  });
}

async function markPaymentFailure(customerId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    logWarn("billing.webhook.payment_failed_skipped", { reason: "supabase_not_configured", customerId });
    return;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("user_id,stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!data?.user_id) {
    logWarn("billing.webhook.payment_failed_missing_user", { customerId });
    return;
  }

  await upsertSubscription({
    userId: data.user_id,
    plan: "pro",
    status: "past_due",
    stripeCustomerId: customerId,
    stripeSubscriptionId: data.stripe_subscription_id ?? "",
    gracePeriodEndsAt: addDays(GRACE_PERIOD_DAYS),
    deleteAt: addDays(GRACE_PERIOD_DAYS + HOLD_PERIOD_DAYS),
  });
}

async function clearPaymentFailure(customerId: string, invoice: Stripe.Invoice) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    logWarn("billing.webhook.payment_clear_skipped", { reason: "supabase_not_configured", customerId });
    return;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("user_id,stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!data?.user_id) {
    logWarn("billing.webhook.payment_clear_missing_user", { customerId });
    return;
  }

  const linePeriodEnd = invoice.lines.data[0]?.period?.end;
  await upsertSubscription({
    userId: data.user_id,
    plan: "pro",
    status: "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: data.stripe_subscription_id ?? "",
    renewalDate: linePeriodEnd ? new Date(linePeriodEnd * 1000).toISOString() : addDays(PRO_BILLING_DAYS),
    gracePeriodEndsAt: null,
    deleteAt: null,
  });
}

async function upsertSubscription({
  userId,
  plan,
  status,
  stripeCustomerId,
  stripeSubscriptionId,
  renewalDate,
  gracePeriodEndsAt,
  deleteAt,
}: {
  userId: string;
  plan: "free" | "pro";
  status: "inactive" | "active" | "trialing" | "past_due";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  renewalDate?: string | null;
  gracePeriodEndsAt?: string | null;
  deleteAt?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan,
      status,
      stripe_customer_id: stripeCustomerId || null,
      stripe_subscription_id: stripeSubscriptionId || null,
      renewal_date: renewalDate ?? null,
      grace_period_ends_at: gracePeriodEndsAt ?? null,
      delete_at: deleteAt ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      logError("billing.webhook.subscription_upsert_failed", { userId, code: error.code, message: error.message });
      return;
    }

    logInfo("billing.webhook.subscription_upserted", { userId, plan, status });
    return;
  }

  setMemorySubscription(userId, {
    plan,
    status,
    stripeCustomerId: stripeCustomerId || undefined,
    stripeSubscriptionId: stripeSubscriptionId || undefined,
    renewalDate: renewalDate ?? undefined,
    gracePeriodEndsAt: gracePeriodEndsAt ?? undefined,
    deleteAt: deleteAt ?? undefined,
    updatedAt: new Date().toISOString(),
  });
}

function normalizeStripeStatus(value: string): "inactive" | "active" | "trialing" | "past_due" {
  if (value === "active") {
    return "active";
  }

  if (value === "trialing") {
    return "trialing";
  }

  if (value === "past_due") {
    return "past_due";
  }

  return "inactive";
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function resolveStripeRenewalDate(subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription> | null) {
  const maybePeriodEnd = Number((subscription as { current_period_end?: number } | null)?.current_period_end ?? 0);
  return maybePeriodEnd > 0 ? new Date(maybePeriodEnd * 1000).toISOString() : addDays(PRO_BILLING_DAYS);
}
