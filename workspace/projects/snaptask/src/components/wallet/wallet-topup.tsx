"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/utils";
import type { Profile } from "@/types/database";

const PRESETS = [1, 5, 10, 25];

export function WalletTopUp({
  balance,
  onUpdated,
}: {
  balance: number;
  onUpdated?: (profile: Profile) => void;
}) {
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Top-up failed");
        return;
      }
      setMessage(`Added ${formatEur(amount)} to your wallet.`);
      onUpdated?.(data.profile);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-elevated)] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Wallet
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
            {formatEur(balance)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-[var(--ink)]">
          Top up (min €1.00)
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                amount === preset
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                  : "border-[var(--ink)]/15 text-[var(--ink-muted)] hover:border-[var(--ink)]/40"
              }`}
            >
              {formatEur(preset)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-muted)]">
              €
            </span>
            <input
              type="number"
              min={1}
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-[var(--paper)] pl-7 pr-3 text-sm outline-none ring-[var(--snap)] focus:ring-2"
            />
          </div>
          <Button onClick={submit} disabled={pending || amount < 1}>
            {pending ? "Adding…" : "Add funds"}
          </Button>
        </div>
        {message && (
          <p className="mt-3 text-sm font-medium text-[var(--ink)]">{message}</p>
        )}
        {error && (
          <p className="mt-3 text-sm font-medium text-[var(--coral)]">{error}</p>
        )}
      </div>
    </div>
  );
}
