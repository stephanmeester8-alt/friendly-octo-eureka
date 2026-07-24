import Link from "next/link";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import { getDemoProfile } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";

async function loadBalance(): Promise<number> {
  if (isDemoMode()) {
    return getDemoProfile().balance;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single();

  return Number(data?.balance ?? 0);
}

export default async function NewTaskPage() {
  const balance = await loadBalance();

  return (
    <div className="snap-mesh min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          Post a task
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Attach a file, set a micro-budget, and publish to the marketplace.
        </p>

        <div className="mt-8 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-elevated)] p-5 sm:p-6">
          <TaskCreateForm walletBalance={balance} />
        </div>
      </div>
    </div>
  );
}
