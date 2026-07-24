import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { CREDIT_PACK_CENTS, creditsFromCents } from "@/lib/wallet";

export const runtime = "nodejs";

/**
 * Stripe webhook — credit emulated wallet on checkout.session.completed.
 * Uses Supabase service role (never anon) and idempotent credit_purchases rows.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret || webhookSecret.includes("...")) {
    return NextResponse.json(
      { error: "Webhook secret or signature missing" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await creditFromCheckoutSession(session);
    } catch (err) {
      console.error("[stripe webhook]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Credit failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function creditFromCheckoutSession(session: Stripe.Checkout.Session) {
  const profileId = session.metadata?.profile_id;
  const creditCents = Number(
    session.metadata?.credit_cents ?? CREDIT_PACK_CENTS,
  );

  if (!profileId) {
    throw new Error("checkout.session.completed missing metadata.profile_id");
  }
  if (!Number.isFinite(creditCents) || creditCents <= 0) {
    throw new Error("Invalid credit_cents in session metadata");
  }

  // Prefer paid amount when present; fallback to pack size
  const amountCents =
    typeof session.amount_total === "number" && session.amount_total > 0
      ? session.amount_total
      : creditCents;

  const credits = creditsFromCents(creditCents);
  const admin = createAdminClient();

  // Idempotency: unique stripe_session_id — duplicate delivery is a no-op
  const { error: insertError } = await admin.from("credit_purchases").insert({
    profile_id: profileId,
    stripe_session_id: session.id,
    amount_cents: amountCents,
    credits,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      // already processed
      return;
    }
    throw new Error(insertError.message);
  }

  const { data: profile, error: fetchError } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", profileId)
    .single();

  if (fetchError || !profile) {
    throw new Error(fetchError?.message ?? "Profile not found for credit");
  }

  const nextBalance = Number(profile.balance) + credits;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ balance: nextBalance })
    .eq("id", profileId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}
