import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (stripe) {
    return stripe;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    return null;
  }

  stripe = new Stripe(apiKey, {
    apiVersion: "2025-03-31.basil",
  });

  return stripe;
}
