import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import {
  getDemoActiveTasksForUser,
  getDemoProfile,
} from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import type { Profile, Task } from "@/types/database";

async function loadDashboard(): Promise<{
  profile: Profile;
  tasks: Task[];
}> {
  if (isDemoMode()) {
    return {
      profile: getDemoProfile(),
      tasks: getDemoActiveTasksForUser(),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      profile: {
        id: "guest",
        username: "guest",
        avatar_url: null,
        balance: 0,
        created_at: new Date().toISOString(),
      },
      tasks: [],
    };
  }

  const [{ data: profile }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("tasks")
      .select("*")
      .eq("client_id", user.id)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false }),
  ]);

  return {
    profile: profile as Profile,
    tasks: (tasks ?? []) as Task[],
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string }>;
}) {
  const [{ profile, tasks }, params] = await Promise.all([
    loadDashboard(),
    searchParams,
  ]);

  return (
    <div className="snap-mesh min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Dashboard
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              Wallet & tasks
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              Signed in as {profile.username ?? "maker"}
            </p>
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex h-11 items-center rounded-xl bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--ink-soft)]"
          >
            New task
          </Link>
        </div>

        <DashboardClient
          initialProfile={profile}
          initialTasks={tasks}
          topupStatus={params.topup ?? null}
        />
      </div>
    </div>
  );
}
