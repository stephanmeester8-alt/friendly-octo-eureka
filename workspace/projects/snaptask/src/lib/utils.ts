import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert euro amount (UI) → integer cents (DB). */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Convert integer cents (DB) → euro amount (UI). */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/** Format cents as EUR currency string. */
export function formatEurFromCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(centsToEuros(cents));
}

/** @deprecated Prefer formatEurFromCents — kept for gradual migration. */
export function formatEur(euros: number): string {
  return formatEurFromCents(eurosToCents(euros));
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      !url.includes("[JOUW_PROJECT_ID]") &&
      !key.includes("your-anon-key") &&
      !key.includes("[JOUW_ANON_KEY]"),
  );
}

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  return !isSupabaseConfigured();
}
