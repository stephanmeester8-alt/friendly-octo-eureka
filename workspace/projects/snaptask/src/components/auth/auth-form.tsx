"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AuthForm({
  redirectTo,
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = redirectTo ?? searchParams.get("next") ?? "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);

    if (isDemoMode()) {
      setError(
        "Demo mode is on. Set real Supabase keys in .env.local and NEXT_PUBLIC_DEMO_MODE=false, then enable Google under Authentication → Providers.",
      );
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Google login failed. Check Supabase Auth settings.";
      setError(message);
      setLoading(false);
    }
  }

  function continueDemo() {
    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
        Welkom bij Snap<span className="text-[var(--coral)]">Task</span>
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[var(--ink-muted)]">
        Log in om direct micro-taken te plaatsen of als maker op te pakken. Eén
        klik — je wallet staat klaar via de signup-trigger.
      </p>

      <div className="mt-8 space-y-3">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <GoogleIcon />
          {loading ? "Laden…" : "Snel inloggen met Google"}
        </Button>

        {isDemoMode() && (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={continueDemo}
          >
            Doorgaan in demo mode
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm font-medium text-[var(--coral)]" role="alert">
          {error}
        </p>
      )}

      <p className="mt-6 text-xs leading-relaxed text-[var(--ink-muted)]">
        Door in te loggen ga je akkoord met micro-transacties via je SnapTask
        wallet. Geen maandabonnement.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.455 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
