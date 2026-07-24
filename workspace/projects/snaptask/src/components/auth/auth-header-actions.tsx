"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/utils";

type SessionUser = {
  email?: string;
  name?: string;
};

export function AuthHeaderActions() {
  const router = useRouter();
  const demo = isDemoMode();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(demo);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (demo) return;

    let mounted = true;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      setUser(
        u
          ? {
              email: u.email,
              name:
                (u.user_metadata?.full_name as string | undefined) ??
                (u.user_metadata?.name as string | undefined),
            }
          : null,
      );
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(
        u
          ? {
              email: u.email,
              name:
                (u.user_metadata?.full_name as string | undefined) ??
                (u.user_metadata?.name as string | undefined),
            }
          : null,
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [demo]);

  function signOut() {
    startTransition(async () => {
      if (!demo) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      setUser(null);
      router.push("/");
      router.refresh();
    });
  }

  if (!ready) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-xl bg-[var(--ink)]/8" />
    );
  }

  if (demo) {
    return (
      <>
        <span className="hidden rounded-md bg-[var(--ink)]/6 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] sm:inline">
          Demo mode
        </span>
        <Link
          href="/login"
          className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition-opacity hover:opacity-90"
        >
          Inloggen
        </Link>
      </>
    );
  }

  if (user) {
    return (
      <>
        <span className="hidden max-w-[10rem] truncate text-sm text-[var(--ink-muted)] sm:inline">
          {user.name ?? user.email}
        </span>
        <Link
          href="/dashboard"
          className="rounded-xl bg-[var(--snap)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="rounded-xl border border-[var(--ink)]/15 px-3 py-2 text-sm font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)]/40 hover:text-[var(--ink)] disabled:opacity-50"
        >
          {pending ? "…" : "Uitloggen"}
        </button>
      </>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition-opacity hover:opacity-90"
    >
      Inloggen
    </Link>
  );
}
