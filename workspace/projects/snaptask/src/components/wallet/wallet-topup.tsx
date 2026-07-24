"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/lib/utils";
import { CREDIT_PACK_CENTS, CREDIT_PACK_LABEL } from "@/lib/wallet";
import type { Profile } from "@/types/database";

export function WalletTopUp({
  balance,
  onUpdated,
  topupStatus,
}: {
  /** Balance in cents / credits */
  balance: number;
  onUpdated?: (profile: Profile) => void;
  topupStatus?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(() => {
    if (topupStatus === "success") {
      return "Betaling ontvangen. Je credits worden bijgeschreven (webhook). Ververs zo nodig.";
    }
    if (topupStatus === "cancelled") {
      return "Checkout geannuleerd — er zijn geen credits afgeschreven.";
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buyCredits() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout mislukt");
        return;
      }
      if (data.demo) {
        setMessage(data.message ?? `+${CREDIT_PACK_LABEL}`);
        onUpdated?.(data.profile);
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setError("Geen Stripe Checkout URL ontvangen");
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-elevated)] p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Platform credits
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          {formatEurFromCents(balance)}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {balance} credits · geen e-money, wel besteedbaar op SnapTask
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <Button
          onClick={buyCredits}
          disabled={pending}
          size="lg"
          className="w-full"
        >
          {pending
            ? "Bezig…"
            : `Wallet opwaarderen (${formatEurFromCents(CREDIT_PACK_CENTS)})`}
        </Button>
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
          Je koopt {CREDIT_PACK_LABEL}. Betaling gaat via Stripe naar de
          platformrekening; je saldo is een geëmuleerde credit-balans (PSD3-proof
          model), geen gestald fiatgeld.
        </p>
      </div>

      {message && (
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm font-medium text-[var(--coral)]">{error}</p>
      )}
    </div>
  );
}
