import { NextResponse } from "next/server";
import { getOrCreateAccountCode, isOwnerIdentity } from "@/lib/account-code";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getMemoryBillingProfile, getMemorySubscription, setMemoryBillingProfile, setMemorySubscription } from "@/lib/memory-store";
import { resolveAppUrl } from "@/lib/deployment";
import { PRO_BILLING_DAYS } from "@/lib/subscription-lifecycle";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { BillingProfile } from "@/lib/types";

const PRO_PRICE_CENTS = 500;
const PRO_INTERVAL_DAYS = 31;
const PRO_PRODUCT_NAME = "LIMIT LABS 8 Pro";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; profile?: BillingProfile };
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");
    if (!identity?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = identity.userId;
    const profile = body.profile;
    const owner = isOwnerIdentity({ userId, email: identity.email ?? profile?.email ?? null });

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl = resolveAppUrl(request);

    if (!stripe) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
      }

      // Local fallback: instantly switch to Pro when Stripe is not configured.
      setMemorySubscription(userId, { plan: "pro", status: "active", renewalDate: addDays(PRO_BILLING_DAYS), updatedAt: new Date().toISOString() });
      return NextResponse.json({ url: `${appUrl}?billing=demo-pro` });
    }

    const supabase = getSupabaseAdmin();

    await getOrCreateAccountCode({ userId, email: identity.email ?? profile?.email ?? null });

    if (owner) {
      if (supabase) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan: "pro",
          status: "active",
          renewal_date: addDays(PRO_BILLING_DAYS),
          is_owner: true,
          updated_at: new Date().toISOString(),
        });
      } else {
        const memory = getMemorySubscription(userId);
        setMemorySubscription(userId, {
          ...memory,
          plan: "pro",
          status: "active",
          renewalDate: addDays(PRO_BILLING_DAYS),
          isOwner: true,
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({ url: `${appUrl}/pro?billing=owner-pro` });
    }

    let customerId = "";
    if (supabase) {
      const { data } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      customerId = data?.stripe_customer_id ?? "";
    } else {
      customerId = getMemorySubscription(userId).stripeCustomerId ?? "";
    }

    const persistedProfile = profile ?? getMemoryBillingProfile(userId) ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: persistedProfile?.email || identity.email || undefined,
        name: persistedProfile?.fullName || undefined,
        phone: persistedProfile?.phone || undefined,
        address: persistedProfile
          ? {
              line1: persistedProfile.addressLine1 || undefined,
              line2: persistedProfile.addressLine2 || undefined,
              city: persistedProfile.city || undefined,
              state: persistedProfile.state || undefined,
              postal_code: persistedProfile.postalCode || undefined,
              country: persistedProfile.country || undefined,
            }
          : undefined,
        metadata: {
          userId,
          dateOfBirth: persistedProfile?.dateOfBirth || "",
        },
      });
      customerId = customer.id;

      if (supabase) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan: "free",
          status: "inactive",
          stripe_customer_id: customerId,
        });
      } else {
        const memory = getMemorySubscription(userId);
        setMemorySubscription(userId, { ...memory, stripeCustomerId: customerId });
      }
    } else if (persistedProfile) {
      await stripe.customers.update(customerId, {
        email: persistedProfile.email || undefined,
        name: persistedProfile.fullName || undefined,
        phone: persistedProfile.phone || undefined,
        address: {
          line1: persistedProfile.addressLine1 || undefined,
          line2: persistedProfile.addressLine2 || undefined,
          city: persistedProfile.city || undefined,
          state: persistedProfile.state || undefined,
          postal_code: persistedProfile.postalCode || undefined,
          country: persistedProfile.country || undefined,
        },
        metadata: {
          userId,
          dateOfBirth: persistedProfile.dateOfBirth || "",
        },
      });
    }

    if (persistedProfile) {
      if (supabase) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan: "free",
          status: "inactive",
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
      } else {
        setMemoryBillingProfile(userId, persistedProfile);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      phone_number_collection: {
        enabled: true,
      },
      saved_payment_method_options: {
        payment_method_save: "enabled",
      },
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: PRO_PRODUCT_NAME,
                },
                unit_amount: PRO_PRICE_CENTS,
                recurring: {
                  interval: "day",
                  interval_count: PRO_INTERVAL_DAYS,
                },
              },
              quantity: 1,
            },
          ],
      success_url: `${appUrl}/pro?billing=success`,
      cancel_url: `${appUrl}/pro?billing=cancel`,
      metadata: {
        userId,
        planPriceCents: String(PRO_PRICE_CENTS),
        renewalDays: String(PRO_INTERVAL_DAYS),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
  }
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
