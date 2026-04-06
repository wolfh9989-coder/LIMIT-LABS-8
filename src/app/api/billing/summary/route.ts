import { NextResponse } from "next/server";
import { deleteUserAccount } from "@/lib/account-cleanup";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getMemorySubscription } from "@/lib/memory-store";
import { deriveSubscriptionLifecycle } from "@/lib/subscription-lifecycle";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { BillingSummary, InvoiceSummary } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallbackUserId = searchParams.get("userId")?.trim() ?? "";
  const identity = await resolveProtectedIdentity(request, fallbackUserId);

  if (!identity?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const stripe = getStripe();
  const supabase = getSupabaseAdmin();

  let customerId: string | null = null;
  let email: string | null = identity.email;
  let lifecycle = deriveSubscriptionLifecycle({ plan: "free", status: "inactive" });

  if (supabase) {
    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id,plan,status,renewal_date,grace_period_ends_at,delete_at,updated_at")
      .eq("user_id", identity.userId)
      .maybeSingle();
    customerId = data?.stripe_customer_id ?? null;
    lifecycle = deriveSubscriptionLifecycle({
      plan: data?.plan === "pro" ? "pro" : "free",
      status: data?.status === "active" || data?.status === "trialing" || data?.status === "past_due" ? data.status : "inactive",
      renewalDate: data?.renewal_date,
      gracePeriodEndsAt: data?.grace_period_ends_at,
      deleteAt: data?.delete_at,
      updatedAt: data?.updated_at,
    });
  } else {
    const memory = getMemorySubscription(identity.userId);
    customerId = memory.stripeCustomerId ?? null;
    lifecycle = deriveSubscriptionLifecycle({
      plan: memory.plan,
      status: memory.status,
      renewalDate: memory.renewalDate,
      gracePeriodEndsAt: memory.gracePeriodEndsAt,
      deleteAt: memory.deleteAt,
      updatedAt: memory.updatedAt,
    });
  }

  if (lifecycle.accountDeletionDue) {
    await deleteUserAccount(identity.userId);
    return NextResponse.json({ email, customerId, invoices: [], lifecycle: deriveSubscriptionLifecycle({ plan: "free", status: "inactive" }) satisfies BillingSummary["lifecycle"] });
  }

  if (!stripe || !customerId) {
    const fallback: BillingSummary = {
      email,
      customerId,
      invoices: [],
      lifecycle,
    };
    return NextResponse.json(fallback);
  }

  const customer = await stripe.customers.retrieve(customerId);
  if (!email && !customer.deleted) {
    email = customer.email;
  }

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 8,
  });

  const summary: BillingSummary = {
    email,
    customerId,
    invoices: invoices.data.map<InvoiceSummary>((invoice) => ({
      id: invoice.id,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status ?? "unknown",
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      createdAt: new Date(invoice.created * 1000).toISOString(),
    })),
    lifecycle,
  };

  return NextResponse.json(summary);
}
