import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. It uses the service role key and therefore
 * bypasses storage RLS — never import this from a client component.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
