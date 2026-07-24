import { NextResponse } from "next/server";
import { demoTopUp } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { eurosToCents, isDemoMode } from "@/lib/utils";
import type { Profile } from "@/types/database";

export async function POST(request: Request) {
  const body = await request.json();

  // Prefer amountCents; accept amount in euros for the existing UI
  let amountCents: number;
  if (body.amountCents != null) {
    amountCents = Math.round(Number(body.amountCents));
  } else {
    amountCents = eurosToCents(Number(body.amount));
  }

  if (Number.isNaN(amountCents) || amountCents < 100) {
    return NextResponse.json(
      { error: "Minimum top-up is €1.00" },
      { status: 400 },
    );
  }

  if (isDemoMode()) {
    try {
      const profile = demoTopUp(amountCents);
      return NextResponse.json({ profile, message: "Demo top-up successful" });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Top-up failed" },
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

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const current = profile as Pick<Profile, "balance">;
  const nextBalance = Number(current.balance) + amountCents;

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ balance: nextBalance })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: updated as Profile,
    message: "Wallet topped up (simulated — connect Stripe later)",
  });
}
