"use client";

import { useState } from "react";
import { WalletTopUp } from "@/components/wallet/wallet-topup";
import { MarketplaceFeed } from "@/components/tasks/marketplace-feed";
import type { Profile, Task } from "@/types/database";

export function DashboardClient({
  initialProfile,
  initialTasks,
}: {
  initialProfile: Profile;
  initialTasks: Task[];
}) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      <WalletTopUp balance={profile.balance} onUpdated={setProfile} />
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--ink)]">
            Your active tasks
          </h2>
          <span className="text-sm text-[var(--ink-muted)]">
            {initialTasks.length} open
          </span>
        </div>
        <MarketplaceFeed
          tasks={initialTasks}
          showClaim={false}
          emptyLabel="You have no active tasks. Post one to get started."
        />
      </section>
    </div>
  );
}
