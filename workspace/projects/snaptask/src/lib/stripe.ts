import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_SECRET_KEY.startsWith("sk_") &&
      !process.env.STRIPE_SECRET_KEY.includes("..."),
  );
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.",
    );
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
}
