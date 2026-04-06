import { rm } from "node:fs/promises";
import path from "node:path";
import { deleteMemoryUser, getMemorySubscription } from "@/lib/memory-store";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function deleteUserAccount(userId: string) {
  const supabase = getSupabaseAdmin();
  const stripe = getStripe();

  let stripeSubscriptionId = "";
  let stripeCustomerId = "";

  if (supabase) {
    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    stripeSubscriptionId = data?.stripe_subscription_id ?? "";
    stripeCustomerId = data?.stripe_customer_id ?? "";
  } else {
    const memory = getMemorySubscription(userId);
    stripeSubscriptionId = memory.stripeSubscriptionId ?? "";
    stripeCustomerId = memory.stripeCustomerId ?? "";
  }

  if (stripe && stripeSubscriptionId) {
    await stripe.subscriptions.cancel(stripeSubscriptionId).catch(() => undefined);
  }

  if (supabase) {
    await supabase.from("export_jobs").delete().eq("user_id", userId);
    await supabase.from("media_assets").delete().eq("user_id", userId);
    await supabase.from("projects").delete().eq("user_id", userId);
    await supabase.from("subscriptions").delete().eq("user_id", userId);
  } else {
    deleteMemoryUser(userId);
  }

  await rm(path.join(process.cwd(), "public", "uploads", userId), {
    recursive: true,
    force: true,
  }).catch(() => undefined);

  if (stripe && stripeCustomerId) {
    await stripe.customers.del(stripeCustomerId).catch(() => undefined);
  }
}