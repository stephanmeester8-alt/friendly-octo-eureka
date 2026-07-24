import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorParam = params.error;

  return (
    <section className="snap-mesh relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="snap-grid absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-5 py-16 sm:px-8">
        {errorParam && errorParam !== "demo_mode" && (
          <p className="mb-6 max-w-md text-sm font-medium text-[var(--coral)]">
            Login mislukt: {decodeURIComponent(errorParam)}
          </p>
        )}
        <Suspense fallback={<div className="h-48 max-w-md animate-pulse rounded-2xl bg-[var(--ink)]/5" />}>
          <AuthForm />
        </Suspense>
        <p className="mt-10 text-sm text-[var(--ink-muted)]">
          <Link
            href="/"
            className="font-medium text-[var(--ink)] underline-offset-4 hover:underline"
          >
            ← Terug naar home
          </Link>
        </p>
      </div>
    </section>
  );
}
