import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/utils";

/**
 * Service-role client for trusted server jobs (Stripe webhooks).
 * Never import this into client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isSupabaseConfigured() || !key || key.includes("[JOUW")) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url!, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
