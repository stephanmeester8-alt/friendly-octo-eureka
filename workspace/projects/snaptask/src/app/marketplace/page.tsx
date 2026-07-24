import Link from "next/link";
import { MarketplaceFeed } from "@/components/tasks/marketplace-feed";
import { getDemoOpenTasks } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import type { Task } from "@/types/database";

async function loadOpenTasks(): Promise<Task[]> {
  if (isDemoMode()) {
    return getDemoOpenTasks();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (data ?? []) as Task[];
}

export default async function MarketplacePage() {
  const tasks = await loadOpenTasks();

  return (
    <div className="snap-mesh min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Marketplace
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              Open tasks
            </h1>
            <p className="mt-2 max-w-md text-sm text-[var(--ink-muted)]">
              Claim a micro-job, deliver, get paid from the escrowed budget.
            </p>
          </div>
          <Link
            href="/tasks/new"
            className="text-sm font-semibold text-[var(--ink)] underline-offset-4 hover:underline"
          >
            Post instead →
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-elevated)] px-5 py-2 sm:px-6">
          <MarketplaceFeed tasks={tasks} showClaim />
        </div>
      </div>
    </div>
  );
}
