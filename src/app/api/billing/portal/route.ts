import { NextResponse } from "next/server";
import { resolveAppUrl } from "@/lib/deployment";
import { resolveProtectedIdentity } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string };
    const identity = await resolveProtectedIdentity(request, body.userId?.trim() ?? "");
    if (!identity?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = identity.userId;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is required for billing portal" }, { status: 400 });
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    const customerId = data?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "No billing customer found" }, { status: 404 });
    }

    const appUrl = resolveAppUrl(request);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: appUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 });
  }
}
