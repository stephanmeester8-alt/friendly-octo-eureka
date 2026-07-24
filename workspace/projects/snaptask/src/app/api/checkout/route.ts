import { NextResponse } from "next/server";
import { demoTopUp } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { CREDIT_PACK_CENTS, CREDIT_PACK_LABEL } from "@/lib/wallet";
import { isDemoMode } from "@/lib/utils";

function appOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/**
 * Creates a Stripe Checkout Session for the €5 platform-credit pack.
 * Metadata.profile_id is required for the webhook balance credit.
 */
export async function POST() {
  // Demo / no Stripe: simulate immediate €5 credit purchase
  if (isDemoMode() || !isStripeConfigured()) {
    try {
      const profile = demoTopUp(CREDIT_PACK_CENTS);
      return NextResponse.json({
        demo: true,
        profile,
        message: `Demo: +${CREDIT_PACK_LABEL} added to wallet.`,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Demo top-up failed" },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const origin = appOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: CREDIT_PACK_CENTS,
          product_data: {
            name: "SnapTask platform credits",
            description:
              "500 platform credits (€5,00). Credits are platform balance, not e-money or a bank deposit.",
          },
        },
      },
    ],
    metadata: {
      profile_id: user.id,
      credit_cents: String(CREDIT_PACK_CENTS),
      product: "platform_credits",
    },
    success_url: `${origin}/dashboard?topup=success`,
    cancel_url: `${origin}/dashboard?topup=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    demo: false,
    url: session.url,
    sessionId: session.id,
  });
}
